/**
 * Bundle Analysis Configuration
 * 
 * Tools and configuration for analyzing bundle size
 */

// Bundle size limits (in KB) - Aggressive optimization targets
export const BundleLimits = {
  // Main bundle size limit (reduced from 500KB)
  mainBundle: 400,
  
  // Per-chunk size limit (reduced from 200KB)
  chunkSize: 150,
  
  // Total bundle size limit (reduced from 2000KB)
  totalSize: 1500,
  
  // Asset size limits
  assets: {
    images: 80, // per image (reduced from 100KB)
    fonts: 40, // per font (reduced from 50KB)
    videos: 400, // per video (reduced from 500KB)
  },
};

// Bundle analyzer configuration
export const AnalyzerConfig = {
  // Enable analyzer in development
  enabled: process.env.NODE_ENV === 'development',
  
  // Output format
  outputFormat: 'html' as const, // 'html' | 'json' | 'text'
  
  // Output directory
  outputDir: 'bundle-analysis',
  
  // Open report automatically
  openReport: true,
  
  // Analyzer mode
  mode: 'static' as const, // 'static' | 'server' | 'disabled'
  
  // Include source maps
  sourceMaps: true,
  
  // Exclude patterns
  exclude: [
    'node_modules',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '__tests__',
    '__mocks__',
  ],
};

// Bundle size warnings
export interface BundleWarning {
  type: 'error' | 'warning';
  message: string;
  size: number;
  limit: number;
  file?: string;
}

// Track bundle sizes
export const BundleSizeTracker = {
  sizes: new Map<string, number>(),
  
  set(name: string, size: number): void {
    this.sizes.set(name, size);
  },
  
  get(name: string): number | undefined {
    return this.sizes.get(name);
  },
  
  checkLimit(name: string, limit: number): BundleWarning | null {
    const size = this.sizes.get(name);
    if (size === undefined) return null;
    
    if (size > limit) {
      return {
        type: size > limit * 1.5 ? 'error' : 'warning',
        message: `Bundle "${name}" exceeds limit`,
        size,
        limit,
      };
    }
    return null;
  },
  
  getAllWarnings(): BundleWarning[] {
    const warnings: BundleWarning[] = [];
    
    this.sizes.forEach((_size, name) => {
      const warning = this.checkLimit(name, BundleLimits.chunkSize);
      if (warning) {
        warnings.push({ ...warning, file: name });
      }
    });
    
    return warnings;
  },
  
  getTotalSize(): number {
    let total = 0;
    this.sizes.forEach(size => {
      total += size;
    });
    return total;
  },
  
  getReport(): {
    totalSize: number;
    chunks: { name: string; size: number; percentage: number }[];
    warnings: BundleWarning[];
  } {
    const totalSize = this.getTotalSize();
    const chunks: { name: string; size: number; percentage: number }[] = [];
    
    this.sizes.forEach((size, name) => {
      chunks.push({
        name,
        size,
        percentage: (size / totalSize) * 100,
      });
    });
    
    // Sort by size descending
    chunks.sort((a, b) => b.size - a.size);
    
    return {
      totalSize,
      chunks,
      warnings: this.getAllWarnings(),
    };
  },
};

// Large dependencies to monitor
export const LargeDependencies = [
  { name: '@react-navigation/native', expectedSize: 50 },
  { name: 'react-native-gesture-handler', expectedSize: 30 },
  { name: 'react-native-reanimated', expectedSize: 80 },
  { name: '@supabase/supabase-js', expectedSize: 100 },
  { name: 'expo-camera', expectedSize: 50 },
  { name: 'expo-location', expectedSize: 30 },
  { name: 'expo-notifications', expectedSize: 40 },
  { name: '@sentry/react-native', expectedSize: 30 },
  { name: 'date-fns', expectedSize: 20 },
  { name: 'lodash', expectedSize: 70, alternative: 'lodash-es' },
];

// Duplicate dependencies check
export function checkDuplicateDependencies(
  dependencies: Record<string, string[]>
): { name: string; versions: string[] }[] {
  const duplicates: { name: string; versions: string[] }[] = [];
  
  Object.entries(dependencies).forEach(([name, versions]) => {
    if (versions.length > 1) {
      duplicates.push({ name, versions });
    }
  });
  
  return duplicates;
}

