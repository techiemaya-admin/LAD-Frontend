import { safeStorage } from '../utils/storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';

export const getApiUrl = (path) => `${API_BASE_URL}${path}`;

export const defaultFetchOptions = () => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`,
  },
});
