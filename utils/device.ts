import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { prefixedSecureId } from './secure-random';

const DEVICE_ID_KEY = 'astro_device_id';

/**
 * Gets a stable, persistent device identifier.
 *
 * Security: the ID is generated using a CSPRNG (expo-crypto) to make
 * device IDs unguessable, protecting the 2-device binding limit from
 * enumeration attacks. SecureStore is used to ensure persistence across
 * app reinstalls (iOS) and clear-data operations.
 */
export const getPersistentDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = prefixedSecureId('device', 16);
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }

    return deviceId;
  } catch (error) {
    // Fallback if SecureStore fails. Still uses CSPRNG.
    return prefixedSecureId(`fallback-${Platform.OS || 'unknown'}`);
  }
};
