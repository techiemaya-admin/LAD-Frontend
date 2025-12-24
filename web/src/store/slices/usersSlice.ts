import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export interface User {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  capabilities?: string[];
  conversationLeads?: unknown[];
  organizationId?: string;
  phoneNumber?: string;
  timezone?: string;
  [key: string]: unknown;
}

interface UsersCache {
  isValid: boolean;
  expiresAt: number | null;
}

interface UsersState {
  // Team members data
  users: User[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  
  // Cache management
  cache: UsersCache;
}

/**
 * Users Slice
 * Manages team members and user data across the application
 */
const initialState: UsersState = {
  // Team members data
  users: [],
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Cache management
  cache: {
    isValid: false,
    expiresAt: null
  }
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // User data management
    setUsers(state, action: PayloadAction<User[]>) {
      state.users = action.payload || [];
      state.lastUpdated = Date.now();
      state.cache.isValid = true;
      state.cache.expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes cache
      state.error = null;
      state.loading = false;
      
      console.log('[UsersSlice] Set users:', state.users.length, 'users loaded');
    },
    
    addUser(state, action: PayloadAction<User>) {
      const newUser = action.payload;
      // Avoid duplicates
      const exists = state.users.find(u => u.id === newUser.id || u._id === newUser._id);
      if (!exists) {
        state.users.push(newUser);
        state.lastUpdated = Date.now();
        state.cache.isValid = false; // Invalidate cache on mutation
      }
    },
    
    updateUser(state, action: PayloadAction<{ id: string; updatedData: Partial<User> }>) {
      const { id, updatedData } = action.payload;
      const userIndex = state.users.findIndex(u => u.id === id || u._id === id);
      if (userIndex !== -1) {
        state.users[userIndex] = { ...state.users[userIndex], ...updatedData };
        state.lastUpdated = Date.now();
        state.cache.isValid = false;
      }
    },
    
    removeUser(state, action: PayloadAction<string>) {
      const userId = action.payload;
      state.users = state.users.filter(u => u.id !== userId && u._id !== userId);
      state.lastUpdated = Date.now();
      state.cache.isValid = false;
    },

    // Loading and error states
    setUsersLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when starting to load
      }
    },
    
    setUsersError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    
    clearUsersError(state) {
      state.error = null;
    },
    
    // Cache management
    invalidateUsersCache(state) {
      state.cache.isValid = false;
      state.cache.expiresAt = null;
    }
  }
});

export const {
  setUsers,
  addUser,
  updateUser,
  removeUser,
  setUsersLoading,
  setUsersError,
  clearUsersError,
  invalidateUsersCache
} = usersSlice.actions;

export default usersSlice.reducer;

// Base selectors
interface RootState {
  users: UsersState;
}

const selectUsersState = (state: RootState): UsersState => state.users || { ...initialState };

// Memoized selectors to prevent unnecessary re-renders
export const selectUsers = createSelector(
  [selectUsersState],
  (usersState): User[] => usersState.users || []
);

export const selectUsersLoading = createSelector(
  [selectUsersState],
  (usersState): boolean => usersState.loading || false
);

export const selectUsersError = createSelector(
  [selectUsersState],
  (usersState): string | null => usersState.error || null
);

export const selectUsersLastUpdated = createSelector(
  [selectUsersState],
  (usersState): number | null => usersState.lastUpdated || null
);

export const selectUsersCacheValid = createSelector(
  [selectUsersState],
  (usersState): boolean => {
    const cache = usersState.cache;
    if (!cache) return false;
    const { isValid, expiresAt } = cache;
    return isValid && expiresAt !== null && Date.now() < expiresAt;
  }
);

// Get user by ID - parameterized selector
export const selectUserById = createSelector(
  [selectUsers, (state: RootState, userId: string) => userId],
  (users, userId): User | null => users.find(u => u.id === userId || u._id === userId) || null
);

