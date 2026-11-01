/**
 * Secure Storage Service - Production Ready
 * 
 * Uses expo-secure-store for encrypted storage of sensitive data.
 * Falls back to AsyncStorage for non-sensitive data on web.
 * 
 * React Native Best Practices:
 * - Never store passwords, tokens, or OTPs in plain AsyncStorage
 * - Use expo-secure-store for anything sensitive
 * - Clear sensitive data on logout
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Logger } from './logger';

const KEY_INDEX_KEY = 'secure_key_index';

class SecureStorage {
  private _registeredKeys: Set<string> = new Set();
  private _indexLoaded = false;

  private get isWeb(): boolean {
    return Platform.OS === 'web';
  }

  /**
   * The key index must survive app restarts. It lives in AsyncStorage
   * (it holds key *names* only, never values) because SecureStore has no
   * enumeration API. Without it, `clear()` after a cold start would leave
   * previously written secrets (e.g. the Supabase session) on the device.
   */
  private async loadKeyIndex(): Promise<void> {
    if (this._indexLoaded) return;
    this._indexLoaded = true;
    try {
      const fullKey = this.getKey(KEY_INDEX_KEY);
      const raw = this.isWeb
        ? await AsyncStorage.getItem(fullKey)
        : await SecureStore.getItemAsync(fullKey);
      if (raw) {
        const keys = JSON.parse(raw);
        if (Array.isArray(keys)) {
          keys.forEach(k => typeof k === 'string' && this._registeredKeys.add(k));
        }
      }
    } catch (error) {
      Logger.error('[SecureStorage] Error loading key index', error);
    }
  }

  private async persistKeyIndex(): Promise<void> {
    try {
      const fullKey = this.getKey(KEY_INDEX_KEY);
      const value = JSON.stringify([...this._registeredKeys]);
      if (this.isWeb) {
        await AsyncStorage.setItem(fullKey, value);
      } else {
        await SecureStore.setItemAsync(fullKey, value);
      }
    } catch (error) {
      Logger.error('[SecureStorage] Error persisting key index', error);
    }
  }

  /**
   * Store sensitive item securely. Uses SecureStore on native, AsyncStorage on web.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      if (this.isWeb) {
        await AsyncStorage.setItem(fullKey, value);
      } else {
        await SecureStore.setItemAsync(fullKey, value);
      }
      // Track this key for clear()
      await this.loadKeyIndex();
      if (!this._registeredKeys.has(key)) {
        this._registeredKeys.add(key);
        await this.persistKeyIndex();
      }
    } catch (error) {
      Logger.error('[SecureStorage] Error setting item', error, { key });
      throw error;
    }
  }

  /**
   * Retrieve sensitive item securely.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb) {
        return await AsyncStorage.getItem(this.getKey(key));
      }
      return await SecureStore.getItemAsync(this.getKey(key));
    } catch (error) {
      Logger.error('[SecureStorage] Error getting item', error, { key });
      return null;
    }
  }

  /**
   * Remove sensitive item securely.
   */
  async removeItem(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      if (this.isWeb) {
        await AsyncStorage.removeItem(fullKey);
      } else {
        await SecureStore.deleteItemAsync(fullKey);
      }
      // Remove from tracked keys
      await this.loadKeyIndex();
      if (this._registeredKeys.delete(key)) {
        await this.persistKeyIndex();
      }
    } catch (error) {
      Logger.error('[SecureStorage] Error removing item', error, { key });
      throw error;
    }
  }

  /**
   * Clear all app storage (SecureStore + AsyncStorage).
   * Use only on logout/account deletion.
   */
  async clear(): Promise<void> {
    try {
      // Clear all registered SecureStore items
      await this.loadKeyIndex();
      for (const key of this._registeredKeys) {
        try {
          const fullKey = this.getKey(key);
          if (this.isWeb) {
            await AsyncStorage.removeItem(fullKey);
          } else {
            await SecureStore.deleteItemAsync(fullKey);
          }
        } catch {
          // Key may not exist, ignore
        }
      }
      this._registeredKeys.clear();

      // Drop the key index itself
      try {
        const indexKey = this.getKey(KEY_INDEX_KEY);
        if (this.isWeb) {
          await AsyncStorage.removeItem(indexKey);
        } else {
          await SecureStore.deleteItemAsync(indexKey);
        }
      } catch {
        // Ignore
      }

      // Clear AsyncStorage defensively
      const getAllKeys = (AsyncStorage as typeof AsyncStorage & {
        getAllKeys?: () => Promise<readonly string[]>;
      }).getAllKeys;
      if (typeof getAllKeys === 'function') {
        const keys = await getAllKeys.call(AsyncStorage);
        const appKeys = (keys || []).filter(k => k.startsWith('astrofusion_'));
        if (appKeys.length > 0) {
          await AsyncStorage.multiRemove(appKeys);
        }
      }
    } catch (error) {
      Logger.error('[SecureStorage] Error clearing storage', error);
    }
  }

  private getKey(key: string): string {
    return `astrofusion_${Platform.OS}_${key}`;
  }
}

export const secureStorage = new SecureStorage();
export default secureStorage;
