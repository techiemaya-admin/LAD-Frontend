// Cookie utility using js-cookie
import Cookies from 'js-cookie';

export const cookieStorage = {
  getItem(key: string): string | null {
    return Cookies.get(key) || null;
  },
  setItem(key: string, value: string): void {
    // Use sameSite: 'none' for cross-site requests (frontend -> backend on different domains)
    // secure: true is required when using sameSite: 'none'
    Cookies.set(key, value, { sameSite: 'none', secure: true });
  },
  removeItem(key: string): void {
    Cookies.remove(key);
  },
  clear(): void {
    // No direct clear for all cookies, must remove known keys
  }
};
