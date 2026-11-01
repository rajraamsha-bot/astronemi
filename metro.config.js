/**
 * Metro Configuration for React Native / Expo
 *
 * IMPORTANT: This config MUST extend Expo's default Metro config via
 * getDefaultConfig(). Building a config object from scratch drops the
 * Expo-specific transformer (babelTransformerPath, asset registry,
 * expo-router support, web resolution, etc.) and breaks bundling —
 * especially `expo export --platform web`.
 *
 * Notes on a previous regression (fixed):
 *  - `transformer.getAssetRequestPath` was set to a function. Metro sends
 *    the transformer options to worker processes via structured clone, and
 *    functions cannot be cloned. That produced:
 *      "SyntaxError: (assetPath) => { return assetPath; } could not be cloned"
 *    and failed every web bundle. Never put functions in transformer options.
 *  - The dev-server middleware set `Content-Encoding: gzip` without actually
 *    gzipping the payload, which corrupts bundle responses in the browser.
 *    Removed — Metro/Expo handle bundle compression themselves.
 */

/**
 * Enable Expo's production graph optimizations + tree-shaking for the WEB
 * export only.
 *
 * Why: barrel-only packages such as `lucide-react-native` (its `exports` map
 * exposes only `.` and `./icons`, so per-icon deep imports aren't possible)
 * bundle their ENTIRE icon set without tree-shaking — several MB of dead code
 * that pushed the web bundle over the CI size budget.
 *
 * Why web-only: these are `EXPO_UNSTABLE_*` flags. We deliberately do NOT
 * enable them for native (iOS/Android) production bundles, where aggressive
 * tree-shaking could drop side-effectful imports that a dependency failed to
 * declare. Native builds are unaffected. Scope is detected from the CLI args
 * (`expo export --platform web`). `??=` still lets an operator force-set it.
 */
const _isWebExport =
  process.argv.includes('export') && process.argv.includes('web');
if (_isWebExport) {
  process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH ??= '1';
  process.env.EXPO_UNSTABLE_TREE_SHAKING ??= '1';
}

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Web-only module aliasing.
 *
 * `react-native-agora` is a native-only module and cannot be bundled for the
 * web target (it imports react-native internals like codegenNativeComponent).
 * Several services `require('react-native-agora')` behind runtime guards, but
 * Metro still statically bundles it, which broke `expo export --platform web`.
 * On web we resolve it to a harmless stub so the bundle builds. Native builds
 * are unaffected and continue to use the real SDK.
 */
const AGORA_WEB_STUB = path.resolve(__dirname, 'stubs/react-native-agora.web.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'react-native-agora' || moduleName.startsWith('react-native-agora/'))
  ) {
    return { type: 'sourceFile', filePath: AGORA_WEB_STUB };
  }
  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

/**
 * Bundle-size optimization: exclude files that never need to be part of the
 * app bundle. These are all inert file types (tests, docs, tooling configs),
 * so excluding them cannot affect runtime behavior.
 *
 * We intentionally do NOT exclude node_modules assets/fonts/locales here —
 * doing so can silently break third-party rendering and localization, and
 * Metro already tree-shakes unused modules.
 */
const extraBlockList = [
  /.*\/__tests__\/.*/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
  /.*\/__mocks__\/.*/,
  /node_modules\/.*\/README\.md$/,
  /node_modules\/.*\/CHANGELOG\.md$/,
  /node_modules\/.*\/HISTORY\.md$/,
  /node_modules\/.*\/CONTRIBUTORS\.md$/,
  /node_modules\/.*\/AUTHORS\.md$/,
  /node_modules\/.*\/\.travis\.yml$/,
];

// Merge with any existing blockList rather than replacing it.
const existingBlockList = config.resolver.blockList;
const existingPatterns =
  existingBlockList == null
    ? []
    : Array.isArray(existingBlockList)
      ? existingBlockList
      : [existingBlockList];

config.resolver.blockList = [...existingPatterns, ...extraBlockList];

// Better tree-shaking via package "exports" resolution.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
