// Redux slice for authentication state management, including user info, theme, and localStorage sync
import { createSlice } from '@reduxjs/toolkit';
import { safeStorage } from '../utils/storage';

// Get initial state from localStorage if available
const getInitialState = () => {
  try {
    const storedAuth = safeStorage.getItem('auth');
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth);
      return {
        ...parsedAuth,
        loading: false,
        error: null,
      };
    }
  } catch (error) {
    console.error('Error reading auth from localStorage:', error);
  }
  // Default state if nothing in localStorage
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
    // Start login process
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    // Login successful, store user and update localStorage
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
      state.error = null;
      // Store auth state in localStorage
      try {
        safeStorage.setItem('auth', JSON.stringify({
          user: action.payload,
          isAuthenticated: true,
          theme: state.theme,
        }));
      } catch (error) {
        console.error('Error storing auth in localStorage:', error);
      }
    },
    // Login failed
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Logout user and clear localStorage
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      // Clear auth state from localStorage
      try {
        safeStorage.removeItem('auth');
      } catch (error) {
        console.error('Error clearing auth from localStorage:', error);
      }
    },
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
    // Toggle between light and dark theme, update localStorage
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      // Update theme in localStorage
      try {
        const storedAuth = safeStorage.getItem('auth');
        if (storedAuth) {
          const parsedAuth = JSON.parse(storedAuth);
          safeStorage.setItem('auth', JSON.stringify({
            ...parsedAuth,
            theme: state.theme,
          }));
        }
      } catch (error) {
        console.error('Error updating theme in localStorage:', error);
      }
    },
    // Update user profile and sync with localStorage
    updateUserProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      // Update user in localStorage
      try {
        const storedAuth = safeStorage.getItem('auth');
        if (storedAuth) {
          const parsedAuth = JSON.parse(storedAuth);
          safeStorage.setItem('auth', JSON.stringify({
            ...parsedAuth,
            user: state.user,
          }));
        }
      } catch (error) {
        console.error('Error updating user in localStorage:', error);
      }
    },
  },
});

// Export actions for use in components
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  toggleTheme,
  updateUserProfile,
} = authSlice.actions;

// Selector to get the user object from auth state
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer; 