/**
 * Avatar Fallback Utility
 *
 * CRITICAL-7 fix: replace via.placeholder.com (third-party, can break,
 * logs IPs) with a local SVG data-URL generator.
 *
 * Usage:
 *   import { getAvatarUrl } from '@/utils/avatar';
 *   <Image source={{ uri: getAvatarUrl(user.avatarUrl, user.name) }} />
 *
 * - If the user already has an avatar URL, return it.
 * - Otherwise generate a deterministic, data-URL SVG with the user's
 *   initials and a colour derived from the name. No third-party call.
 */

const PALETTE = [
  '#6B46C1',
  '#D97706',
  '#059669',
  '#DC2626',
  '#2563EB',
  '#DB2777',
  '#0891B2',
  '#7C3AED',
  '#EA580C',
  '#16A34A',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const first = parts[0]!;
    return (first[0] ?? '?').toUpperCase();
  }
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return ((first[0] ?? '?') + (last[0] ?? '?')).toUpperCase();
}

function getColour(seed: string): string {
  const idx = hashString(seed) % PALETTE.length;
  return PALETTE[idx] ?? PALETTE[0]!;
}

function buildInitialsDataUrl(name: string, size = 96): string {
  const initials = getInitials(name);
  const bg = getColour(name);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<rect width="100%" height="100%" fill="' + bg + '"/>' +
    '<text x="50%" y="50%" dy=".1em" text-anchor="middle" dominant-baseline="middle" ' +
    'font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" ' +
    'font-size="' + Math.round(size * 0.4) + '" font-weight="600" fill="#ffffff">' +
    initials + '</text></svg>';

  let encoded: string;
  if (typeof btoa !== 'undefined') {
    encoded = btoa(svg);
  } else {
    const g = globalThis as { Buffer?: { from: (s: string) => { toString: (enc: string) => string } } };
    if (g.Buffer) {
      encoded = g.Buffer.from(svg).toString('base64');
    } else {
      encoded = encodeURIComponent(svg);
    }
  }

  return 'data:image/svg+xml;base64,' + encoded;
}

export interface AvatarOptions {
  size?: number;
}

export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  name: string | null | undefined,
  options: AvatarOptions = {},
): string {
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return avatarUrl;
  }
  return buildInitialsDataUrl(name ?? 'User', options.size ?? 96);
}

export function safeAvatarUrl(
  avatarUrl: string | null | undefined,
  name: string | null | undefined,
): string {
  return getAvatarUrl(avatarUrl, name);
}

export default getAvatarUrl;
