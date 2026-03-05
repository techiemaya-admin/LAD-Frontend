/**
 * User-scoped storage utilities
 * Ensures data is properly isolated per user by prefixing storage keys with userId
 * 
 * Usage:
 * const userStorage = new UserStorage(userId);
 * userStorage.setItem('key', 'value');
 * const value = userStorage.getItem('key');
 */

import { logger } from '@/lib/logger';
import { safeStorage } from '@/utils/storage';

export class UserStorage {
  private userId: string | number;

  constructor(userId: string | number) {
    this.userId = userId;
  }

  /**
   * Prefix a key with the current user's ID
   */
  private prefixKey(key: string): string {
    return `user:${this.userId}:${key}`;
  }

  /**
   * Get an item from user-scoped storage
   */
  getItem(key: string): string | null {
    try {
      const prefixedKey = this.prefixKey(key);
      const value = safeStorage.getItem(prefixedKey);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[UserStorage] getItem', { key, prefixedKey, found: !!value });
      }
      return value;
    } catch (e) {
      logger.error('[UserStorage] getItem failed', { key, error: String(e) });
      return null;
    }
  }

  /**
   * Set an item in user-scoped storage
   */
  setItem(key: string, value: string): void {
    try {
      const prefixedKey = this.prefixKey(key);
      safeStorage.setItem(prefixedKey, value);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[UserStorage] setItem', { key, prefixedKey, valueLength: value.length });
      }
    } catch (e) {
      logger.error('[UserStorage] setItem failed', { key, error: String(e) });
    }
  }

  /**
   * Parse and get a JSON item from user-scoped storage
   */
  getJSON<T = any>(key: string, fallback?: T): T | null {
    try {
      const value = this.getItem(key);
      if (!value) return fallback || null;
      return JSON.parse(value) as T;
    } catch (e) {
      logger.error('[UserStorage] getJSON failed', { key, error: String(e) });
      return fallback || null;
    }
  }

  /**
   * Set a JSON item in user-scoped storage
   */
  setJSON<T = any>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[UserStorage] setJSON', { key });
      }
    } catch (e) {
      logger.error('[UserStorage] setJSON failed', { key, error: String(e) });
    }
  }

  /**
   * Remove an item from user-scoped storage
   */
  removeItem(key: string): void {
    try {
      const prefixedKey = this.prefixKey(key);
      safeStorage.removeItem(prefixedKey);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[UserStorage] removeItem', { key, prefixedKey });
      }
    } catch (e) {
      logger.error('[UserStorage] removeItem failed', { key, error: String(e) });
    }
  }

  /**
   * Clear all user-scoped storage (removes items with this user's prefix)
   * Note: This clears only this user's data from the global storage
   */
  clearUserData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        const prefix = `user:${this.userId}:`;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          safeStorage.removeItem(key.replace(prefix, ''));
        });
        
        if (process.env.NODE_ENV === 'development') {
          logger.debug('[UserStorage] clearUserData', { userId: this.userId, keysRemoved: keysToRemove.length });
        }
      }
    } catch (e) {
      logger.error('[UserStorage] clearUserData failed', { error: String(e) });
    }
  }
}

/**
 * Get a UserStorage instance with the current user's ID
 * Returns null if user is not available
 */
export async function getUserStorage(): Promise<UserStorage | null> {
  try {
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    if (user?.id) {
      return new UserStorage(user.id);
    }
    return null;
  } catch (e) {
    logger.error('[getUserStorage] Failed to get current user', { error: String(e) });
    return null;
  }
}

/**
 * Helper to create a user-scoped key without needing a UserStorage instance
 * Useful for quick operations
 */
export function createUserKey(userId: string | number, key: string): string {
  return `user:${userId}:${key}`;
}
