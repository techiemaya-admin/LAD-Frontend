import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { safeStorage } from '../../utils/storage';
export type AuthUser = {
  id?: string;
  name?: string;
  role?: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown;
} | null;
export type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
};
const getInitialState = (): AuthState => {
  try {
    if (typeof window !== 'undefined') {
      const storedAuth = safeStorage.getItem('auth');
      if (storedAuth) {
        const parsedAuth = JSON.parse(storedAuth);
        return {
          user: parsedAuth.user ?? null,
          isAuthenticated: Boolean(parsedAuth.isAuthenticated),
          loading: false,
          error: null,
          theme: (parsedAuth.theme as 'light' | 'dark') ?? 'light',
        };
      }
    }
  } catch {
    // ignore and fall back to defaults
  }
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    theme: 'light',
  };
};
const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<NonNullable<AuthUser>>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
      state.error = null;
      try {
        if (typeof window !== 'undefined') {
          safeStorage.setItem(
            'auth',
            JSON.stringify({ user: action.payload, isAuthenticated: true, theme: state.theme })
          );
        }
      } catch {}
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      try {
        if (typeof window !== 'undefined') {
          safeStorage.removeItem('auth');
        }
      } catch {}
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      try {
        if (typeof window !== 'undefined') {
          const storedAuth = safeStorage.getItem('auth');
          const parsed = storedAuth ? JSON.parse(storedAuth) : {};
          safeStorage.setItem('auth', JSON.stringify({ ...parsed, theme: state.theme }));
        }
      } catch {}
    },
    updateUserProfile: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.user = { ...(state.user ?? {}), ...action.payload } as NonNullable<AuthUser>;
      try {
        if (typeof window !== 'undefined') {
          const storedAuth = safeStorage.getItem('auth');
          const parsed = storedAuth ? JSON.parse(storedAuth) : {};
          safeStorage.setItem('auth', JSON.stringify({ ...parsed, user: state.user }));
        }
      } catch {}
    },
  },
});
export const { loginStart, loginSuccess, loginFailure, logout, clearError, toggleTheme, updateUserProfile } = authSlice.actions;
export const selectUser = (state: any) => state.auth.user;
export const selectIsAuthenticated = (state: any) => state.auth.isAuthenticated;
export default authSlice.reducer;