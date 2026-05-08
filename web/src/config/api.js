import { safeStorage } from '@lad/shared/storage';  
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const getApiUrl = (path) => `${API_BASE_URL}${path}`;
export const defaultFetchOptions = () => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${safeStorage.getItem('token')}`,
  },
});
