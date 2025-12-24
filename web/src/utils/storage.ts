/**
 * Safe storage utilities that handle Safari's strict privacy mode
 * where localStorage/sessionStorage might be blocked
 */

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
      if (this.isStorageAvailable()) {
        return localStorage.getItem(key);
      }
      return this.memoryStore.get(key) || null;
    } catch (e) {
      console.warn('Storage getItem failed:', e);
      return this.memoryStore.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      const storageAvailable = this.isStorageAvailable();
      console.log(`[SafeStorage] setItem key='${key}' storage available:`, storageAvailable);
      if (storageAvailable) {
        localStorage.setItem(key, value);
        console.log(`[SafeStorage] ✅ Saved to localStorage key='${key}' value length:`, value.length);
        // Verify it was actually saved
        const retrieved = localStorage.getItem(key);
        console.log(`[SafeStorage] ✅ Verified retrieval key='${key}':`, !!retrieved);
      } else {
        console.warn(`[SafeStorage] ⚠️ localStorage not available, using memory store for key='${key}'`);
      }
      this.memoryStore.set(key, value);
    } catch (e) {
      console.error('[SafeStorage] ❌ setItem failed:', e);
      this.memoryStore.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      if (this.isStorageAvailable()) {
        localStorage.removeItem(key);
      }
      this.memoryStore.delete(key);
    } catch (e) {
      console.warn('Storage removeItem failed:', e);
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
      console.warn('Storage clear failed:', e);
      this.memoryStore.clear();
    }
  }
}

// Export a singleton instance
export const safeStorage = new SafeStorage();
