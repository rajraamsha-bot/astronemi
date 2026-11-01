/**
 * Agora Call Service — WEB STUB
 *
 * react-native-agora is a native-only module: it imports
 * `react-native/Libraries/Utilities/codegenNativeComponent`, which the Metro
 * web bundler cannot resolve ("Importing react-native internals is not
 * supported on web"). The runtime `try/catch` around `require()` in the
 * native implementation does NOT help — Metro statically bundles every
 * required module regardless of try/catch, so the web bundle failed to build.
 *
 * Metro resolves platform-specific files (`*.web.ts`) ahead of the base file
 * for the web target, so this stub is what gets bundled for web. It mirrors
 * the public surface of services/agora-call-service.ts with no-op / disabled
 * behaviour. This matches the app's intended UX: voice/video calling is a
 * native-only feature (see `isVideoSupported()` returning false on web).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';

export interface AgoraTokenResult {
  token: string;
  channelName: string;
  uid: number;
  expireAt: number;
}

export interface CallCallbacks {
  onRemoteJoined?: (uid: number) => void;
  onRemoteLeft?: (uid: number) => void;
  onJoinSuccess?: (uid: number) => void;
  onError?: (message: string) => void;
  onTokenWillExpire?: () => void;
}

export interface JoinCallParams {
  channelName: string;
  astrologerId: string;
  video: boolean;
  callbacks?: CallCallbacks;
}

const CALL_UNSUPPORTED_MESSAGE = 'Voice and video calls are only available in the mobile app.';

/**
 * Kept API-compatible with the native implementation. The edge function call
 * is harmless on web, but calling itself is unavailable, so we short-circuit.
 */
export const fetchAgoraToken = async (
  _channelName: string,
  _astrologerId: string,
  _role: 'publisher' | 'subscriber' = 'publisher',
): Promise<AgoraTokenResult | null> => {
  if (!isSupabaseConfigured()) {
    Logger.info('Agora token fetch skipped on web (Supabase not configured)');
    return null;
  }
  // Media cannot be established on web; do not attempt to mint a token.
  void supabase;
  return null;
};

class AgoraCallServiceWeb {
  isAvailable(): boolean {
    return false;
  }

  async join(
    _params: JoinCallParams,
  ): Promise<{ success: boolean; message?: string; expireAt?: number }> {
    return { success: false, message: CALL_UNSUPPORTED_MESSAGE };
  }

  setMuted(_muted: boolean): void {}
  setVideoEnabled(_enabled: boolean): void {}
  setSpeaker(_on: boolean): void {}
  switchCamera(): void {}
  async renewToken(_channelName: string, _astrologerId: string): Promise<void> {}
  async leave(): Promise<void> {}
}

export const agoraCall = new AgoraCallServiceWeb();

export function getRtcSurfaceView(): React.ComponentType<Record<string, unknown>> | null {
  return null;
}

export const isVideoSupported = (): boolean => false;

export default agoraCall;
