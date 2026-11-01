/**
 * Normalizes deep link paths from external sources (push notifications,
 * universal links, custom scheme links) into Expo Router-compatible paths.
 *
 * Maps legacy/external paths to the correct internal route.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  if (!path || path === '/') {
    return initial ? '/' : '/';
  }

  // Strip the scheme prefix if present (e.g., astronemi://foo → /foo)
  let normalized = path.replace(/^astronemi:\/\//, '/');

  // Ensure the path starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Map known external paths to internal routes
  const pathMap: Record<string, string> = {
    '/home': '/(tabs)',
    '/main': '/(tabs)',
    '/chat': '/(tabs)/chat',
    '/profile': '/(tabs)/profile',
    '/kundli': '/(tabs)/kundli',
    '/settings': '/settings',
    '/login': '/login',
    '/onboarding': '/onboarding',
    '/wallet': '/wallet',
    '/subscription': '/subscription',
  };

  // Check for exact match first
  const mappedPath = pathMap[normalized];
  if (mappedPath) {
    return mappedPath;
  }

  // Check for prefix match (e.g., /astrologer/123 → /astrologer/[id])
  if (normalized.startsWith('/astrologer/')) {
    return normalized; // Expo Router will handle dynamic segments
  }

  if (normalized.startsWith('/chat/')) {
    return normalized;
  }

  if (normalized.startsWith('/booking/')) {
    return normalized;
  }

  if (normalized.startsWith('/content/')) {
    return normalized;
  }

  if (normalized.startsWith('/live-stream/')) {
    return normalized;
  }

  return normalized;
}
