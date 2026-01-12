import { safeStorage } from '../utils/storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';

export const getApiUrl = (path) => `${API_BASE_URL}${path}`;

export const defaultFetchOptions = () => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`,
  },
});
