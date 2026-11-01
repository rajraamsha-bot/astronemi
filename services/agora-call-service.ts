/**
 * Agora Call Service
 *
 * Real-time voice/video media layer for 1:1 consultations, built on
 * react-native-agora (v4). Tokens are minted server-side by the `agora-token`
 * Supabase Edge Function (the App Certificate never touches the client).
 *
 * Responsibilities:
 *  - Fetch a per-channel token (scoped to the user's wallet balance server-side)
 *  - Create + initialise the RTC engine, join/leave the channel
 *  - Publish/subscribe audio + (optionally) video
 *  - Expose mute / camera / speaker controls that drive the real stream
 *  - Surface remote-user join/leave + connection state via callbacks
 *
 * The SDK is loaded lazily and guarded, so the app still runs on web / Expo Go
 * where the native module isn't present (callbacks simply never fire and
 * `isAvailable()` returns false).
 */

import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';

// ─── Lazy, guarded SDK load ─────────────────────────────────────────────────
// react-native-agora v4 surface. Typed loosely because the native module may be
// absent at runtime.
type AgoraModule = {
  createAgoraRtcEngine: () => AgoraEngine;
  ChannelProfileType: { ChannelProfileLiveBroadcasting: number; ChannelProfileCommunication: number };
  ClientRoleType: { ClientRoleBroadcaster: number; ClientRoleAudience: number };
  // RtcSurfaceView is consumed by the UI layer, re-exported from there.
  [key: string]: unknown;
};

interface AgoraEngine {
  initialize: (config: { appId: string }) => number;
  registerEventHandler: (handler: Record<string, unknown>) => void;
  enableVideo: () => void;
  disableVideo: () => void;
  enableAudio: () => void;
  startPreview: () => void;
  stopPreview: () => void;
  joinChannel: (token: string, channelId: string, uid: number, options: Record<string, unknown>) => number;
  leaveChannel: () => number;
  muteLocalAudioStream: (mute: boolean) => void;
  muteLocalVideoStream: (mute: boolean) => void;
  enableLocalVideo: (enable: boolean) => void;
  setEnableSpeakerphone: (enable: boolean) => void;
  switchCamera: () => void;
  release: () => void;
}

let Agora: AgoraModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Agora = require('react-native-agora');
} catch {
  Logger.info('react-native-agora not installed (call media disabled)');
}

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

export interface AgoraTokenResult {
  token: string;
  channelName: string;
  uid: number;
  expireAt: number; // ms epoch when the token privilege expires
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

/**
 * Request a scoped Agora token from the edge function. Returns null if Supabase
 * isn't configured or the server declines (e.g. insufficient balance).
 */
export const fetchAgoraToken = async (
  channelName: string,
  astrologerId: string,
  role: 'publisher' | 'subscriber' = 'publisher',
): Promise<AgoraTokenResult | null> => {
  try {
    if (!isSupabaseConfigured()) {
      Logger.error('Supabase not configured — cannot fetch Agora token');
      return null;
    }
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: { channelName, astrologerId, role },
    });
    if (error || !data?.token) {
      Logger.error('agora-token error', error);
      return null;
    }
    return data as AgoraTokenResult;
  } catch (error) {
    Logger.error('fetchAgoraToken exception', error);
    return null;
  }
};

class AgoraCallService {
  private engine: AgoraEngine | null = null;
  private joined = false;
  // private channel: string | null = null; // Unused but kept for future reference

  isAvailable(): boolean {
    return Agora !== null && !!AGORA_APP_ID;
  }

