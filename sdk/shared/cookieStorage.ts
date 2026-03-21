// Cookie utility using js-cookie
import Cookies from 'js-cookie';

export const cookieStorage = {
  getItem(key: string): string | null {
    return Cookies.get(key) || null;
  },
  setItem(key: string, value: string): void {
    // Cookie settings depend on environment
    // For localhost (http): use sameSite: 'lax', secure: false
    // For production (https): use sameSite: 'none', secure: true (for cross-origin requests)
    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );

    Cookies.set(key, value, {
      sameSite: isProduction ? 'none' : (isLocalhost ? 'lax' : 'strict'),
      secure: isProduction,
      path: '/'
    });
  },
  setItemChunked(key: string, value: string, chunkSize = 3500): void {
    this.removeItemChunked(key);
    const total = Math.ceil(value.length / chunkSize);
    this.setItem(`${key}.__chunks`, String(total));
    for (let i = 0; i < total; i++) {
      const part = value.slice(i * chunkSize, (i + 1) * chunkSize);
      this.setItem(`${key}.__chunk_${i}`, part);
    }
  },
  getItemChunked(key: string): string | null {
    const chunksStr = this.getItem(`${key}.__chunks`);
    if (!chunksStr) return this.getItem(key);
    const total = Number(chunksStr);
    if (!Number.isFinite(total) || total <= 0) return null;
    let out = '';
    for (let i = 0; i < total; i++) {
      const part = this.getItem(`${key}.__chunk_${i}`);
      if (part == null) return null;
      out += part;
    }
    return out;
  },
  removeItem(key: string): void {
    Cookies.remove(key, { path: '/' });
  },
  removeItemChunked(key: string): void {
    const chunksStr = this.getItem(`${key}.__chunks`);
    if (chunksStr) {
      const total = Number(chunksStr);
      if (Number.isFinite(total) && total > 0) {
        for (let i = 0; i < total; i++) {
          this.removeItem(`${key}.__chunk_${i}`);
        }
      }
      this.removeItem(`${key}.__chunks`);
    }
    this.removeItem(key);
  },
  clear(): void {
    // No direct clear for all cookies, must remove known keys
  }
};
