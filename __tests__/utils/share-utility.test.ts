import { shareViewAsImage, shareText } from '../../utils/share-utility';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file://cache/',
  moveAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('share-utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareViewAsImage', () => {
    const mockRef = { current: {} };

    it('should capture view and share via expo-sharing if available', async () => {
      (captureRef as jest.Mock).mockResolvedValueOnce('tmp_uri');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(true);

      await shareViewAsImage(mockRef, 'test_file');

      expect(captureRef).toHaveBeenCalledWith(mockRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      expect(FileSystem.moveAsync).toHaveBeenCalledWith({
        from: 'tmp_uri',
        to: expect.stringContaining('file://cache/test_file_'),
      });
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('file://cache/test_file_'),
        {
          mimeType: 'image/png',
          dialogTitle: 'Share your Cosmic Synergy',
          UTI: 'public.png',
        }
      );
    });

    it('should fallback to react-native Share if expo-sharing is unavailable', async () => {
      (captureRef as jest.Mock).mockResolvedValueOnce('tmp_uri');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

      await shareViewAsImage(mockRef, 'test_file');

      expect(Sharing.shareAsync).not.toHaveBeenCalled();
      expect(Share.share).toHaveBeenCalledWith({
        url: expect.stringContaining('file://cache/test_file_'),
        message: 'Check out my cosmic synergy on AstroNemi! 🌌',
      });
    });

    it('should catch and log error on failure', async () => {
      (captureRef as jest.Mock).mockRejectedValueOnce(new Error('Capture failed'));
      // Should not throw
      await expect(shareViewAsImage(mockRef)).resolves.not.toThrow();
    });
  });

  describe('shareText', () => {
    it('should share text via react-native Share', async () => {
      await shareText('Cosmic message');
      expect(Share.share).toHaveBeenCalledWith({
        message: 'Cosmic message',
      });
    });

    it('should catch and log error on failure', async () => {
      (Share.share as jest.Mock).mockRejectedValueOnce(new Error('Share failed'));
      await expect(shareText('Cosmic message')).resolves.not.toThrow();
    });
  });
});
