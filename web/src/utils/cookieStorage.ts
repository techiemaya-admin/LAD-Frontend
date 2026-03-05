// Cookie utility using js-cookie
import Cookies from 'js-cookie';

export const cookieStorage = {
  getItem(key: string): string | null {
    return Cookies.get(key) || null;
  },
  setItem(key: string, value: string): void {
    // Use sameSite: 'none' for cross-site requests (frontend -> backend on different domains)
    // secure: true is required when using sameSite: 'none'
    // Set path to '/' to ensure cookie is available across all routes
    Cookies.set(key, value, { 
      sameSite: 'none', 
      secure: true,
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
