/**
 * VideoPlayer — thin wrapper around expo-video.
 *
 * Responsibilities:
 *   • Detect native-playable URLs (.mp4, HLS .m3u8) and play them inline.
 *   • Detect YouTube URLs and fall back to "Open on YouTube" since
 *     embedding YouTube requires an in-app WebView integration that is
 *     against YouTube ToS for most apps.
 *   • Graceful error state if the source is not set yet.
 *
 * Consumers pass `source` (URL) and an optional `poster` for the preview
 * frame shown before the user taps play.
 */

import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExternalLink, Play } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Colors from '@/constants/colors';

export interface VideoPlayerProps {
  source: string | null | undefined;
  poster?: string | null;
  aspectRatio?: number; // width / height, default 16/9
  onExternalOpen?: () => void;
}

// URL is playable natively if it's MP4, HLS, or DASH — extend as needed.
const NATIVE_EXTENSIONS = /\.(mp4|m4v|mov|m3u8|mpd)(\?.*)?$/i;
const YOUTUBE_HOSTS = /(youtube\.com|youtu\.be)/i;

type PlayabilityKind = 'native' | 'youtube' | 'external' | 'none';

function classify(source: string | null | undefined): PlayabilityKind {
  if (!source) return 'none';
  if (YOUTUBE_HOSTS.test(source)) return 'youtube';
  if (NATIVE_EXTENSIONS.test(source)) return 'native';
  return 'external';
}

export function VideoPlayer({ source, poster, aspectRatio = 16 / 9, onExternalOpen }: VideoPlayerProps) {
  const kind = useMemo(() => classify(source), [source]);

  const player = useVideoPlayer(kind === 'native' && source ? source : null, playerInstance => {
    playerInstance.loop = false;
    playerInstance.muted = false;
  });

  if (kind === 'none') {
    return (
      <View style={[styles.placeholder, { aspectRatio }]}>
        <Text style={styles.placeholderText}>Video source not available</Text>
      </View>
    );
  }

  if (kind === 'native') {
    return (
      <View style={[styles.playerWrap, { aspectRatio }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      </View>
    );
  }

  // YouTube or other external URL — open in the system browser.
  const label = kind === 'youtube' ? 'Watch on YouTube' : 'Open video';
  const openExternal = () => {
    if (!source) return;
    onExternalOpen?.();
    Linking.openURL(source).catch(() => undefined);
  };

  return (
    <TouchableOpacity style={[styles.externalWrap, { aspectRatio }]} onPress={openExternal} accessibilityRole="button">
      {poster ? (
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        <View style={StyleSheet.absoluteFill}>
          <PosterImage uri={poster} />
        </View>
      ) : null}
      <View style={styles.externalOverlay}>
        <View style={styles.playBadge}>
          <Play color="#FFF" size={22} fill="#FFF" />
        </View>
        <View style={styles.externalLabel}>
          <Text style={styles.externalLabelText}>{label}</Text>
          <ExternalLink color="#FFF" size={12} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PosterImage({ uri }: { uri: string }) {
  // Deliberately not using expo-image to avoid pulling in a dependency
  // just for a static poster; standard Image is fine here.
  const { Image } = require('react-native');
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: Colors.textLight, fontSize: 13 },
  playerWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  externalWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  externalOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 12,
  },
  playBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(220, 20, 60, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  externalLabelText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});

export default VideoPlayer;
