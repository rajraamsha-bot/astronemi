/* eslint-disable import/namespace */
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';
import { Logger } from '@/services/logger';

/**
 * Capture a view and share it as an image
 * @param viewRef React ref of the view to capture
 * @param fileName Desired filename (without extension)
 */
export async function shareViewAsImage(viewRef: React.RefObject<unknown>, fileName: string = 'AstroNemi_Chart') {
  try {
    // 1. Capture the view to a temporary URI
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 0.9,
      result: 'tmpfile',
    });

    // 2. Add Branding to filename or move it
    const fileUri = `${FileSystem.cacheDirectory}${fileName}_${Date.now()}.png`;
    await (FileSystem as unknown as { moveAsync: (options: { from: string; to: string }) => Promise<void> }).moveAsync({ from: uri, to: fileUri });

    // 3. Share
    if (!(await Sharing.isAvailableAsync())) {
      // Fallback for devices without native sharing
      await Share.share({
        url: fileUri,
        message: 'Check out my cosmic synergy on AstroNemi! 🌌',
      });
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your Cosmic Synergy',
      UTI: 'public.png',
    });

  } catch (error) {
    Logger.error('Error sharing view:', error);
  }
}

/**
 * Text-only sharing fallback
 */
export async function shareText(message: string) {
  try {
    await Share.share({
      message,
    });
  } catch (error) {
    Logger.error('Error sharing text:', error);
  }
}
