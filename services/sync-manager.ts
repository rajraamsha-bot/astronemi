/**
 * Sync Manager Service
 * 
 * Handles offline-first data synchronization
 * Queues actions when offline and syncs when back online
 */

import { offlineStorage } from './offline-storage';
import { analytics } from '@/utils/analytics-tracker';
import { Logger } from './logger';

/**
 * Module 13: cap on pending-action retries. Past this many failed attempts a
 * permanently-failing action is dead-lettered instead of retried forever.
 */
export const MAX_PENDING_ACTION_RETRIES = 5;

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingActions: number;
  syncErrors: string[];
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

type SyncCallback = () => Promise<void>;

class SyncManagerService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncQueue: Map<string, SyncCallback> = new Map();
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncTime: number | null = null;
  private pendingActionCount: number = 0;
  private syncErrors: string[] = [];

  /**
   * Initialize sync manager
   */
  async initialize(): Promise<void> {
    // Try to check connectivity by making a test request
    await this.checkConnectivity();

    // Seed the reported status from storage so getStatus() is meaningful
    // before the first sync of this session completes.
    await this.refreshPersistedState();

    Logger.info(`Sync manager initialized. Online: ${this.isOnline}`);
  }

  /**
   * Reload lastSyncTime and the pending action count from offline storage.
   * getStatus() is synchronous, so these values are cached here and
   * refreshed whenever they can change.
   */
  private async refreshPersistedState(): Promise<void> {
    try {
      this.lastSyncTime = await offlineStorage.getLastSync();
    } catch (error) {
      Logger.error('Failed to read last sync time:', error);
    }

    try {
      const pending = await offlineStorage.getPendingActions();
      this.pendingActionCount = pending.length;
    } catch (error) {
      Logger.error('Failed to read pending action count:', error);
    }
  }

  /**
   * Check connectivity by attempting a network request
   */
  async checkConnectivity(): Promise<boolean> {
    // Declared outside the try so the catch path can clear it too. When the
    // fetch rejected for any reason other than the timeout, the pending timer
    // was previously left running and kept the JS timer queue alive.
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // Try to fetch a small resource to check connectivity
      timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Any HTTP response (even 4xx/5xx) proves the device has network
      // connectivity — `fetch` only throws on network errors. Using
      // `response.ok` here meant a 301 captive-portal redirect or a 404 on
      // the favicon falsely marked the device offline, stalling all syncs.
      const wasOffline = !this.isOnline;
      this.isOnline = true;
      
      // If came back online, trigger sync
      if (wasOffline && this.isOnline) {
        Logger.info('Device came back online. Starting sync...');
        this.syncAll();
      }
      
      // Notify listeners
      this.notifyListeners();
      
      return this.isOnline;
    } catch {
      if (timeoutId !== undefined) clearTimeout(timeoutId);

      const wasOnline = this.isOnline;
      this.isOnline = false;

      if (wasOnline) {
        Logger.info('Device went offline');
        this.notifyListeners();
      }
      
      return false;
    }
  }

  /**
   * Set online status manually (for testing or manual control)
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;
    
    this.notifyListeners();
    
    if (wasOffline && this.isOnline) {
      Logger.info('Device came back online. Starting sync...');
      this.syncAll();
    }
    
    analytics.track(this.isOnline ? 'network_online' : 'network_offline', {
      type: 'manual',
    });
  }

  /**
   * Register a sync callback
   */
  registerSync(key: string, callback: SyncCallback): void {
    this.syncQueue.set(key, callback);
    Logger.debug(`Registered sync callback: ${key}`);
  }

  /**
   * Unregister a sync callback
   */
  unregisterSync(key: string): void {
    this.syncQueue.delete(key);
    Logger.debug(`Unregistered sync callback: ${key}`);
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingActions: this.pendingActionCount,
      syncErrors: [...this.syncErrors],
    };
  }

  /**
   * Check if device is online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Check connectivity with a test request
   */
  async checkConnection(): Promise<boolean> {
    return this.checkConnectivity();
  }

  /**
   * Sync all registered callbacks
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      Logger.debug('Sync already in progress');
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Sync already in progress'],
      };
    }

    if (!this.isOnline) {
      Logger.debug('Device is offline. Skipping sync.');
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Device is offline'],
      };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const errors: string[] = [];
    let syncedActions = 0;
    let failedActions = 0;

    Logger.info(`Starting sync for ${this.syncQueue.size} registered callbacks`);

    // Each callback gets its own timeout so a hung network request can't wedge
    // `isSyncing` forever and silently disable all subsequent syncs.
    const CALLBACK_TIMEOUT_MS = 30_000;
    const withTimeout = <T>(p: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${CALLBACK_TIMEOUT_MS}ms`)), CALLBACK_TIMEOUT_MS)
        ),
      ]);

    // Execute all registered sync callbacks
    for (const [key, callback] of this.syncQueue) {
      try {
        Logger.debug(`Syncing: ${key}`);
        await withTimeout(callback(), `Sync callback "${key}"`);
        syncedActions++;
        Logger.debug(`Synced successfully: ${key}`);
      } catch (error) {
        failedActions++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${key}: ${errorMessage}`);
        Logger.error(`Sync failed for ${key}:`, error);
      }
    }

    // Process pending actions from offline storage
    try {
      const pendingResult = await this.processPendingActions();
      syncedActions += pendingResult.syncedActions;
      failedActions += pendingResult.failedActions;
      errors.push(...pendingResult.errors);
    } catch (error) {
      Logger.error('Failed to process pending actions:', error);
      errors.push('Failed to process pending actions');
    }

    this.isSyncing = false;
    this.syncErrors = errors;

    // Persist the sync timestamp, then refresh the cached status values so
    // subscribers see the real lastSyncTime and remaining pending count
    // rather than the placeholders getStatus() used to return.
    try {
      await offlineStorage.updateLastSync();
    } catch (error) {
      Logger.error('Failed to persist last sync time:', error);
    }
    await this.refreshPersistedState();

    this.notifyListeners();

    const result: SyncResult = {
      success: failedActions === 0,
      syncedActions,
      failedActions,
      errors,
    };

    // Track sync result
    analytics.track('SCREEN_VIEW', {
      screen: 'sync_completed',
      synced_actions: syncedActions,
      failed_actions: failedActions,
      has_errors: errors.length > 0,
    });

    Logger.info(`Sync completed. Success: ${syncedActions}, Failed: ${failedActions}`);

    return result;
  }

  /**
   * Process pending actions from offline storage
   */
  private async processPendingActions(): Promise<SyncResult> {
    const pendingActions = await offlineStorage.getPendingActions();
    const errors: string[] = [];
    let syncedActions = 0;
    let failedActions = 0;

    for (const action of pendingActions) {
      // Module 13: cap retries so a permanently-failing action (e.g. a
      // consultation insert rejected by RLS) cannot queue forever. Past the
      // cap the action is dead-lettered: removed and surfaced as an error
      // instead of retried indefinitely on every network restore.
      if ((action.retries ?? 0) >= MAX_PENDING_ACTION_RETRIES) {
        await offlineStorage.removePendingAction(action.id);
        failedActions++;
        const dropMsg = `Action ${action.id}: dropped after ${MAX_PENDING_ACTION_RETRIES} retries`;
        errors.push(dropMsg);
        Logger.error(dropMsg);
        continue;
      }

      try {
        // In a real app, this would make API calls based on action type
        Logger.debug(`Processing pending action: ${action.type} (${action.id})`);
        
        // Simulate API call
        await this.executePendingAction(action as unknown as { id: string; type: string; payload?: unknown; [key: string]: unknown });
        
        // Remove from queue on success
        await offlineStorage.removePendingAction(action.id);
        syncedActions++;
        
        Logger.debug(`Pending action completed: ${action.id}`);
      } catch (error) {
        failedActions++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Action ${action.id}: ${errorMessage}`);
        
        // Increment retry count
        await offlineStorage.incrementRetry(action.id);
        
        Logger.error(`Pending action failed: ${action.id}`, error);
      }
    }

    return {
      success: failedActions === 0,
      syncedActions,
      failedActions,
      errors,
    };
  }

  /**
   * Execute a pending action
   */
  private async executePendingAction(action: { id: string; type: string; payload?: unknown; [key: string]: unknown }): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    const { Logger } = await import('./logger');

    try {
      // SECURITY FIX: Check .error from all Supabase operations
      // PostgREST builders resolve successfully even on DB errors - must inspect .error property
      switch (action.type) {
        case 'CREATE_CONSULTATION': {
          const payload = action.payload as Record<string, unknown>;
          const { error } = await supabase.from('consultations').insert(payload);
          if (error) {
            throw new Error(`Failed to create consultation: ${error.message}`);
          }
          break;
        }
        case 'UPDATE_PROFILE': {
          // Route through update_user_profile RPC (migration 049). The RPC
          // allowlists display columns and rejects anything else, so a
          // malformed offline payload can no longer reach role/wallet/tier.
          // Migration 052 closes the raw `users` UPDATE path via the
          // column-level GRANT on `users`.
          const payload = action.payload as { userId: string; updates: Record<string, unknown> };
          const { error } = await supabase.rpc('update_user_profile', {
            p_user_id: payload.userId,
            p_updates: payload.updates,
          });
          if (error) {
            throw new Error(`Failed to update profile: ${error.message}`);
          }
          break;
        }
        case 'SUBMIT_REVIEW': {
          const payload = action.payload as Record<string, unknown>;
          const { error } = await supabase.from('consultation_reviews').insert(payload);
          if (error) {
            throw new Error(`Failed to submit review: ${error.message}`);
          }
          break;
        }
        default:
          Logger.warn('Unknown pending action type, marking failed:', action.type);
          throw new Error(`Unknown pending action type: ${action.type}`);
      }
    } catch (error) {
      Logger.error('Failed to execute pending action:', error);
      throw error; // Re-throw so it stays in the queue for retry
    }
  }

  /**
   * Queue an action for later sync
   */
  async queueAction(type: string, payload: unknown): Promise<void> {
    await offlineStorage.addPendingAction({ type, payload });

    this.pendingActionCount += 1;
    this.notifyListeners();

    Logger.info(`Queued action for sync: ${type}`);
    
    // If online, try to sync immediately
    if (this.isOnline) {
      this.syncAll();
    }
  }

  /**
   * Force sync (manual trigger)
   */
  async forcSync(): Promise<SyncResult> {
    Logger.info('Manual sync triggered');
    return this.syncAll();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.listeners.clear();
    this.syncQueue.clear();
  }
}

// Export singleton instance
export const syncManager = new SyncManagerService();

/**
 * Hook for sync manager
 */
export function useSyncManager() {
  return {
    getStatus: syncManager.getStatus.bind(syncManager),
    isConnected: syncManager.isConnected.bind(syncManager),
    subscribe: syncManager.subscribe.bind(syncManager),
    queueAction: syncManager.queueAction.bind(syncManager),
    forcSync: syncManager.forcSync.bind(syncManager),
  };
}

export default syncManager;