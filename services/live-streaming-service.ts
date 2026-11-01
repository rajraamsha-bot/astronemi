/**
 * Live Streaming Service
 * 
 * Handles live video streaming for astrologer sessions, webinars, and events.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { prefixedSecureId } from '../utils/secure-random';

let AgoraRTC: Record<string, unknown> | null = null;
try {
  AgoraRTC = require('react-native-agora');
} catch {
  Logger.info('react-native-agora not installed (optional dependency)');
}

export interface LiveStreamConfig {
  appId: string;
  channelName: string;
  token?: string;
  uid?: number;
  role: 'host' | 'audience';
}

export interface LiveStreamSession {
  id: string;
  title: string;
  description: string;
  astrologerId: string;
  astrologerName: string;
  astrologerImage?: string;
  channelName: string;
  token: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'live' | 'ended';
  viewerCount: number;
  likeCount: number;
  isPaid: boolean;
  price?: number;
  tags: string[];
  thumbnailUrl?: string;
}

export interface LiveStreamMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'gift' | 'system';
  giftType?: string;
  giftValue?: number;
}

export interface LiveStreamStats {
  duration: number;
  peakViewers: number;
  totalViewers: number;
  totalLikes: number;
  totalGifts: number;
  totalGiftValue: number;
  messages: number;
}

export interface GiftItem {
  id: string;
  name: string;
  icon: string;
  value: number;
  animation?: string;
}

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
const LIVE_STREAMS_KEY = '@live_streams';

export const LIVE_GIFTS: GiftItem[] = [
  { id: 'flower', name: 'Flower', icon: '🌸', value: 10 },
  { id: 'heart', name: 'Heart', icon: '❤️', value: 25 },
  { id: 'star', name: 'Star', icon: '⭐', value: 50 },
  { id: 'diamond', name: 'Diamond', icon: '💎', value: 100 },
  { id: 'crown', name: 'Crown', icon: '👑', value: 250 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', value: 500 },
];

export const LiveStreamingService = {
  engine: null as any,
  isInitialized: false,

  async initialize(): Promise<boolean> {
    try {
      if (!AgoraRTC) {
        Logger.info('Agora SDK not installed');
        return false;
      }
      if (this.isInitialized) return true;
      this.engine = (AgoraRTC as any).createAgoraRtcEngine?.();
      if (!this.engine) {
        Logger.error('Failed to create Agora engine');
        return false;
      }
      await this.engine.initialize({ appId: AGORA_APP_ID });
      this.engine.enableVideo();
      this.isInitialized = true;
      return true;
    } catch (error) {
      Logger.error('Error initializing live streaming:', error);
      return false;
    }
  },

  async destroy(): Promise<void> {
    try {
      if (this.engine) {
        this.engine.destroy();
        this.engine = null;
        this.isInitialized = false;
      }
    } catch (error) {
      Logger.error('Error destroying engine:', error);
    }
  },

  async joinAsHost(config: LiveStreamConfig): Promise<boolean> {
    try {
      if (!this.engine) await this.initialize();
      if (!this.engine) return false;
      this.engine.setClientRole(1);
      const result = await this.engine.joinChannel(config.token || '', config.channelName, null, config.uid || 0);
      return result === 0;
    } catch (error) {
      Logger.error('Error joining as host:', error);
      return false;
    }
  },

  async joinAsAudience(config: LiveStreamConfig): Promise<boolean> {
    try {
      if (!this.engine) await this.initialize();
      if (!this.engine) return false;
      this.engine.setClientRole(2);
      const result = await this.engine.joinChannel(config.token || '', config.channelName, null, config.uid || 0);
      return result === 0;
    } catch (error) {
      Logger.error('Error joining as audience:', error);
      return false;
    }
  },

  async leaveChannel(): Promise<void> {
    try {
      if (this.engine) await this.engine.leaveChannel();
    } catch (error) {
      Logger.error('Error leaving channel:', error);
    }
  },

  enableLocalVideo(enabled: boolean): void {
    if (this.engine) this.engine.enableLocalVideo(enabled);
  },

  enableLocalAudio(enabled: boolean): void {
    if (this.engine) this.engine.enableLocalAudio(enabled);
  },

  switchCamera(): void {
    if (this.engine) this.engine.switchCamera();
  },

  async createLiveStream(
    session: Omit<LiveStreamSession, 'id' | 'token' | 'channelName' | 'status' | 'viewerCount' | 'likeCount'>
  ): Promise<LiveStreamSession | null> {
    try {
      const id = prefixedSecureId('live', 12);
      const channelName = `channel_${id}`;
      const token = await this.generateToken(channelName);
      const newSession: LiveStreamSession = {
        ...session, id, channelName, token,
        status: 'scheduled', viewerCount: 0, likeCount: 0,
      };
      const streams = await this.getScheduledStreams();
      streams.push(newSession);
      await AsyncStorage.setItem(LIVE_STREAMS_KEY, JSON.stringify(streams));
      return newSession;
    } catch (error) {
      Logger.error('Error creating live stream:', error);
      return null;
    }
  },

  async startLiveStream(streamId: string): Promise<boolean> {
    try {
      const streams = await this.getScheduledStreams();
      const stream = streams.find((s: LiveStreamSession) => s.id === streamId);
      if (stream) {
        stream.status = 'live';
        stream.startTime = new Date();
        await AsyncStorage.setItem(LIVE_STREAMS_KEY, JSON.stringify(streams));
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('Error starting live stream:', error);
      return false;
    }
  },

  async endLiveStream(streamId: string): Promise<LiveStreamStats | null> {
    try {
      const streams = await this.getScheduledStreams();
      const stream = streams.find((s: LiveStreamSession) => s.id === streamId);
      if (stream) {
        stream.status = 'ended';
        stream.endTime = new Date();
        await AsyncStorage.setItem(LIVE_STREAMS_KEY, JSON.stringify(streams));
        await this.leaveChannel();
        return {
          duration: Math.floor((stream.endTime!.getTime() - stream.startTime.getTime()) / 1000),
          peakViewers: stream.viewerCount,
          totalViewers: stream.viewerCount,
          totalLikes: stream.likeCount,
          totalGifts: 0,
          totalGiftValue: 0,
          messages: 0,
        };
      }
      return null;
    } catch (error) {
      Logger.error('Error ending live stream:', error);
      return null;
    }
  },

  async getScheduledStreams(): Promise<LiveStreamSession[]> {
    try {
      const data = await AsyncStorage.getItem(LIVE_STREAMS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data) as LiveStreamSession[];
      // JSON round-trip turns Date fields into strings; revive them so
      // callers (endLiveStream, etc.) can safely call .getTime().
      return parsed.map(s => ({
        ...s,
        startTime: s.startTime ? new Date(s.startTime) : s.startTime,
        endTime: s.endTime ? new Date(s.endTime) : s.endTime,
        // Note: LiveStreamSession has no `createdAt`; dropped the stray line
        // that referenced it.
      } as LiveStreamSession));
    } catch (error) {
      Logger.error('Error getting scheduled streams:', error);
      return [];
    }
  },

  async getLiveStreams(): Promise<LiveStreamSession[]> {
    try {
      const streams = await this.getScheduledStreams();
      return streams.filter((s: LiveStreamSession) => s.status === 'live');
    } catch (error) {
      Logger.error('Error getting live streams:', error);
      return [];
    }
  },

  async getStreamById(streamId: string): Promise<LiveStreamSession | null> {
    try {
      const streams = await this.getScheduledStreams();
      return streams.find((s: LiveStreamSession) => s.id === streamId) || null;
    } catch (error) {
      Logger.error('Error getting stream:', error);
      return null;
    }
  },

  async generateToken(channelName: string): Promise<string> {
    try {
      const { getAgoraToken } = await import('./agora-token-service');
      const result = await getAgoraToken({ channelName, astrologerId: 'live_stream', role: 'publisher' });
      return result?.token || '';
    } catch (error) {
      Logger.error('Error generating token:', error);
      return '';
    }
  },

  async updateViewerCount(streamId: string, count: number): Promise<void> {
    try {
      const streams = await this.getScheduledStreams();
      const stream = streams.find((s: LiveStreamSession) => s.id === streamId);
      if (stream) {
        stream.viewerCount = count;
        await AsyncStorage.setItem(LIVE_STREAMS_KEY, JSON.stringify(streams));
      }
    } catch (error) {
      Logger.error('Error updating viewer count:', error);
    }
  },

  async addLike(streamId: string): Promise<number> {
    try {
      const streams = await this.getScheduledStreams();
      const stream = streams.find((s: LiveStreamSession) => s.id === streamId);
      if (stream) {
        stream.likeCount += 1;
        await AsyncStorage.setItem(LIVE_STREAMS_KEY, JSON.stringify(streams));
        return stream.likeCount;
      }
      return 0;
    } catch (error) {
      Logger.error('Error adding like:', error);
      return 0;
    }
  },

  async sendGift(streamId: string, giftId: string, senderId: string, astrologerId?: string): Promise<boolean> {
    try {
      const gift = LIVE_GIFTS.find((g: GiftItem) => g.id === giftId);
      if (!gift) return false;
      // H-10: route through server RPC so the astrologer's earnings ledger is
      // credited atomically with the sender's wallet debit. Pass astrologer_id
      // so the gift is associated with the right streamer.
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.rpc('send_live_gift', {
        p_stream_id: streamId,
        p_gift_id: giftId,
        p_amount_inr: gift.value,
        p_astrologer_id: astrologerId ?? null,
      });
      if (error || !data) {
        Logger.warn('send_live_gift RPC failed', { error: error?.message });
        return false;
      }
      const ok = (data as { success?: boolean } | null)?.success === true;
      if (!ok) {
        Logger.warn('Gift payment failed', { streamId, giftId });
        return false;
      }
      Logger.info(`Gift ${gift.name} sent to stream ${streamId} by ${senderId}`);
      return true;
    } catch (error) {
      Logger.error('Error sending gift:', error);
      return false;
    }
  },

  async sendMessage(_streamId: string, message: Omit<LiveStreamMessage, 'id' | 'timestamp'>): Promise<LiveStreamMessage | null> {
    try {
      const newMessage: LiveStreamMessage = {
        ...message,
        id: prefixedSecureId('msg', 12),
        timestamp: new Date(),
      };
      Logger.info('Message sent:', newMessage);
      return newMessage;
    } catch (error) {
      Logger.error('Error sending message:', error);
      return null;
    }
  },

  async getMessages(_streamId: string): Promise<LiveStreamMessage[]> {
    return [];
  },

  async startRecording(streamId: string): Promise<boolean> {
    Logger.info('Started recording: ' + streamId);
    return true;
  },

  async stopRecording(streamId: string): Promise<string | null> {
    return `https://recordings.astronemi.app/${streamId}.mp4`;
  },

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  },

  formatViewerCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  },

  async isSupported(): Promise<boolean> {
    return true;
  },
};

export default LiveStreamingService;