// Cookie utility using js-cookie
import Cookies from 'js-cookie';

export const cookieStorage = {
  getItem(key: string): string | null {
    return Cookies.get(key) || null;
  },
  setItem(key: string, value: string): void {
    Cookies.set(key, value, { sameSite: 'strict', secure: true });
  },
  removeItem(key: string): void {
    Cookies.remove(key);
  },
  clear(): void {
    // No direct clear for all cookies, must remove known keys
  }
};
