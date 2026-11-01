import secureStorage, {
  secureSetItem,
  secureGetItem,
  secureRemoveItem,
  clearSecureStorage,
  migrateToSecureStorage,
} from '../../utils/secure-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

describe('Secure Storage Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store sensitive key in SecureStore if available', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);
      await secureSetItem('auth_token', 'token123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'token123', expect.any(Object));
    });

    it('should store non-sensitive key in AsyncStorage', async () => {
      await secureSetItem('theme_pref', 'dark');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme_pref', 'dark');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should fallback to AsyncStorage on SecureStore error', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));
      await secureSetItem('auth_token', 'token123');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'token123');
    });
  });

  describe('getItem', () => {
    it('should get sensitive key from SecureStore if available', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('token123');
      const val = await secureGetItem('auth_token');
      expect(val).toBe('token123');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    });

    it('should fallback to AsyncStorage if not in SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('fallback_token');
      const val = await secureGetItem('auth_token');
      expect(val).toBe('fallback_token');
    });
  });

  describe('removeItem', () => {
    it('should remove from both SecureStore and AsyncStorage', async () => {
      await secureRemoveItem('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('clearSecureStorage', () => {
    it('should clear all sensitive keys from both stores', async () => {
      await clearSecureStorage();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(5);
    });
  });

  describe('migrateToSecureStorage', () => {
    it('should migrate sensitive data from AsyncStorage to SecureStore', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('migrated_user'); // user
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // auth_token
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // wallet_data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // session
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // push_token

      await migrateToSecureStorage();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user', 'migrated_user', expect.any(Object));
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('default export', () => {
    it('should expose all methods', () => {
      expect(secureStorage.setItem).toBe(secureSetItem);
      expect(secureStorage.getItem).toBe(secureGetItem);
      expect(secureStorage.removeItem).toBe(secureRemoveItem);
      expect(secureStorage.clearAll).toBe(clearSecureStorage);
      expect(secureStorage.migrate).toBe(migrateToSecureStorage);
    });
  });
});
