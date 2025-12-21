import { getApiUrl, defaultFetchOptions } from '../config/api';
import { safeStorage } from '../utils/storage';

const authService = {
  login: async (credentials) => {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      ...defaultFetchOptions(),
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    safeStorage.setItem('token', data.token);
    return data;
  },
  
  logout: async () => {
    const response = await fetch(getApiUrl('/api/auth/logout'), {
      ...defaultFetchOptions(),
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    safeStorage.removeItem('token');
    return await response.json();
  },
  
  getCurrentUser: async () => {
    const token = safeStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(getApiUrl('/api/auth/me'), {
      ...defaultFetchOptions(),
      headers: {
        ...defaultFetchOptions().headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return await response.json();
  }
};

export default authService; 