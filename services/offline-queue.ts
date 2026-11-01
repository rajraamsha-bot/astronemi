/**
 * Offline Queue Service
 * 
 * Manages offline operations and syncs them when network is available
 * Handles consultations, messages, and other operations
 */

import { secureSetItem, secureGetItem } from '@/utils/secure-storage';
import { Logger } from '@/services/logger';
import { prefixedSecureId } from '../utils/secure-random';

/** Fire-and-forget helper that surfaces failures to the logger instead of
 *  producing "unhandled promise rejection" crashes on Hermes. */
const fireAndForget = (p: Promise<unknown>, label: string) => {
  p.catch(err => Logger.error(`[offline-queue] ${label}:`, err));
};

let NetInfo: Record<string, unknown> | null = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  Logger.info('@react-native-community/netinfo not installed');
}

export interface QueuedOperation {
  id: string;
  type: 'consultation' | 'message' | 'payment' | 'review' | 'profile_update';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class OfflineQueueService {
  private readonly STORAGE_KEY = 'offline_queue';
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private isOnline = true;
  private netInfoUnsubscribe: (() => void) | null = null;
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.initialize();
  }

  /**
   * Initialize the service
   */
  private async initialize(): Promise<void> {
    // Load queue from storage
    await this.loadQueue();

    // Listen for network changes
if (NetInfo) {
      this.netInfoUnsubscribe = (NetInfo as any).addEventListener((state: { isConnected?: boolean | null }) => {
        // isConnected can be null ("unknown") — previously coerced to false,
        // which flipped the queue offline and stalled processing on devices
        // where NetInfo can't determine connectivity.
        if (typeof state.isConnected !== 'boolean') return;
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected;

        // If we just came online, process the queue
        if (wasOffline && this.isOnline) {
          Logger.info('Network restored, processing offline queue');
          fireAndForget(this.processQueue(), 'processQueue on online');
        }
      });
    }

    // Process queue if online
    if (this.isOnline) {
      fireAndForget(this.processQueue(), 'processQueue on init');
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await secureGetItem(this.STORAGE_KEY);
      if (stored) {
        const loaded: QueuedOperation[] = JSON.parse(stored);
        // Any operation persisted as 'processing' was interrupted mid-flight
        // (app killed / crashed). Nothing will ever move it again, so it would
        // be stranded in the queue forever. Requeue it as pending.
        let stranded = 0;
        for (const op of loaded) {
          if (op.status === 'processing') {
            op.status = 'pending';
            stranded++;
          }
        }
        // Preserve anything enqueued while this load was in flight.
        this.queue = [...loaded, ...this.queue];
        Logger.info(`Loaded ${loaded.length} queued operations`);
        if (stranded > 0) {
          Logger.warn(`Requeued ${stranded} interrupted operations`);
          await this.saveQueue();
        }
      }
    } catch (error) {
      Logger.error('Failed to load offline queue:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await secureSetItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      Logger.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add operation to queue
   */
  async enqueue(
    type: QueuedOperation['type'],
    data: Record<string, unknown>,
    maxRetries: number = 3
  ): Promise<string> {
    // Wait for the persisted queue to load, otherwise loadQueue() can
    // overwrite operations enqueued during startup.
    await this.ready;

    const operation: QueuedOperation = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
      status: 'pending'
    };

    this.queue.push(operation);
    await this.saveQueue();

    Logger.info('Operation queued', { id: operation.id, type });

    // Try to process immediately if online (fire-and-forget, but surfaced)
    if (this.isOnline) {
      fireAndForget(this.processQueue(), 'processQueue on enqueue');
    }

    return operation.id;
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingOps = this.queue.filter(op => op.status === 'pending');

      for (const operation of pendingOps) {
        try {
          operation.status = 'processing';
          await this.saveQueue();

          const success = await this.processOperation(operation);

          if (success) {
            operation.status = 'completed';
            Logger.info('Operation completed', { id: operation.id });
          } else {
            operation.retries++;
            
            if (operation.retries >= operation.maxRetries) {
              operation.status = 'failed';
              operation.error = 'Max retries exceeded';
              Logger.error('Operation failed after max retries', { id: operation.id });
            } else {
              operation.status = 'pending';
              Logger.warn('Operation retry scheduled', { 
                id: operation.id, 
                retries: operation.retries 
              });
            }
          }

          await this.saveQueue();
        } catch (error) {
          // Same retry accounting as the failure path above: without the
          // maxRetries check a persistently throwing operation stayed
          // 'pending' forever and was retried on every network change.
          Logger.error('Error processing operation:', error);
          operation.retries++;

          if (operation.retries >= operation.maxRetries) {
            operation.status = 'failed';
            operation.error = error instanceof Error ? error.message : 'Max retries exceeded';
            Logger.error('Operation failed after max retries', { id: operation.id });
          } else {
            operation.status = 'pending';
          }

          await this.saveQueue();
        }
      }

      // Clean up completed operations older than 24 hours
      this.cleanupOldOperations();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<boolean> {
    try {
      const { supabase } = await import('@/lib/supabase');

      switch (operation.type) {
        case 'consultation':
          // RLS revoked INSERT on consultations (migration 033); route via
          // SECURITY DEFINER RPC. The queued payload is validated server-side.
          const { error: consultationError } = await supabase.rpc(
            'secure_create_consultation',
            operation.data,
          );
          if (consultationError) {
            Logger.warn('Consultation create RPC failed', { error: consultationError });
          }
          return !consultationError;

        case 'message':
          // RLS revoked INSERT on chat_messages (migration 041); route via
          // SECURITY DEFINER RPC.
          const { error: messageError } = await supabase.rpc(
            'send_consultation_message',
            operation.data,
          );
          if (messageError) {
            Logger.warn('Message RPC failed', { error: messageError });
          }
          return !messageError;

        case 'review':
          // RLS-restricted INSERT on consultation_reviews (migration 019);
          // route via the rate_consultation RPC.
          const { error: reviewError } = await supabase.rpc(
            'rate_consultation',
            operation.data,
          );
          if (reviewError) {
            Logger.warn('Review RPC failed', { error: reviewError });
          }
          return !reviewError;

        case 'profile_update':
          // users UPDATE is column-restricted (migration 048); only allow the
          // listed display columns through.
          const { error: profileError } = await supabase.rpc('update_user_profile', {
            p_user_id: operation.data.userId,
            p_updates: operation.data.updates,
          });
          if (profileError) {
            Logger.warn('Profile update RPC failed', { error: profileError });
          }
          return !profileError;

        case 'payment':
          // Payments must never be replayed from a client-side queue: the
          // gateway/edge function owns idempotency. Fail permanently instead
          // of silently burning retries via the default branch.
          Logger.error('Payment operations cannot be replayed offline', { id: operation.id });
          operation.retries = operation.maxRetries;
          return false;

        default:
          Logger.warn('Unknown operation type', { type: operation.type });
          operation.retries = operation.maxRetries;
          return false;
      }
    } catch (error) {
      Logger.error('Failed to process operation:', error);
      return false;
    }
  }

  /**
   * Clean up old completed operations
   */
  private async cleanupOldOperations(): Promise<void> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const before = this.queue.length;

    this.queue = this.queue.filter(op => 
      op.status !== 'completed' || op.timestamp > oneDayAgo
    );

    if (this.queue.length < before) {
      await this.saveQueue();
      Logger.info(`Cleaned up ${before - this.queue.length} old operations`);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(op => op.status === 'pending').length,
      processing: this.queue.filter(op => op.status === 'processing').length,
      completed: this.queue.filter(op => op.status === 'completed').length,
      failed: this.queue.filter(op => op.status === 'failed').length
    };
  }

  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Retry failed operation
   */
  async retryOperation(operationId: string): Promise<boolean> {
    const operation = this.queue.find(op => op.id === operationId);
    
    if (!operation) {
      return false;
    }

    if (operation.status === 'failed') {
      operation.status = 'pending';
      operation.retries = 0;
      await this.saveQueue();

      if (this.isOnline) {
        fireAndForget(this.processQueue(), 'processQueue on retry');
      }

      return true;
    }

    return false;
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<number> {
    const before = this.queue.length;
    this.queue = this.queue.filter(op => op.status !== 'completed');
    await this.saveQueue();
    return before - this.queue.length;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return prefixedSecureId('op', 12);
  }

  /**
   * Check if online
   */
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.netInfoUnsubscribe?.();
    this.netInfoUnsubscribe = null;
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;