  /**
   * Join a channel. Fetches a token, initialises the engine (once), wires the
   * event handler, and joins. Returns true on a successful join request.
   */
  async join(params: JoinCallParams): Promise<{ success: boolean; message?: string; expireAt?: number }> {
    const { channelName, astrologerId, video, callbacks } = params;

    if (!this.isAvailable() || !Agora) {
      return { success: false, message: 'Calling is not supported on this device.' };
    }

    const tokenResult = await fetchAgoraToken(channelName, astrologerId, 'publisher');
    if (!tokenResult) {
      return { success: false, message: 'Could not start the call. Please check your balance and try again.' };
    }

    // Release any previous engine before creating a new one. Re-joining
    // (retry, or a second call without an explicit leave) previously leaked
    // the old native engine and its event handlers.
    this.cleanup();

    try {
      const engine = Agora.createAgoraRtcEngine();
      this.engine = engine;
      engine.initialize({ appId: AGORA_APP_ID });

      engine.registerEventHandler({
        onJoinChannelSuccess: (_connection: unknown, _elapsed: number) => {
          this.joined = true;
          callbacks?.onJoinSuccess?.(tokenResult.uid);
        },
        onUserJoined: (_connection: unknown, remoteUid: number) => {
          callbacks?.onRemoteJoined?.(remoteUid);
        },
        onUserOffline: (_connection: unknown, remoteUid: number) => {
          callbacks?.onRemoteLeft?.(remoteUid);
        },
        onTokenPrivilegeWillExpire: () => {
          callbacks?.onTokenWillExpire?.();
        },
        onError: (err: number, msg: string) => {
          Logger.error('Agora engine error', { err, msg });
          callbacks?.onError?.(msg || `Agora error ${err}`);
        },
      });

      engine.enableAudio();
      if (video) {
        engine.enableVideo();
        engine.startPreview();
      } else {
        engine.disableVideo();
      }

      // Communication profile + broadcaster role for a 1:1 consultation.
      engine.joinChannel(tokenResult.token, channelName, tokenResult.uid, {
        clientRoleType: Agora.ClientRoleType.ClientRoleBroadcaster,
        channelProfile: Agora.ChannelProfileType.ChannelProfileCommunication,
        publishMicrophoneTrack: true,
        publishCameraTrack: video,
        autoSubscribeAudio: true,
        autoSubscribeVideo: video,
      });

      // this.channel = channelName; // Unused but kept for future reference
      // Default speaker on for video, earpiece for voice.
      engine.setEnableSpeakerphone(video);

      return { success: true, expireAt: tokenResult.expireAt };
    } catch (error) {
      Logger.error('Agora join failed', error);
      this.cleanup();
      return { success: false, message: 'Failed to connect the call.' };
    }
  }

  setMuted(muted: boolean): void {
    try { this.engine?.muteLocalAudioStream(muted); } catch (e) { Logger.warn('setMuted failed', e); }
  }

  setVideoEnabled(enabled: boolean): void {
    try {
      this.engine?.enableLocalVideo(enabled);
      this.engine?.muteLocalVideoStream(!enabled);
    } catch (e) { Logger.warn('setVideoEnabled failed', e); }
  }

  setSpeaker(on: boolean): void {
    try { this.engine?.setEnableSpeakerphone(on); } catch (e) { Logger.warn('setSpeaker failed', e); }
  }

  switchCamera(): void {
    try { this.engine?.switchCamera(); } catch (e) { Logger.warn('switchCamera failed', e); }
  }

  /**
   * Renew the channel token (call when onTokenWillExpire fires). Note: v4
   * exposes renewToken on the engine; we re-fetch and apply if available.
   */
  async renewToken(channelName: string, astrologerId: string): Promise<void> {
    try {
      const result = await fetchAgoraToken(channelName, astrologerId, 'publisher');
      const eng = this.engine as unknown as { renewToken?: (t: string) => void } | null;
      if (result && eng?.renewToken) {
        eng.renewToken(result.token);
      }
    } catch (e) {
      Logger.warn('renewToken failed', e);
    }
  }

  async leave(): Promise<void> {
    try {
      if (this.engine && this.joined) {
        this.engine.stopPreview();
        this.engine.leaveChannel();
      }
    } catch (e) {
      Logger.warn('leave failed', e);
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    try {
      this.engine?.release();
    } catch {
      // ignore
    }
    this.engine = null;
    this.joined = false;
    // this.channel = null;
  }
}

export const agoraCall = new AgoraCallService();

/**
 * Re-export the surface view component for the UI layer. Guarded so importing
 * this module never throws when the native module is absent.
 */
export function getRtcSurfaceView(): React.ComponentType<Record<string, unknown>> | null {
  if (!Agora) return null;
  return (Agora.RtcSurfaceView as React.ComponentType<Record<string, unknown>>) ?? null;
}

export const isVideoSupported = (): boolean => agoraCall.isAvailable() && Platform.OS !== 'web';

export default agoraCall;
