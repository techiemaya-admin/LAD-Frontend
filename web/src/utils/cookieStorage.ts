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
  removeItem(key: string): void {
    Cookies.remove(key, { path: '/' });
  },
  clear(): void {
    // No direct clear for all cookies, must remove known keys
  }
};
