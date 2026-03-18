/**
 * Safe Storage utilities for SDK
 * Uses cookies as primary storage with fallback to memory storage.
 * Token and auth data are stored in cookies only — never in localStorage.
 */
import { cookieStorage } from './cookieStorage';

class SafeStorage {
  private memoryStore: Map<string, string> = new Map();

  getItem(key: string): string | null {
    try {
      const value = cookieStorage.getItem(key);
      if (value) return value;

      return this.memoryStore.get(key) || null;
    } catch (e) {
      console.warn('[SafeStorage] getItem failed', e);
      return this.memoryStore.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      cookieStorage.setItem(key, value);
      this.memoryStore.set(key, value);
    } catch (e) {
      console.error('[SafeStorage] setItem failed', e);
      this.memoryStore.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      cookieStorage.removeItem(key);
      this.memoryStore.delete(key);
    } catch (e) {
      console.warn('[SafeStorage] removeItem failed', e);
      this.memoryStore.delete(key);
    }
  }

  clear(): void {
    try {
      cookieStorage.clear();
      this.memoryStore.clear();
    } catch (e) {
      console.warn('[SafeStorage] clear failed', e);
      this.memoryStore.clear();
    }
  }
}

// Export singleton instance
export const safeStorage = new SafeStorage();
