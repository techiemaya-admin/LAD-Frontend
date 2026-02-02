import { safeStorage } from '../utils/storage';
import { envConfig } from '../../../sdk/shared/config';

// Use the unified shared environment configuration
const API_BASE_URL = envConfig.API_URL;

export const getApiUrl = (path) => `${API_BASE_URL}${path}`;

export const defaultFetchOptions = () => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${safeStorage.getItem('token')}`,
  },
});
