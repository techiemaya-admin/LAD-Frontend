/**
 * Safe storage utilities that handle Safari's strict privacy mode
 * where localStorage/sessionStorage might be blocked
 */
import { logger } from '@/lib/logger';
import { cookieStorage } from './cookieStorage';
class SafeStorage {
  private memoryStore: Map<string, string> = new Map();
  private isStorageAvailable(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  getItem(key: string): string | null {
    try {
      // Use cookies for auth keys
      if (key === 'token' || key === 'auth_token' || key.startsWith('user:') || key.includes('auth')) {
        return cookieStorage.getItem(key);
      }
      if (this.isStorageAvailable()) {
        return localStorage.getItem(key);
      }
      return this.memoryStore.get(key) || null;
    } catch (e) {
      logger.warn('Storage getItem failed', e);
      return this.memoryStore.get(key) || null;
    }
  }
  setItem(key: string, value: string): void {
    try {
      // Use cookies for auth keys
      if (key === 'token' || key === 'auth_token' || key.startsWith('user:') || key.includes('auth')) {
        cookieStorage.setItem(key, value);
        return;
      }
      const storageAvailable = this.isStorageAvailable();
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[SafeStorage] setItem', { key, storageAvailable });
      }
      if (storageAvailable) {
        localStorage.setItem(key, value);
        if (process.env.NODE_ENV === 'development') {
          logger.debug('[SafeStorage] Saved to localStorage', { key, valueLength: value.length });
        }
        // Verify it was actually saved
        const retrieved = localStorage.getItem(key);
        if (process.env.NODE_ENV === 'development') {
          logger.debug('[SafeStorage] Verified retrieval', { key, retrieved: !!retrieved });
        }
      } else {
        logger.warn('[SafeStorage] localStorage not available, using memory store', { key });
      }
      this.memoryStore.set(key, value);
    } catch (e) {
      logger.error('[SafeStorage] setItem failed', e);
      this.memoryStore.set(key, value);
    }
  }
  removeItem(key: string): void {
    try {
      // Use cookies for auth keys
      if (key === 'token' || key === 'auth_token' || key.startsWith('user:') || key.includes('auth')) {
        cookieStorage.removeItem(key);
        return;
      }
      if (this.isStorageAvailable()) {
        localStorage.removeItem(key);
      }
      this.memoryStore.delete(key);
    } catch (e) {
      logger.warn('Storage removeItem failed', e);
      this.memoryStore.delete(key);
    }
  }
  clear(): void {
    try {
      if (this.isStorageAvailable()) {
        localStorage.clear();
      }
      this.memoryStore.clear();
    } catch (e) {
      logger.warn('Storage clear failed', e);
      this.memoryStore.clear();
    }
  }
}
// Export a singleton instance
export const safeStorage = new SafeStorage();
