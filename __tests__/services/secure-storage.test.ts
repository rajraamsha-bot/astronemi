/**
 * Secure Storage Service Tests
 *
 * Tests expo-secure-store integration, platform-specific behavior,
 * and error handling.
 */

const { secureStorage } = jest.requireActual('../../services/secure-storage');
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('SecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockPlatform.OS = 'ios';
  });

  describe('setItem', () => {
    it('should store using SecureStore on native platforms', async () => {
      global.mockPlatform.OS = 'ios';
      await secureStorage.setItem('test_key', 'test_value');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'astrofusion_ios_test_key',
        'test_value'
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should fallback to AsyncStorage on web', async () => {
      global.mockPlatform.OS = 'web';
      await secureStorage.setItem('test_key', 'test_value');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'astrofusion_web_test_key',
        'test_value'
      );
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should throw and log error on storage failure', async () => {
      global.mockPlatform.OS = 'ios';
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
      await expect(secureStorage.setItem('key', 'value')).rejects.toThrow('Storage full');
    });
  });

  describe('getItem', () => {
    it('should retrieve from SecureStore on native', async () => {
      global.mockPlatform.OS = 'android';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored_value');
      const result = await secureStorage.getItem('test_key');
      expect(result).toBe('stored_value');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('astrofusion_android_test_key');
    });

    it('should return null when key not found', async () => {
      global.mockPlatform.OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const result = await secureStorage.getItem('missing_key');
      expect(result).toBeNull();
    });

    it('should fallback to AsyncStorage on web', async () => {
      global.mockPlatform.OS = 'web';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('web_value');
      const result = await secureStorage.getItem('test_key');
      expect(result).toBe('web_value');
    });
  });

  describe('removeItem', () => {
    it('should delete from SecureStore on native', async () => {
      global.mockPlatform.OS = 'ios';
      await secureStorage.removeItem('test_key');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('astrofusion_ios_test_key');
    });

    it('should delete from AsyncStorage on web', async () => {
      global.mockPlatform.OS = 'web';
      await secureStorage.removeItem('test_key');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('astrofusion_web_test_key');
    });
  });

  describe('clear', () => {
    it('should clear all app-specific AsyncStorage keys', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        'astrofusion_ios_user',
        'astrofusion_android_session',
        'other_app_key',
        'astrofusion_web_data',
      ]);
      await secureStorage.clear();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'astrofusion_ios_user',
        'astrofusion_android_session',
        'astrofusion_web_data',
      ]);
    });
  });
});
