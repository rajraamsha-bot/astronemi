import { getPersistentDeviceId } from '../../utils/device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when_unlocked_this_device_only',
}));

describe('getPersistentDeviceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing device ID from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('device_existing_12345');
    const id = await getPersistentDeviceId();
    expect(id).toBe('device_existing_12345');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('astro_device_id');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('should generate, save, and return new device ID if none exists', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    const id = await getPersistentDeviceId();
    expect(id).toMatch(/^device_[A-Za-z0-9_-]+$/);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'astro_device_id',
      id,
      { keychainAccessible: 'when_unlocked_this_device_only' }
    );
  });

  it('should fallback to generated ID on SecureStore error', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('SecureStore failed'));
    Platform.OS = 'ios';
    const id = await getPersistentDeviceId();
    expect(id).toMatch(/^fallback-ios_[A-Za-z0-9_-]+$/);
  });
});
