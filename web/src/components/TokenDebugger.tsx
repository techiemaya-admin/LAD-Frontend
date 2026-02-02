'use client';

import { useEffect, useState } from 'react';
import { safeStorage } from '@/utils/storage';

export function TokenDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkToken = () => {
      // Check SafeStorage
      const tokenFromSafeStorage = safeStorage.getItem('token');
      
      // Check localStorage directly
      const tokenFromLocalStorage = typeof window !== 'undefined' 
        ? localStorage.getItem('token') 
        : null;
      
      // Check all cookies
      const allCookies = typeof document !== 'undefined' 
        ? document.cookie 
        : '';
      
      // Parse cookies
      const cookies: Record<string, string> = {};
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name, ...valueParts] = cookie.trim().split('=');
          if (name) {
            cookies[name.trim()] = decodeURIComponent(valueParts.join('='));
          }
        });
      }
      
      setDebugInfo({
        tokenFromSafeStorage,
        tokenFromLocalStorage,
        allCookies,
        parsedCookies: cookies,
        hasTokenCookie: 'token' in cookies,
        tokenCookieValue: cookies['token'] ? cookies['token'].substring(0, 20) + '...' : null,
        timestamp: new Date().toISOString()
      });
    };

    checkToken();
    // Re-check every 2 seconds
    const interval = setInterval(checkToken, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 99999,
      fontFamily: 'monospace'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔍 Token Debug Info</div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
