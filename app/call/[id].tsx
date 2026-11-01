import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, MessageCircle, Clock, ArrowLeft, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { VoiceCallService } from '@/services/voice-call-service';
import { agoraCall, getRtcSurfaceView } from '@/services/agora-call-service';
import { getConsultation, getAstrologer, getMyAstrologerProfile, closeConsultation, endConsultation, type Astrologer as ChatAstrologer } from '@/services/chat';
import { debitConsultationMinute } from '@/services/wallet';
import * as Haptics from 'expo-haptics';

const RtcSurfaceView = getRtcSurfaceView();

export default function CallScreen() {
  // [id] is the CONSULTATION id. `type` accepts audio|call (voice) or video.
  // `as` distinguishes the user (default, billed) from the astrologer (not billed).
  const { id: consultationId, type } = useLocalSearchParams<{ id: string; type: 'audio' | 'call' | 'video' }>();
  const isVideo = type === 'video';
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isAstrologerView, setIsAstrologerView] = useState(false);
  const [astrologer, setAstrologer] = useState<ChatAstrologer | null>(null);

  // Redirect to login if not authenticated — call screen requires a valid user
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);


  // connecting: resolving session; ringing: waiting for human to accept;
  // active: in call; ended: finished.
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideo);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [mediaJoined, setMediaJoined] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const endedRef = useRef(false);
  const endingRef = useRef(false);
  const nextBillingMinuteRef = useRef(1);
  const billingInFlightRef = useRef(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load consultation + astrologer + wallet balance. Provider status is
  // derived from the authenticated user's own astrologer profile; the URL
  // cannot opt a normal user out of billing.
  useEffect(() => {
    const loadCallData = async () => {
      if (!consultationId || !user) return;

      try {
        const con = await getConsultation(consultationId);
        if (!con) {
          Logger.error('Consultation not found for call', consultationId);
          return;
        }

        const [astro, walletRes, myProfile] = await Promise.all([
          getAstrologer(con.astrologerId),
          supabase.from('users').select('wallet_balance').eq('id', user.id).single(),
          getMyAstrologerProfile(user.id),
        ]);

        if (!astro) {
          Logger.error('Astrologer not found for call', con.astrologerId);
          return;
        }
        setAstrologer(astro);

        const authenticatedProvider = myProfile?.id === con.astrologerId;
        setIsAstrologerView(authenticatedProvider);

        const minBalance = astro.pricePerMinute || 20;
        const currentBalance = walletRes.data?.wallet_balance || 0;
        if (!authenticatedProvider && currentBalance < minBalance) {
          Alert.alert(
            'Insufficient Balance',
            `You need at least ₹${minBalance} to start a call. Please recharge your wallet.`,
            [{ text: 'Go to Wallet', onPress: () => router.replace('/wallet') }, { text: 'Back', onPress: () => router.back() }]
          );
          return;
        }

        // AI personas don't take calls; an active consultation means connected.
        if (['completed', 'cancelled', 'declined', 'refunded'].includes(con.status)) {
          setCallState('ended');
        } else {
          setCallState(con.status === 'active' ? 'active' : 'ringing');
        }
      } catch (err) {
        Logger.error('Failed to load call data', err);
      }
    };

    loadCallData();
  }, [consultationId, user]);
  // Fade in on mount.
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Cancel the pending auto-exit when unmounting.
  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  // Poll consultation status: ringing -> active when the astrologer accepts,
  // or ended if they decline/close. (Real flow, not a simulated timer.)
  useEffect(() => {
    if (callState !== 'ringing' || !consultationId) return;
    const poll = setInterval(async () => {
      const con = await getConsultation(consultationId);
      if (!con) return;
      if (con.status === 'active') {
        // We're back from an ended/aborted state — cancel any pending exit.
        endedRef.current = false;
        if (navTimeoutRef.current) { clearTimeout(navTimeoutRef.current); navTimeoutRef.current = null; }
        setCallState('active');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        clearInterval(poll);
      } else if (['cancelled', 'completed', 'declined', 'refunded'].includes(con.status)) {
        setCallState('ended');
        clearInterval(poll);
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [callState, consultationId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = useCallback(async () => {
    if (endedRef.current || endingRef.current) return false;
    endingRef.current = true;

    try {
      await VoiceCallService.endCall();
      if (consultationId) {
        const closed = isAstrologerView
          ? await closeConsultation(consultationId)
          : await endConsultation(consultationId);
        if (!closed) {
          Alert.alert('Unable to end call', 'The consultation is still active. Please try again.');
          return false;
        }
      }

      endedRef.current = true;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      setCallState('ended');
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = setTimeout(() => router.back(), 2000);
      return true;
    } catch (err) {
      Logger.error('Failed to end call', err);
      Alert.alert('Unable to end call', 'The consultation is still active. Please try again.');
      return false;
    } finally {
      endingRef.current = false;
    }
  }, [consultationId, isAstrologerView]);

  // Ringing pulse animation.
  useEffect(() => {
    if (callState === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [callState, pulseAnim]);

  // Duration ticker + per-minute server-authoritative billing while active.
  useEffect(() => {
    if (callState !== 'active' || !astrologer || !user || !consultationId) return;

    const rate = astrologer.pricePerMinute || 20;
    const durationTicker = setInterval(() => setDuration(d => d + 1), 1000);

    // The authenticated provider is not billed. This decision comes from the
    // consultation/profile binding resolved during load, not the URL.
    if (isAstrologerView) {
      return () => clearInterval(durationTicker);
    }

    let billingStopped = false;
    let billingInterval: ReturnType<typeof setInterval> | null = null;

    const billMinute = async () => {
      if (billingStopped || billingInFlightRef.current) return;
      const nextMinute = nextBillingMinuteRef.current;
      billingInFlightRef.current = true;
      try {
        const result = await debitConsultationMinute(
          user.id,
          consultationId,
          nextMinute,
          'call',
        );
        if (!result.success) {
          billingStopped = true;
          if (billingInterval) clearInterval(billingInterval);
          const ended = await handleEndCall();
          if (ended) {
            Alert.alert('Call Ended', result.message || 'Payment could not be processed.');
          }
          return;
        }

        if (nextBillingMinuteRef.current === nextMinute) {
          nextBillingMinuteRef.current = nextMinute + 1;
        }
        setTotalCost(t => t + rate);
      } catch (err) {
        Logger.error('Call billing error', err);
        billingStopped = true;
        if (billingInterval) clearInterval(billingInterval);
        await handleEndCall();
      } finally {
        billingInFlightRef.current = false;
      }
    };

    billMinute();
    billingInterval = setInterval(billMinute, 60000);

    return () => {
      billingStopped = true;
      clearInterval(durationTicker);
      if (billingInterval) clearInterval(billingInterval);
    };
  }, [callState, astrologer, user, isVideo, consultationId, isAstrologerView, handleEndCall]);

  // ── Agora media: join the channel when the call goes active, leave on end ──
  useEffect(() => {
    if (callState !== 'active' || !consultationId || !astrologer) return;
    if (!agoraCall.isAvailable()) {
      // Native module unavailable (web / Expo Go): signaling + billing still
      // work, but there is no live media stream on this platform.
      Logger.info('Agora unavailable — call runs without live media on this platform');
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await agoraCall.join({
        channelName: consultationId,
        astrologerId: astrologer.id,
        video: isVideo,
        callbacks: {
          onJoinSuccess: () => { if (!cancelled) setMediaJoined(true); },
          onRemoteJoined: (uid) => { if (!cancelled) setRemoteUid(uid); },
          onRemoteLeft: () => { if (!cancelled) setRemoteUid(null); },
          onTokenWillExpire: () => { agoraCall.renewToken(consultationId, astrologer.id); },
          onError: (msg) => { Logger.error('Agora call error', { msg }); },
        },
      });
      if (!res.success && !cancelled) {
        Alert.alert('Call media error', res.message || 'Could not connect audio/video.');
      }
    })();

    return () => {
      cancelled = true;
      agoraCall.leave();
      setMediaJoined(false);
      setRemoteUid(null);
    };
  }, [callState, consultationId, astrologer, isVideo]);

  if (!astrologer) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={{ color: Colors.white }}>Astrologer not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {isVideo && isVideoOn && callState === 'active' && RtcSurfaceView ? (
          <>
            {/* Remote astrologer video full-screen (falls back to avatar until they join) */}
            {remoteUid !== null ? (
              <RtcSurfaceView
                style={styles.videoBackground}
                canvas={{ uid: remoteUid }}
              />
            ) : (
              <Image
                source={{ uri: astrologer.avatarUrl || '' }}
                style={styles.videoBackground}
                contentFit="cover"
              />
            )}
            {/* Local preview (uid 0 = self) */}
            {mediaJoined && (
              <View style={styles.localPreview}>
                <RtcSurfaceView style={styles.localPreviewInner} canvas={{ uid: 0 }} />
              </View>
            )}
          </>
        ) : (
          isVideo && isVideoOn && callState === 'active' && (
            <Image
              source={{ uri: astrologer.avatarUrl || '' }}
              style={styles.videoBackground}
              blurRadius={0}
              contentFit="cover"
            />
          )
        )}
        
        <View style={[styles.overlay, type === 'video' && isVideoOn && styles.videoOverlay]}>
          <View style={[styles.safeArea, { paddingTop: insets.top + 70 }]}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              <View style={styles.topSection}>
                <TouchableOpacity 
                   onPress={() => handleEndCall()}
                  style={styles.headerBackButton}
                >
                  <ArrowLeft size={24} color={Colors.white} />
                </TouchableOpacity>
                
                <View style={styles.headerProfile}>
                  <View style={styles.headerImageContainer}>
                    <Image source={{ uri: astrologer.avatarUrl || '' }} style={styles.headerImage} contentFit="cover" />
                    <View style={[styles.headerOnlineDot, { backgroundColor: astrologer.isOnline ? Colors.success : Colors.error }]} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerName}>{astrologer.name}</Text>
                    {callState === 'active' ? (
                      <View style={styles.callStats}>
                        <Clock size={12} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.statsText}>{formatDuration(duration)}</Text>
                        <Text style={styles.statsDivider}>|</Text>
                        <Text style={styles.statsText}>₹{totalCost}</Text>
                      </View>
                    ) : (
                      <Text style={styles.headerStatus}>
                        {callState === 'ringing' ? 'Ringing...' : 'Calling...'}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ width: 40 }} /> 
              </View>

              <View style={styles.centerSection}>
                <Animated.View style={[
                  styles.avatarContainer,
                  callState === 'ringing' && { transform: [{ scale: pulseAnim }] }
                ]}>
                  <Image source={{ uri: astrologer.avatarUrl || '' }} style={styles.avatar} contentFit="cover" />
                  <View style={[styles.avatarOnlineDot, { backgroundColor: astrologer.isOnline ? Colors.success : Colors.error }]} />
                  {callState === 'active' && (
                    <View style={styles.activeBadge}>
                      <View style={styles.activeDot} />
                    </View>
                  )}
                </Animated.View>

                <Text style={styles.name}>{astrologer.name}</Text>
                <Text style={styles.status}>
                  {callState === 'connecting' && 'Connecting...'}
                  {callState === 'ringing' && 'Ringing...'}
                  {callState === 'active' && (
                    agoraCall.isAvailable()
                      ? (remoteUid !== null
                          ? (isVideo ? 'Video Call' : 'Voice Call')
                          : 'Waiting for astrologer to join…')
                      : (isVideo ? 'Video Call' : 'Voice Call')
                  )}
                  {callState === 'ended' && 'Call Ended'}
                </Text>

                <View style={styles.rateContainer}>
                  <Text style={styles.rateText}>₹{astrologer.pricePerMinute}/min</Text>
                </View>

                {callState === 'ended' && (
                  <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Call Summary</Text>
                    <Text style={styles.summaryText}>Duration: {formatDuration(duration)}</Text>
                    <Text style={styles.summaryText}>Total Cost: ₹{totalCost}</Text>
                  </View>
                )}
              </View>

              {callState !== 'ended' && (
                <View style={styles.controlsSection}>
                  <View style={styles.controlsRow}>
                    <TouchableOpacity 
                      style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                      onPress={() => { const next = !isMuted; setIsMuted(next); agoraCall.setMuted(next); }}
                    >
                      {isMuted ? (
                        <MicOff size={24} color={isMuted ? Colors.text : Colors.white} />
                      ) : (
                        <Mic size={24} color={Colors.white} />
                      )}
                      <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
                        {isMuted ? 'Unmute' : 'Mute'}
                      </Text>
                    </TouchableOpacity>

                    {type === 'video' && (
                      <TouchableOpacity 
                        style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
                        onPress={() => { const next = !isVideoOn; setIsVideoOn(next); agoraCall.setVideoEnabled(next); }}
                      >
                        {isVideoOn ? (
                          <Video size={24} color={Colors.white} />
                        ) : (
                          <VideoOff size={24} color={Colors.text} />
                        )}
                        <Text style={[styles.controlLabel, !isVideoOn && styles.controlLabelActive]}>
                          {isVideoOn ? 'Video' : 'Video Off'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                      onPress={() => { const next = !isSpeakerOn; setIsSpeakerOn(next); agoraCall.setSpeaker(next); }}
                    >
                      <Volume2 size={24} color={isSpeakerOn ? Colors.text : Colors.white} />
                      <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
                        Speaker
                      </Text>
                    </TouchableOpacity>

                    {type === 'video' && isVideoOn && (
                      <TouchableOpacity 
                        style={styles.controlButton}
                        onPress={() => agoraCall.switchCamera()}
                      >
                        <RefreshCw size={24} color={Colors.white} />
                        <Text style={styles.controlLabel}>Flip</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() => router.push(`/chat/${consultationId}`)}
                    >
                      <MessageCircle size={24} color={Colors.white} />
                      <Text style={styles.controlLabel}>Chat</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
                    <PhoneOff size={28} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              )}

              {callState === 'ended' && (
                <TouchableOpacity 
                  style={styles.finalBackButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.finalBackButtonText}>Go Back</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  localPreview: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    zIndex: 20,
  },
  localPreviewInner: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.darkBg,
  },
  videoOverlay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerImageContainer: {
    position: 'relative',
  },
  headerImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.darkBg,
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  callStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  statsDivider: {
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
  },
  centerSection: {
    alignItems: 'center' as const,
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  avatarOnlineDot: {
    position: 'absolute' as const,
    right: 10,
    bottom: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: Colors.darkBg,
  },
  activeBadge: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  name: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
    marginTop: 24,
  },
  status: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  rateContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 16,
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 16,
    marginTop: 24,
    alignItems: 'center' as const,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  controlsSection: {
    alignItems: 'center' as const,
  },
  controlsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 20,
    marginBottom: 32,
  },
  controlButton: {
    alignItems: 'center' as const,
    width: 72,
  },
  controlButtonActive: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 8,
  },
  controlLabel: {
    fontSize: 12,
    color: Colors.white,
    marginTop: 6,
  },
  controlLabelActive: {
    color: Colors.text,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.error,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  finalBackButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'center' as const,
  },
  finalBackButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
