/**
 * Offline Storage Service
 * 
 * Handles offline data persistence using AsyncStorage and SQLite
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { prefixedSecureId } from '@/utils/secure-random';

// Storage keys
const STORAGE_KEYS = {
  USER: 'offline_user',
  KUNDLIS: 'offline_kundlis',
  CONSULTATIONS: 'offline_consultations',
  ASTROLOGERS: 'offline_astrologers',
  HOROSCOPES: 'offline_horoscopes',
  WALLET: 'offline_wallet',
  NOTIFICATIONS: 'offline_notifications',
  CART: 'offline_cart',
  SETTINGS: 'offline_settings',
  LAST_SYNC: 'last_sync_timestamp',
  PENDING_ACTIONS: 'pending_actions',
};

// Cache expiration times (in milliseconds)
const CACHE_TTL = {
  USER: 24 * 60 * 60 * 1000, // 24 hours
  KUNDLIS: 7 * 24 * 60 * 60 * 1000, // 7 days
  CONSULTATIONS: 1 * 60 * 60 * 1000, // 1 hour
  ASTROLOGERS: 6 * 60 * 60 * 1000, // 6 hours
  HOROSCOPES: 12 * 60 * 60 * 1000, // 12 hours
  WALLET: 5 * 60 * 1000, // 5 minutes
  NOTIFICATIONS: 30 * 60 * 1000, // 30 minutes
  CART: 24 * 60 * 60 * 1000, // 24 hours
};

// Cached data structure
interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Pending action for offline sync
interface PendingAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

class OfflineStorageService {
  private memoryCache: Map<string, unknown> = new Map();

  /**
   * Initialize offline storage
   */
  async initialize(): Promise<void> {
    // Load critical data into memory cache
    await this.loadIntoMemory(STORAGE_KEYS.USER);
    await this.loadIntoMemory(STORAGE_KEYS.SETTINGS);
    
    Logger.info('Offline storage initialized');
  }

  /**
   * Load data into memory cache
   */
  private async loadIntoMemory(key: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        this.memoryCache.set(key, JSON.parse(data));
      }
    } catch (error) {
      Logger.error(`Failed to load ${key} into memory:`, error);
    }
  }

  /**
   * Save data to storage
   */
  async save<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl || CACHE_TTL[key as keyof typeof CACHE_TTL] || 24 * 60 * 60 * 1000),
      };

      // Save to memory cache
      this.memoryCache.set(key, cachedData);

      // Save to persistent storage
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      Logger.error(`Failed to save ${key}:`, error);
    }
  }

  /**
   * Get data from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryData = this.memoryCache.get(key) as CachedData<T> | undefined;
      if (memoryData) {
        if (Date.now() < memoryData.expiresAt) {
          return memoryData.data;
        }
        // Expired, remove from cache
        this.memoryCache.delete(key);
      }

      // Check persistent storage
      const storedData = await AsyncStorage.getItem(key);
      if (storedData) {
        const cachedData: CachedData<T> = JSON.parse(storedData);
        
        if (Date.now() < cachedData.expiresAt) {
          // Restore to memory cache
          this.memoryCache.set(key, cachedData);
          return cachedData.data;
        }
        
        // Expired, remove from storage
        await AsyncStorage.removeItem(key);
      }

      return null;
    } catch (error) {
      Logger.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  async remove(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      Logger.error(`Failed to remove ${key}:`, error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      Logger.error('Failed to clear all storage:', error);
    }
  }

  /**
   * Check if data is stale
   */
  isStale(key: string): boolean {
    const memoryData = this.memoryCache.get(key) as CachedData<unknown> | undefined;
    if (!memoryData) return true;
    return Date.now() >= memoryData.expiresAt;
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(key: string): number {
    const memoryData = this.memoryCache.get(key) as CachedData<unknown> | undefined;
    if (!memoryData) return Infinity;
    return Date.now() - memoryData.timestamp;
  }

  // ============================================
  // USER DATA
  // ============================================

  async saveUser(user: Record<string, unknown>): Promise<void> {
    await this.save(STORAGE_KEYS.USER, user, CACHE_TTL.USER);
  }

  async getUser(): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>(STORAGE_KEYS.USER);
  }

  // ============================================
  // KUNDLIS
  // ============================================

  async saveKundlis(kundlis: Record<string, unknown>[]): Promise<void> {
    await this.save(STORAGE_KEYS.KUNDLIS, kundlis, CACHE_TTL.KUNDLIS);
  }

  async getKundlis(): Promise<Record<string, unknown>[] | null> {
    return this.get<Record<string, unknown>[]>(STORAGE_KEYS.KUNDLIS);
  }

  async addKundli(kundli: Record<string, unknown>): Promise<void> {
    const kundlis = (await this.getKundlis()) || [];
    kundlis.push(kundli);
    await this.saveKundlis(kundlis);
  }

  /**
   * ELITE FEATURE: Advanced Saved Charts Search
   * Allows searching/filtering the local chart database by name or astrological markers.
   */
  async searchSavedCharts(query?: {
    name?: string;
    lagnaSign?: string;
    planetInSign?: { planet: string; sign: string };
  }): Promise<Record<string, unknown>[]> {
    const kundlis = (await this.getKundlis()) || [];

    return kundlis.filter(k => {
      let match = true;

      // Name search (fuzzy)
      if (query?.name && !(k.name as string)?.toLowerCase().includes(query.name.toLowerCase())) {
        match = false;
      }

      // Lagna search
      if (query?.lagnaSign && (k.ascendant as Record<string, unknown>)?.sign !== query.lagnaSign) {
        match = false;
      }

      // Planet placement search
      if (query?.planetInSign) {
        const planets = k.planets as Record<string, unknown>[] | undefined;
        const p = planets?.find((planet: Record<string, unknown>) => planet.name === query.planetInSign?.planet);
        if (!p || p.sign !== query.planetInSign?.sign) {
          match = false;
        }
      }

      return match;
    });
  }

  // ============================================
  // CONSULTATIONS
  // ============================================

  async saveConsultations(consultations: Record<string, unknown>[]): Promise<void> {
    await this.save(STORAGE_KEYS.CONSULTATIONS, consultations, CACHE_TTL.CONSULTATIONS);
  }

  async getConsultations(): Promise<Record<string, unknown>[] | null> {
    return this.get<Record<string, unknown>[]>(STORAGE_KEYS.CONSULTATIONS);
  }

  // ============================================
  // ASTROLOGERS
  // ============================================

  async saveAstrologers(astrologers: Record<string, unknown>[]): Promise<void> {
    await this.save(STORAGE_KEYS.ASTROLOGERS, astrologers, CACHE_TTL.ASTROLOGERS);
  }

  async getAstrologers(): Promise<Record<string, unknown>[] | null> {
    return this.get<Record<string, unknown>[]>(STORAGE_KEYS.ASTROLOGERS);
  }

  // ============================================
  // HOROSCOPES
  // ============================================

  async saveHoroscopes(horoscopes: Record<string, unknown>): Promise<void> {
    await this.save(STORAGE_KEYS.HOROSCOPES, horoscopes, CACHE_TTL.HOROSCOPES);
  }

  async getHoroscopes(): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>(STORAGE_KEYS.HOROSCOPES);
  }

  // ============================================
  // WALLET
  // ============================================

  async saveWalletData(walletData: Record<string, unknown>): Promise<void> {
    await this.save(STORAGE_KEYS.WALLET, walletData, CACHE_TTL.WALLET);
  }

  async getWalletData(): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>(STORAGE_KEYS.WALLET);
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async saveNotifications(notifications: Record<string, unknown>[]): Promise<void> {
    await this.save(STORAGE_KEYS.NOTIFICATIONS, notifications, CACHE_TTL.NOTIFICATIONS);
  }

  async getNotifications(): Promise<Record<string, unknown>[] | null> {
    return this.get<Record<string, unknown>[]>(STORAGE_KEYS.NOTIFICATIONS);
  }

  // ============================================
  // CART
  // ============================================

  async saveCart(cart: Record<string, unknown>[]): Promise<void> {
    await this.save(STORAGE_KEYS.CART, cart, CACHE_TTL.CART);
  }

  async getCart(): Promise<Record<string, unknown>[] | null> {
    return this.get<Record<string, unknown>[]>(STORAGE_KEYS.CART);
  }

  // ============================================
  // PENDING ACTIONS (for offline sync)
  // ============================================

  /**
   * Add pending action for later sync
   */
  async addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const pendingActions = (await this.get<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS)) || [];
    
    const newAction: PendingAction = {
      ...action,
      // Collision-safe UUID — `${type}_${Date.now()}` collided for two
      // same-type actions added in the same millisecond.
      id: prefixedSecureId(action.type.toLowerCase(), 12),
      timestamp: Date.now(),
      retries: 0,
    };
    
    pendingActions.push(newAction);
    await this.save(STORAGE_KEYS.PENDING_ACTIONS, pendingActions);
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<PendingAction[]> {
    return (await this.get<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS)) || [];
  }

  /**
   * Remove pending action after successful sync
   */
  async removePendingAction(actionId: string): Promise<void> {
    const pendingActions = (await this.get<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS)) || [];
    const filtered = pendingActions.filter(a => a.id !== actionId);
    await this.save(STORAGE_KEYS.PENDING_ACTIONS, filtered);
  }

  /**
   * Increment retry count for an action
   */
  async incrementRetry(actionId: string): Promise<void> {
    const pendingActions = (await this.get<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS)) || [];
    const updated = pendingActions.map(a => 
      a.id === actionId ? { ...a, retries: a.retries + 1 } : a
    );
    await this.save(STORAGE_KEYS.PENDING_ACTIONS, updated);
  }

  // ============================================
  // SYNC STATUS
  // ============================================

  /**
   * Update last sync timestamp
   */
  async updateLastSync(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync(): Promise<number | null> {
    const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  /**
   * Check if data needs sync
   */
  async needsSync(key: string, maxAge: number): Promise<boolean> {
    const lastSync = await this.getLastSync();
    if (!lastSync) return true;
    
    const cacheAge = this.getCacheAge(key);
    return cacheAge > maxAge;
  }

  // ============================================
  // STORAGE INFO
  // ============================================

  /**
   * Get storage usage info
   */
  async getStorageInfo(): Promise<{
    usedKeys: string[];
    totalSize: number;
  }> {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(k => Object.values(STORAGE_KEYS).includes(k));
    
    let totalSize = 0;
    for (const key of appKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        totalSize += data.length * 2; // Approximate size in bytes
      }
    }

    return {
      usedKeys: appKeys,
      totalSize,
    };
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();

/**
 * Hook for offline storage
 */
export function useOfflineStorage() {
  return {
    save: offlineStorage.save.bind(offlineStorage),
    get: offlineStorage.get.bind(offlineStorage),
    remove: offlineStorage.remove.bind(offlineStorage),
    isStale: offlineStorage.isStale.bind(offlineStorage),
    addPendingAction: offlineStorage.addPendingAction.bind(offlineStorage),
    getPendingActions: offlineStorage.getPendingActions.bind(offlineStorage),
    needsSync: offlineStorage.needsSync.bind(offlineStorage),
  };
}

export default offlineStorage;