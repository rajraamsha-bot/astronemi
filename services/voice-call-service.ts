/**
 * Voice Call Service
 * 
 * Handles voice calls between users and astrologers using:
 * - Twilio Programmable Voice
 * - Vonage (formerly Nexmo) Voice API
 * - In-app VoIP calling
 * 
 * Features:
 * - One-on-one voice consultations
 * - Call recording
 * - Call duration tracking
 * - Call quality monitoring
 * - Call history
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Lazy-load Sentry to avoid crash if not installed
let Sentry: { addBreadcrumb: (crumb: Record<string, unknown>) => void } | null = null;
try {
  Sentry = require('@sentry/react-native');
} catch {
  // Sentry not available — breadcrumbs will be no-ops
}
import { Logger } from '@/services/logger';
import { prefixedSecureId } from '../utils/secure-random';

// Conditional imports for voice libraries
let TwilioVoice: any = null;
let VonageVoice: any = null;

try {
  TwilioVoice = require('react-native-twilio-programmable-voice');
} catch (e) {
  Logger.info('react-native-twilio-programmable-voice not installed');
}

try {
  VonageVoice = require('react-native-nexmo');
} catch (e) {
  Logger.info('react-native-nexmo not installed');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceCallConfig {
  provider: 'twilio' | 'vonage' | 'in-app';
  accessToken?: string;
  deviceToken?: string;
}

export interface VoiceCallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
  receiverId: string;
  receiverName: string;
  receiverImage?: string;
  astrologerId: string;
  astrologerName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  status: 'initiated' | 'ringing' | 'connected' | 'completed' | 'missed' | 'failed';
  rate: number; // per minute
  totalAmount: number;
  recordingUrl?: string;
  callSid?: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface VoiceCallStats {
  totalCalls: number;
  totalDuration: number; // seconds
  totalSpent: number;
  averageDuration: number;
  averageRating: number;
}

export interface CallInvite {
  from: string;
  fromName: string;
  fromImage?: string;
  callSid: string;
  timestamp: Date;
}

export interface VoiceCallRates {
  astrologerId: string;
  astrologerName: string;
  perMinuteRate: number;
  currency: string;
  minDuration: number; // minimum call duration in minutes
  freeMinutes?: number; // free minutes for first-time callers
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Use environment variables for backend URLs - these should be configured in .env
// EXPO_PUBLIC_API_URL should be set to your backend API endpoint
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const TWILIO_ACCESS_TOKEN_URL = API_BASE_URL ? `${API_BASE_URL}/twilio/token` : '';
const VONAGE_ACCESS_TOKEN_URL = API_BASE_URL ? `${API_BASE_URL}/vonage/token` : '';

const CALL_HISTORY_KEY = '@voice_call_history';
// const CALL_RATES_KEY = '@voice_call_rates';

// ─── Voice Call Service ───────────────────────────────────────────────────────

export const VoiceCallService = {
  // ─── Configuration ──────────────────────────────────────────────────────────

  config: {
    provider: 'twilio' as 'twilio' | 'vonage' | 'in-app',
    accessToken: '',
    deviceToken: '',
  } as VoiceCallConfig,

  currentCall: null as VoiceCallSession | null,
  callStartTime: null as Date | null,

  /**
   * Initialize voice call service
   */
  async initialize(config: VoiceCallConfig): Promise<boolean> {
    try {
      Sentry?.addBreadcrumb({
        category: 'voice',
        message: `Initializing voice service with provider: ${config.provider}`,
        level: 'info',
      });
      this.config = config;

      switch (config.provider) {
        case 'twilio':
          return await this.initializeTwilio(config.accessToken);
        case 'vonage':
          return await this.initializeVonage(config.accessToken);
        case 'in-app':
          return await this.initializeInApp();
        default:
          return false;
      }
    } catch (error) {
      Logger.error('Error initializing voice call service:', error);
      return false;
    }
  },

  // ─── Twilio Integration ─────────────────────────────────────────────────────

  /**
   * Initialize Twilio Voice
   */
  async initializeTwilio(accessToken?: string): Promise<boolean> {
    try {
      if (!TwilioVoice) {
        Logger.info('Twilio Voice SDK not installed');
        return false;
      }

      // Get access token from server if not provided
      const token = accessToken || await this.getTwilioAccessToken();

      if (!token) {
        Logger.error('No Twilio access token available');
        return false;
      }

      // Initialize Twilio Voice
      await TwilioVoice.init(token);

      // Set up event listeners
      this.setupTwilioEventListeners();

      Logger.info('Twilio Voice initialized');
      return true;
    } catch (error) {
      Logger.error('Error initializing Twilio:', error);
      return false;
    }
  },

  /**
   * Get Twilio access token from server
   */
  async getTwilioAccessToken(): Promise<string | null> {
    try {
      const response = await fetch(TWILIO_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceToken: this.config.deviceToken,
          platform: Platform.OS,
        }),
      });

      const data = await response.json();
      return data.token || null;
    } catch (error) {
      Logger.error('Error getting Twilio token:', error);
      return null;
    }
  },

  /**
   * Set up Twilio event listeners
   */
  setupTwilioEventListeners(): void {
    if (!TwilioVoice) return;

    // Call connected
    TwilioVoice.addEventListener('deviceReady', () => {
      Logger.info('Twilio device ready');
    });

    // Call received
    TwilioVoice.addEventListener('callInvite', (callInvite: unknown) => {
      Logger.info('Incoming call:', callInvite);
      this.handleIncomingCall(callInvite as Record<string, unknown>);
    });

    // Call connected
    TwilioVoice.addEventListener('callConnected', (call: unknown) => {
      Logger.info('Call connected:', call);
      this.handleCallConnected(call as Record<string, unknown>);
    });

    // Call ended
    TwilioVoice.addEventListener('callDisconnected', (call: unknown) => {
      Logger.info('Call ended:', call);
      this.handleCallEnded(call as Record<string, unknown>);
    });

    // Call error
    TwilioVoice.addEventListener('callError', (error: unknown) => {
      Logger.error('Call error:', error);
      this.handleCallError(error as Record<string, unknown>);
    });
  },

  // ─── Vonage Integration ─────────────────────────────────────────────────────

  /**
   * Initialize Vonage Voice
   */
  async initializeVonage(accessToken?: string): Promise<boolean> {
    try {
      if (!VonageVoice) {
        Logger.info('Vonage Voice SDK not installed');
        return false;
      }

      // Get access token from server if not provided
      const token = accessToken || await this.getVonageAccessToken();

      if (!token) {
        Logger.error('No Vonage access token available');
        return false;
      }

      // Initialize Vonage Voice
      await VonageVoice.init(token);

      // Set up event listeners
      this.setupVonageEventListeners();

      Logger.info('Vonage Voice initialized');
      return true;
    } catch (error) {
      Logger.error('Error initializing Vonage:', error);
      return false;
    }
  },

  /**
   * Get Vonage access token from server
   */
  async getVonageAccessToken(): Promise<string | null> {
    try {
      const response = await fetch(VONAGE_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceToken: this.config.deviceToken,
          platform: Platform.OS,
        }),
      });

      const data = await response.json();
      return data.token || null;
    } catch (error) {
      Logger.error('Error getting Vonage token:', error);
      return null;
    }
  },

  /**
   * Set up Vonage event listeners
   */
  setupVonageEventListeners(): void {
    if (!VonageVoice) return;

    VonageVoice.on('incomingCall', (call: unknown) => {
      Logger.info('Incoming call:', call);
      this.handleIncomingCall(call as Record<string, unknown>);
    });

    VonageVoice.on('callConnected', (call: unknown) => {
      Logger.info('Call connected:', call);
      this.handleCallConnected(call as Record<string, unknown>);
    });

    VonageVoice.on('callEnded', (call: unknown) => {
      Logger.info('Call ended:', call);
      this.handleCallEnded(call as Record<string, unknown>);
    });

    VonageVoice.on('callError', (error: unknown) => {
      Logger.error('Call error:', error);
      this.handleCallError(error as Record<string, unknown>);
    });
  },

  // ─── In-App VoIP ─────────────────────────────────────────────────────────────

  /**
   * Initialize in-app VoIP calling
   */
  async initializeInApp(): Promise<boolean> {
    try {
      // This would use WebRTC or similar for in-app calling
      Logger.info('In-app VoIP initialized');
      return true;
    } catch (error) {
      Logger.error('Error initializing in-app VoIP:', error);
      return false;
    }
  },

  // ─── Call Operations ─────────────────────────────────────────────────────────

  /**
   * Make a voice call to astrologer
   */
  async makeCall(astrologerId: string, astrologerName: string, rate: number): Promise<VoiceCallSession | null> {
    try {
      // Fail fast when the configured provider's native SDK is missing.
      // Previously a session was created and returned as if the call had
      // been placed even though no telephony module was linked.
      if (
        (this.config.provider === 'twilio' && !TwilioVoice) ||
        (this.config.provider === 'vonage' && !VonageVoice)
      ) {
        Logger.error(`Voice provider '${this.config.provider}' SDK not installed — cannot place call`);
        return null;
      }

      // Bail out cleanly when there's no authenticated user. Previously an
      // auth hiccup crashed this whole call, and the literal 'unknown' could
      // end up billed as a caller ID.
      const { supabase } = await import('@/lib/supabase');
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        Logger.error('Cannot initiate voice call — no authenticated user');
        return null;
      }
      const resolvedUserId = authData.user.id;
      const callId = prefixedSecureId('call', 12);

      // Create call session
      const session: VoiceCallSession = {
        id: callId,
        callerId: resolvedUserId,
        callerName: 'User',
        receiverId: astrologerId,
        receiverName: astrologerName,
        astrologerId,
        astrologerName,
        startTime: new Date(),
        duration: 0,
        status: 'initiated',
        rate,
        totalAmount: 0,
        quality: 'good',
      };

      this.currentCall = session;

      Sentry?.addBreadcrumb({
        category: 'voice',
        message: `Making call to astrologer: ${astrologerId}`,
        data: { name: astrologerName, rate },
        level: 'info',
      });

      // Make call based on provider
      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.connect({
            To: astrologerId,
            From: resolvedUserId,
          });
          break;
        case 'vonage':
          await VonageVoice?.call(astrologerId);
          break;
        case 'in-app':
          // Handle in-app calling
          break;
      }

      return session;
    } catch (error) {
      Logger.error('Error making call:', error);
      return null;
    }
  },

  /**
   * Answer incoming call
   */
  async answerCall(callSid: string): Promise<boolean> {
    try {
      Sentry?.addBreadcrumb({
        category: 'voice',
        message: `Answering call: ${callSid}`,
        level: 'info',
      });

      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.answer();
          break;
        case 'vonage':
          await VonageVoice?.answer(callSid);
          break;
        case 'in-app':
          // Handle in-app answer
          break;
      }

      if (this.currentCall) {
        this.currentCall.status = 'connected';
        this.callStartTime = new Date();
      }

      return true;
    } catch (error) {
      Logger.error('Error answering call:', error);
      return false;
    }
  },

  /**
   * Reject incoming call
   */
  async rejectCall(callSid: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.reject();
          break;
        case 'vonage':
          await VonageVoice?.reject(callSid);
          break;
        case 'in-app':
          // Handle in-app reject
          break;
      }

      return true;
    } catch (error) {
      Logger.error('Error rejecting call:', error);
      return false;
    }
  },

  /**
   * End current call
   */
  async endCall(): Promise<VoiceCallSession | null> {
    try {
      if (!this.currentCall) {
        return null;
      }

      Sentry?.addBreadcrumb({
        category: 'voice',
        message: 'Ending current call',
        data: { duration: this.currentCall?.duration },
        level: 'info',
      });

      // End call based on provider
      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.disconnect();
          break;
        case 'vonage':
          await VonageVoice?.hangup();
          break;
        case 'in-app':
          // Handle in-app hangup
          break;
      }

      // Calculate duration and amount
      if (this.callStartTime) {
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - this.callStartTime.getTime()) / 1000);
        
        this.currentCall.endTime = endTime;
        this.currentCall.duration = duration;
        this.currentCall.totalAmount = Math.ceil(duration / 60) * this.currentCall.rate;
        this.currentCall.status = 'completed';
      }

      // Save to history
      await this.saveCallToHistory(this.currentCall);

      const completedCall = { ...this.currentCall };
      this.currentCall = null;
      this.callStartTime = null;

      return completedCall;
    } catch (error) {
      Logger.error('Error ending call:', error);
      return null;
    }
  },

  /**
   * Toggle mute
   */
  async toggleMute(muted: boolean): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.setMuted(muted);
          break;
        case 'vonage':
          await VonageVoice?.setMute(muted);
          break;
        case 'in-app':
          // Handle in-app mute
          break;
      }
    } catch (error) {
      Logger.error('Error toggling mute:', error);
    }
  },

  /**
   * Toggle speaker
   */
  async toggleSpeaker(speaker: boolean): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.setSpeakerPhone(speaker);
          break;
        case 'vonage':
          await VonageVoice?.setSpeaker(speaker);
          break;
        case 'in-app':
          // Handle in-app speaker
          break;
      }
    } catch (error) {
      Logger.error('Error toggling speaker:', error);
    }
  },

  /**
   * Send DTMF digits
   */
  async sendDTMF(digits: string): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          await TwilioVoice?.sendDigits(digits);
          break;
        case 'vonage':
          await VonageVoice?.sendDTMF(digits);
          break;
        case 'in-app':
          // Handle in-app DTMF
          break;
      }
    } catch (error) {
      Logger.error('Error sending DTMF:', error);
    }
  },

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  /**
   * Handle incoming call
   */
  handleIncomingCall(callInvite: Record<string, unknown>): void {
    // This would trigger UI to show incoming call screen
    Logger.info('Incoming call from: ' + callInvite.from);

    // Emit event for UI to handle
    // EventEmitter.emit('incomingCall', callInvite);
  },

  /**
   * Handle call connected
   */
  handleCallConnected(call: Record<string, unknown>): void {
    if (this.currentCall) {
      this.currentCall.status = 'connected';
      this.currentCall.callSid = (call.callSid as string) || (call.sid as string);
    }
    this.callStartTime = new Date();

    Logger.info('Call connected at: ' + this.callStartTime);
  },

  /**
   * Handle call ended
   */
  handleCallEnded(_call: Record<string, unknown>): void {
    if (this.currentCall && this.callStartTime) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - this.callStartTime.getTime()) / 1000);
      
      this.currentCall.endTime = endTime;
      this.currentCall.duration = duration;
      this.currentCall.totalAmount = Math.ceil(duration / 60) * this.currentCall.rate;
      this.currentCall.status = 'completed';
      
      this.saveCallToHistory(this.currentCall);
    }
    
    this.currentCall = null;
    this.callStartTime = null;
  },

  /**
   * Handle call error
   */
  handleCallError(error: Record<string, unknown>): void {
    Sentry?.addBreadcrumb({
      category: 'voice',
      message: 'Call error encountered',
      data: { error },
      level: 'error',
    });
    Logger.error('Call error:', error);
    
    if (this.currentCall) {
      this.currentCall.status = 'failed';
      this.saveCallToHistory(this.currentCall);
    }
    
    this.currentCall = null;
    this.callStartTime = null;
  },

  // ─── Call History ────────────────────────────────────────────────────────────

  /**
   * Save call to history
   */
  async saveCallToHistory(call: VoiceCallSession): Promise<void> {
    try {
      const history = await this.getCallHistory();
      history.unshift(call);
      await AsyncStorage.setItem(CALL_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      Logger.error('Error saving call to history:', error);
    }
  },

  /**
   * Get call history
   */
  async getCallHistory(): Promise<VoiceCallSession[]> {
    try {
      const data = await AsyncStorage.getItem(CALL_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      Logger.error('Error getting call history:', error);
      return [];
    }
  },

  /**
   * Get call stats
   */
  async getCallStats(): Promise<VoiceCallStats> {
    try {
      const history = await this.getCallHistory();
      const completedCalls = history.filter(c => c.status === 'completed');
      
      const totalDuration = completedCalls.reduce((sum, c) => sum + c.duration, 0);
      const totalSpent = completedCalls.reduce((sum, c) => sum + c.totalAmount, 0);
      
      return {
        totalCalls: completedCalls.length,
        totalDuration,
        totalSpent,
        averageDuration: completedCalls.length > 0 ? totalDuration / completedCalls.length : 0,
        averageRating: 0, // Would calculate from ratings
      };
    } catch (error) {
      Logger.error('Error getting call stats:', error);
      return {
        totalCalls: 0,
        totalDuration: 0,
        totalSpent: 0,
        averageDuration: 0,
        averageRating: 0,
      };
    }
  },

  /**
   * Clear call history
   */
  async clearCallHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CALL_HISTORY_KEY);
    } catch (error) {
      Logger.error('Error clearing call history:', error);
    }
  },

  // ─── Call Rates ──────────────────────────────────────────────────────────────

  /**
   * Get call rates for astrologer
   */
  async getCallRates(astrologerId: string): Promise<VoiceCallRates | null> {
    try {
      // This would typically fetch from server
      // For now, return mock data
      return {
        astrologerId,
        astrologerName: 'Astrologer',
        perMinuteRate: 50,
        currency: 'INR',
        minDuration: 5,
        freeMinutes: 0,
      };
    } catch (error) {
      Logger.error('Error getting call rates:', error);
      return null;
    }
  },

  // ─── Recording ───────────────────────────────────────────────────────────────

  /**
   * Start call recording
   */
  async startRecording(callSid: string): Promise<boolean> {
    try {
      // This would typically be done via Twilio/Vonage API on server
      Logger.info('Started recording call: ' + callSid);
      return true;
    } catch (error) {
      Logger.error('Error starting recording:', error);
      return false;
    }
  },

  /**
   * Stop call recording
   */
  async stopRecording(callSid: string): Promise<string | null> {
    try {
      // This would typically be done via Twilio/Vonage API on server
      const recordingUrl = `https://recordings.astronemi.app/${callSid}.mp3`;
      return recordingUrl;
    } catch (error) {
      Logger.error('Error stopping recording:', error);
      return null;
    }
  },

  // ─── Utility Methods ─────────────────────────────────────────────────────────

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'INR'): string {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    });
    return formatter.format(amount);
  },

  /**
   * Check if voice call is available
   */
  async isAvailable(): Promise<boolean> {
    return TwilioVoice !== null || VonageVoice !== null;
  },

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    try {
      if (TwilioVoice) {
        TwilioVoice.removeEventListener('deviceReady');
        TwilioVoice.removeEventListener('callInvite');
        TwilioVoice.removeEventListener('callConnected');
        TwilioVoice.removeEventListener('callDisconnected');
        TwilioVoice.removeEventListener('callError');
      }

      this.currentCall = null;
      this.callStartTime = null;
    } catch (error) {
      Logger.error('Error destroying voice service:', error);
    }
  },
};

export default VoiceCallService;
