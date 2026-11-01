import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MessageCircle,
  Heart,
  Send,
  Users,
  Gift,
  Share2,
  MoreVertical,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Star,
  Circle,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import { LiveStreamingService, LiveStreamSession, LiveStreamMessage } from '@/services/live-streaming-service';
import { Logger } from '@/services/logger';
import { secureRandomIndex, secureRandomBool, prefixedSecureId } from '@/utils/secure-random';

const { height } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  message: string;
  timestamp: Date;
  isHighlighted: boolean;
  isFromAstrologer: boolean;
}

interface StreamData {
  id: string;
  astrologerId: string;
  astrologerName: string;
  astrologerImage: string;
  title: string;
  topic: string;
  viewerCount: number;
  likeCount: number;
  isLive: boolean;
  startedAt: Date;
}

function mapSessionToStreamData(session: LiveStreamSession): StreamData {
  return {
    id: session.id,
    astrologerId: session.astrologerId,
    astrologerName: session.astrologerName,
    astrologerImage: session.astrologerImage || 'https://via.placeholder.com/40',
    title: session.title,
    topic: session.description || 'Live Session',
    viewerCount: session.viewerCount,
    likeCount: session.likeCount,
    isLive: session.status === 'live',
    startedAt: session.startTime,
  };
}

function mapMessagesToChatMessages(msgs: LiveStreamMessage[]): ChatMessage[] {
  return msgs.map((m) => ({
    id: m.id,
    userId: m.senderId,
    userName: m.senderName,
    userImage: m.senderImage || 'https://via.placeholder.com/32',
    message: m.message,
    timestamp: m.timestamp,
    isHighlighted: m.type === 'system',
    isFromAstrologer: m.type === 'system',
  }));
}

export default function LiveStreamViewerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load real stream data
  useEffect(() => {
    const loadStream = async () => {
      if (!id) return;
      try {
        const data = await LiveStreamingService.getStreamById(id);
        if (data) {
          setStream(mapSessionToStreamData(data));
          const msgs = await LiveStreamingService.getMessages(id);
          setMessages(mapMessagesToChatMessages(msgs || []));
        }
      } catch (err) {
        Logger.error('Failed to load stream', err);
      }
    };
    loadStream();
  }, [id]);

  // effect:audited — Simulation: Simulate receiving new messages in live stream
  // DEV-ONLY demo ticker. Gated behind __DEV__ so production never fabricates
  // fake viewers/messages. Interval is cleared on unmount.
  useEffect(() => {
    if (!__DEV__) return;
    const interval = setInterval(() => {
      const randomMessages = [
        { user: 'Sunita R.', msg: 'Very informative session!' },
        { user: 'Deepak M.', msg: 'Thank you for the guidance' },
        { user: 'Meera S.', msg: 'What about Gemini?' },
        { user: 'Ravi T.', msg: 'Great predictions!' },
      ];
      const random = randomMessages[secureRandomIndex(randomMessages.length)] ?? randomMessages[0];
      
      const newMsg: ChatMessage = {
        id: prefixedSecureId(String(Date.now()), 6),
        userId: `u${Date.now()}`,
        userName: random?.user ?? '',
        userImage: `https://randomuser.me/api/portraits/${secureRandomBool() ? 'men' : 'women'}/${secureRandomIndex(50)}.jpg`,
        message: random?.msg ?? '',
        timestamp: new Date(),
        isHighlighted: false,
        isFromAstrologer: false,
      };
      
      setMessages((prev) => [...prev, newMsg]);
      
      // Update viewer count randomly (clamped so it never drops below 0)
      setStream((prev) => {
        if (!prev) return prev;
        const delta = secureRandomBool() ? 1 : -1;
        return {
          ...prev,
          viewerCount: Math.max(0, prev.viewerCount + delta),
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: prefixedSecureId(String(Date.now()), 6),
      userId: 'me',
      userName: 'You',
      userImage: '',
      message: newMessage.trim(),
      timestamp: new Date(),
      isHighlighted: false,
      isFromAstrologer: false,
    };

    setMessages([...messages, message]);
    setNewMessage('');
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleLike = () => {
    if (!hasLiked) {
      setStream((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          likeCount: prev.likeCount + 1,
        };
      });
      setHasLiked(true);
    }
  };

  const formatDuration = (startDate: Date) => {
    const diff = Date.now() - startDate.getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isFromAstrologer && styles.astrologerMessage,
    ]}>
      <Image
        source={{ uri: item.userImage || 'https://via.placeholder.com/32' }}
        style={styles.messageAvatar}
      />
      <View style={styles.messageContent}>
        <Text style={[
          styles.messageUserName,
          item.isFromAstrologer && styles.astrologerName,
        ]}>
          {item.userName}
        </Text>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Coming Soon Banner */}
      <View style={{ position: 'absolute', top: 60, left: 0, right: 0, zIndex: 100, alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Live streaming coming soon!</Text>
        </View>
      </View>

      {/* Video Player Area */}
      <View style={styles.videoContainer}>
        <LinearGradient
          colors={['#000', '#1a1a1a']}
          style={styles.videoPlaceholder}
        >
          {/* Video would be rendered here in production */}
          <View style={styles.videoOverlay}>
            <View style={styles.liveIndicator}>
              <Circle color="#E91E63" size={10} fill="#E91E63" />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.durationText}>{stream ? formatDuration(stream.startedAt) : '00:00'}</Text>
          </View>

          {/* Stream Info Overlay */}
          <View style={styles.streamInfoOverlay}>
            <View style={styles.streamerInfo}>
              <Image
                source={{ uri: stream?.astrologerImage || 'https://via.placeholder.com/40' }}
                style={styles.streamerAvatar}
              />
              <View>
                <Text style={styles.streamerName}>{stream?.astrologerName || 'Astrologer'}</Text>
                <Text style={styles.streamTitle}>{stream?.title || 'Live Session'}</Text>
              </View>
            </View>
            <View style={styles.viewerInfo}>
              <Users color="#FFF" size={16} />
              <Text style={styles.viewerCount}>{stream?.viewerCount ?? 0}</Text>
            </View>
          </View>

          {/* Video Controls */}
          <View style={styles.videoControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX color="#FFF" size={24} />
              ) : (
                <Volume2 color="#FFF" size={24} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize color="#FFF" size={24} />
              ) : (
                <Maximize color="#FFF" size={24} />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart
            color={hasLiked ? '#E91E63' : Colors.text}
            size={24}
            fill={hasLiked ? '#E91E63' : 'transparent'}
          />
          <Text style={styles.actionText}>{stream?.likeCount ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Gift color={Colors.text} size={24} />
          <Text style={styles.actionText}>Gift</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Share2 color={Colors.text} size={24} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowChat(!showChat)}
        >
          <MessageCircle
            color={showChat ? Colors.primary : Colors.text}
            size={24}
            fill={showChat ? Colors.primary : 'transparent'}
          />
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Star color={Colors.text} size={24} />
          <Text style={styles.actionText}>Follow</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Section */}
      {showChat && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatSection}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Live Chat</Text>
            <TouchableOpacity>
              <MoreVertical color={Colors.textLight} size={20} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Send a message..."
              placeholderTextColor={Colors.textLight}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Send color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft color="#FFF" size={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  videoContainer: {
    height: height * 0.35,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 50,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E63',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  durationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streamInfoOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  streamerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streamerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  streamerName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  streamTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  viewerCount: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  videoControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    padding: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  chatSection: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  astrologerMessage: {
    backgroundColor: '#F3E5F5',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  messageContent: {
    flex: 1,
  },
  messageUserName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  astrologerName: {
    color: '#9C27B0',
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