// Tree shaking recommendations
export const TreeShakingRecommendations = [
  {
    library: 'lodash',
    recommendation: 'Use lodash-es or import specific functions',
    example: "import { debounce } from 'lodash-es'",
  },
  {
    library: 'date-fns',
    recommendation: 'Import only needed functions',
    example: "import { format, addDays } from 'date-fns'",
  },
  {
    library: '@react-navigation',
    recommendation: 'Use specific navigators instead of all',
    example: "import { createNativeStackNavigator } from '@react-navigation/native-stack'",
  },
  {
    library: 'react-native-vector-icons',
    recommendation: 'Use specific icon families',
    example: "import MaterialIcons from 'react-native-vector-icons/MaterialIcons'",
  },
];

// Bundle optimization suggestions
export function getOptimizationSuggestions(
  bundleReport: ReturnType<typeof BundleSizeTracker.getReport>
): string[] {
  const suggestions: string[] = [];
  
  // Check total size
  if (bundleReport.totalSize > BundleLimits.totalSize * 1024) {
    suggestions.push(
      `Total bundle size (${(bundleReport.totalSize / 1024).toFixed(2)}MB) exceeds limit. Consider code splitting.`
    );
  }
  
  // Check for large chunks
  bundleReport.chunks.forEach(chunk => {
    if (chunk.size > BundleLimits.chunkSize * 1024) {
      suggestions.push(
        `Chunk "${chunk.name}" is large (${(chunk.size / 1024).toFixed(2)}KB). Consider splitting further.`
      );
    }
  });
  
  // Check for warnings
  if (bundleReport.warnings.length > 0) {
    suggestions.push(
      `Found ${bundleReport.warnings.length} bundle size warnings. Review and optimize.`
    );
  }
  
  return suggestions;
}

// Export for bundle analyzer plugin configuration
export function getBundleAnalyzerPluginConfig() {
  return {
    analyzerMode: AnalyzerConfig.mode,
    reportFilename: 'bundle-report.html',
    defaultSizes: 'parsed' as const,
    openAnalyzer: AnalyzerConfig.openReport,
    generateStatsFile: true,
    statsFilename: 'bundle-stats.json',
    logLevel: 'info' as const,
    excludeAssets: AnalyzerConfig.exclude,
  };
}

// Metro bundler configuration for bundle optimization
export function getMetroBundleConfig() {
  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true, // Enable inline requires for smaller bundles
        },
      }),
    },
    resolver: {
      // Enable tree shaking
      sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
    },
    // Enable hermes for smaller bundle size
    enableHermes: true,
  };
}

// Bundle size monitoring script
export function monitorBundleSize(buildOutput: string): BundleWarning[] {
  const warnings: BundleWarning[] = [];

  // Parse build output for bundle sizes
  const bundleRegex = /bundle size:\s*([\d,]+)\s*bytes/i;
  const match = buildOutput.match(bundleRegex);

  if (match) {
    const size = parseInt(match[1]?.replace(/,/g, '') ?? '0', 10);
    const sizeKB = size / 1024;

    if (sizeKB > BundleLimits.mainBundle) {
      warnings.push({
        type: 'error',
        message: `Main bundle exceeds limit: ${sizeKB.toFixed(2)}KB > ${BundleLimits.mainBundle}KB`,
        size: sizeKB,
        limit: BundleLimits.mainBundle,
      });
    }
  }

  return warnings;
}

// Generate bundle size report
export function generateBundleReport(): string {
  const report = BundleSizeTracker.getReport();

  let output = '📊 Bundle Analysis Report\n\n';
  output += `Total Size: ${(report.totalSize / 1024).toFixed(2)} KB\n`;
  output += `Main Bundle Limit: ${BundleLimits.mainBundle} KB\n`;
  output += `Chunk Size Limit: ${BundleLimits.chunkSize} KB\n\n`;

  if (report.warnings.length > 0) {
    output += '⚠️ Warnings:\n';
    report.warnings.forEach(warning => {
      output += `- ${warning.message} (${warning.size.toFixed(2)}KB > ${warning.limit}KB)\n`;
    });
    output += '\n';
  }

  output += '📦 Chunks:\n';
  report.chunks.forEach(chunk => {
    output += `- ${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB (${chunk.percentage.toFixed(1)}%)\n`;
  });

  return output;
}

export default {
  BundleLimits,
  AnalyzerConfig,
  BundleSizeTracker,
  LargeDependencies,
  TreeShakingRecommendations,
  checkDuplicateDependencies,
  getOptimizationSuggestions,
  getBundleAnalyzerPluginConfig,
  getMetroBundleConfig,
  monitorBundleSize,
  generateBundleReport,
};
