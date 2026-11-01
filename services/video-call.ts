/**
 * Video Call Service
 * 
 * Handles video calls between users and astrologers using Agora RTC SDK.
 * 
 * Features:
 * - One-on-one video consultations
 * - Audio/video controls (mute, camera, speaker)
 * - Network quality monitoring
 * - Call duration tracking
 * - Event-driven architecture
 * 
 * Security:
 * - Tokens generated server-side via Supabase Edge Function
 * - App Certificate never exposed to client
 * - Time-limited tokens (24 hours default)
 */

import { Platform } from 'react-native';
import { getAgoraToken } from './agora-token-service';
import { Logger } from './logger';

// Conditional import for Agora SDK
let AgoraRTC: any = null;

if (Platform.OS !== 'web') {
  try {
    AgoraRTC = require('react-native-agora');
  } catch {
    Logger.warn('react-native-agora not installed');
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoCallConfig {
  channelName: string;
  token: string;
  uid: number;
  isAstrologer: boolean;
  astrologerId?: string; // Required for reconnection token refresh
}

export interface VideoCallState {
  isInitialized: boolean;
  isJoined: boolean;
  localUid: number | null;
  remoteUid: number | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export type VideoCallEventHandler = (event: string, data: Record<string, unknown>) => void;

// ─── Call Duration Tracker ────────────────────────────────────────────────────

export class CallDurationTracker {
  private startTime: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callback: ((duration: number) => void) | null = null;

  start(callback?: (duration: number) => void): void {
    // Clear any existing interval first: an Agora reconnect re-enters
    // joinChannel(), which calls start() again. Without this, every reconnect
    // stacked a second ticking interval (double duration callbacks).
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Keep the original startTime when already running. A reconnect must not
    // reset the billed call duration back to zero.
    if (this.startTime === null) {
      this.startTime = Date.now();
    }
    this.callback = callback || null;

    if (this.callback) {
      this.intervalId = setInterval(() => {
        if (this.startTime && this.callback) {
          const duration = Math.floor((Date.now() - this.startTime) / 1000);
          this.callback(duration);
        }
      }, 1000) as ReturnType<typeof setInterval>;
    }
  }

  stop(): number {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.startTime) {
      return 0;
    }

    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    this.startTime = null;
    this.callback = null;

    return duration;
  }

  getCurrentDuration(): number {
    if (!this.startTime) {
      return 0;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// ─── Video Call Service ───────────────────────────────────────────────────────

class VideoCallService {
  private engine: any = null;
  private state: VideoCallState = {
    isInitialized: false,
    isJoined: false,
    localUid: null,
    remoteUid: null,
    isMuted: false,
    isVideoEnabled: true,
    isSpeakerEnabled: true,
    networkQuality: 'unknown',
  };
  private eventHandlers: VideoCallEventHandler[] = [];
  private durationTracker: CallDurationTracker = new CallDurationTracker();
  private lastChannelConfig: VideoCallConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Initialization ─────────────────────────────────────────────────────────

  async initialize(): Promise<boolean> {
    if (this.state.isInitialized) {
      return true;
    }

    try {
      if (!AgoraRTC) {
        Logger.warn('Agora SDK not available');
        return false;
      }

      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID;
      if (!appId || appId.includes('your-agora')) {
        Logger.error('Agora App ID not configured');
        return false;
      }

      // Create Agora engine
      this.engine = await AgoraRTC.createAgoraRtcEngine();
      
      // Initialize engine
      if (this.engine) {
        await this.engine.initialize({
          appId,
          channelProfile: AgoraRTC.ChannelProfileType.ChannelProfileCommunication,
        });
      }


      // Set up event handlers
      this.setupEventHandlers();

      // Enable audio and video by default
      if (this.engine) {
        await this.engine.enableAudio();
        await this.engine.enableVideo();
      }

      this.state.isInitialized = true;
      this.emitEvent('initialized', { appId });

      Logger.info('Agora engine initialized');
      return true;
    } catch (error) {
      Logger.error('Error initializing Agora:', { error });
      return false;
    }
  }

  // ─── Channel Operations ─────────────────────────────────────────────────────

  async joinChannel(config: VideoCallConfig): Promise<boolean> {
    try {
      // Auto-initialize if needed
      if (!this.state.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return false;
        }
      }

      // Join channel
      if (this.engine) {
        await this.engine.joinChannel(
          config.token,
          config.channelName,
          config.uid,
          {
            clientRoleType: config.isAstrologer 
              ? AgoraRTC.ClientRoleType.ClientRoleBroadcaster
              : AgoraRTC.ClientRoleType.ClientRoleAudience,
          }
        );
      }


      this.state.isJoined = true;
      this.state.localUid = config.uid;

      // Store config for reconnection
      this.lastChannelConfig = config;
      this.reconnectAttempts = 0;

      // Start duration tracking
      this.durationTracker.start((duration) => {
        this.emitEvent('durationUpdate', { duration });
      });

      this.emitEvent('joinedChannel', { channelName: config.channelName, uid: config.uid });

      Logger.info('Joined channel:', { channelName: config.channelName });
      return true;
    } catch (error) {
      Logger.error('Error joining channel:', { error });
      return false;
    }
  }

  async leaveChannel(): Promise<void> {
    try {
      if (!this.state.isJoined) {
        return;
      }

      // Stop duration tracking
      const duration = this.durationTracker.stop();

      // Cancel any pending reconnect so the user is not silently re-joined
      // after hanging up.
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.reconnectAttempts = 0;

      // Leave channel
      if (this.engine) {
        await this.engine.leaveChannel();
      }

      this.state.isJoined = false;
      this.state.remoteUid = null;

      this.emitEvent('leftChannel', { duration });

      Logger.info('Left channel');
    } catch (error) {
      Logger.error('Error leaving channel:', { error });
    }
  }

  // ─── Audio Controls ─────────────────────────────────────────────────────────

  async toggleMute(): Promise<boolean> {
    try {
      const newMuted = !this.state.isMuted;
      if (this.engine) {
        await this.engine.muteLocalAudioStream(newMuted);
      }
      this.state.isMuted = newMuted;

      this.emitEvent('audioMuteChanged', { muted: newMuted });

      return newMuted;
    } catch (error) {
      Logger.error('Error toggling mute:', { error });
      return this.state.isMuted;
    }
  }

  async toggleSpeaker(): Promise<boolean> {
    try {
      const newEnabled = !this.state.isSpeakerEnabled;
      if (this.engine) {
        await this.engine.setEnableSpeakerphone(newEnabled);
      }
      this.state.isSpeakerEnabled = newEnabled;

      this.emitEvent('speakerChanged', { enabled: newEnabled });

      return newEnabled;
    } catch (error) {
      Logger.error('Error toggling speaker:', { error });
      return this.state.isSpeakerEnabled;
    }
  }

  // ─── Video Controls ─────────────────────────────────────────────────────────

  async toggleVideo(): Promise<boolean> {
    try {
      const newEnabled = !this.state.isVideoEnabled;
      if (this.engine) {
        await this.engine.muteLocalVideoStream(!newEnabled);
      }
      this.state.isVideoEnabled = newEnabled;

      this.emitEvent('videoEnabledChanged', { enabled: newEnabled });

      return newEnabled;
    } catch (error) {
      Logger.error('Error toggling video:', { error });
      return this.state.isVideoEnabled;
    }
  }

  async switchCamera(): Promise<void> {
    try {
      if (this.engine) {
        await this.engine.switchCamera();
      }
      this.emitEvent('cameraSwitched', {});
    } catch (error) {
      Logger.error('Error switching camera:', { error });
    }
  }

  // ─── Event Handling ─────────────────────────────────────────────────────────

  private setupEventHandlers(): void {
    if (!this.engine) return;

    // User joined
    this.engine?.registerEventHandler({
      onUserJoined: (_connection: unknown, remoteUid: number) => {
        Logger.info('Remote user joined:', { uid: remoteUid });
        this.state.remoteUid = remoteUid;
        this.emitEvent('userJoined', { uid: remoteUid });
      },

      onUserOffline: (_connection: unknown, remoteUid: number, reason: number) => {
        Logger.info('Remote user left:', { uid: remoteUid, reason });
        this.state.remoteUid = null;
        this.emitEvent('userLeft', { uid: remoteUid, reason });
        // Auto-reconnect if remote user dropped unexpectedly (not intentional leave)
        if (reason === 0 && this.lastChannelConfig) { // USER_OFFLINE_QUIT = 0 is intentional
          // Don't reconnect for intentional leaves
        }
      },

      onNetworkQuality: (_connection: unknown, _remoteUid: number, txQuality: number, rxQuality: number) => {
        const quality = this.mapNetworkQuality(Math.max(txQuality, rxQuality));
        this.state.networkQuality = quality;
        this.emitEvent('networkQuality', { quality, txQuality, rxQuality });
      },

      onError: (err: number, msg: string) => {
        Logger.error('Agora error:', { code: err, message: msg });
        this.emitEvent('error', { code: err, message: msg });
        // Attempt reconnection on network-related errors
        if (err === 17 || err === 18 || err === 103) { // NETWORK_ERROR, TOKEN_EXPIRED, CONNECTION_LOST
          this.attemptReconnect();
        }
      },
    });
  }

  private mapNetworkQuality(quality: number): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    switch (quality) {
      case 1: return 'excellent';
      case 2: return 'good';
      case 3: return 'fair';
      case 4:
      case 5: return 'poor';
      default: return 'unknown';
    }
  }

  addEventHandler(handler: VideoCallEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private async attemptReconnect(): Promise<void> {
    if (!this.lastChannelConfig || this.reconnectAttempts >= this.maxReconnectAttempts) {
      Logger.warn('Reconnect failed: max attempts reached or no config');
      this.emitEvent('reconnectFailed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    Logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emitEvent('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });

    this.reconnectTimer = setTimeout(async () => {
      try {
        // Get a fresh token
        const tokenResult = await getAgoraToken({
          channelName: this.lastChannelConfig!.channelName,
          astrologerId: this.lastChannelConfig!.astrologerId || 'unknown',
          uid: this.lastChannelConfig!.uid,
        });

        if (tokenResult?.token) {
          const config = { ...this.lastChannelConfig!, token: tokenResult.token };
          const joined = await this.joinChannel(config);
          if (joined) {
            this.reconnectAttempts = 0;
            this.emitEvent('reconnected', {});
          }
        }
      } catch (error) {
        Logger.error('Reconnect attempt failed:', { error });
        this.attemptReconnect(); // Retry
      }
    }, delay);
  }

  removeEventHandler(handler: VideoCallEventHandler): void {
    this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
  }

  private emitEvent(event: string, data: Record<string, unknown>): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event, data);
      } catch (error) {
        Logger.error('Error in event handler:', { error });
      }
    });
  }

  // ─── State Management ───────────────────────────────────────────────────────

  getState(): VideoCallState {
    return { ...this.state };
  }

  getDuration(): number {
    return this.durationTracker.getCurrentDuration();
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  async release(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.state.isJoined) {
        await this.leaveChannel();
      }

      if (this.engine) {
        await this.engine.release();
        this.engine = null;
      }

      this.state = {
        isInitialized: false,
        isJoined: false,
        localUid: null,
        remoteUid: null,
        isMuted: false,
        isVideoEnabled: true,
        isSpeakerEnabled: true,
        networkQuality: 'unknown',
      };

      this.eventHandlers = [];

      Logger.info('Video call service released');
    } catch (error) {
      Logger.error('Error releasing video call service:', { error });
    }
  }
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

export const videoCallService = new VideoCallService();

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Generate Agora token via backend
 */
export const generateAgoraToken = async (
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber'
): Promise<string> => {
  try {
    const tokenResponse = await getAgoraToken({
      channelName,
      uid,
      role,
      expireTime: 86400, // 24 hours
    });

    return tokenResponse?.token || '';
  } catch (error) {
    Logger.error('Error generating Agora token:', { error });
    return '';
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export default videoCallService;
