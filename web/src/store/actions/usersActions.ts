import { 
  setUsers, 
  setUsersLoading, 
  setUsersError, 
  clearUsersError,
  addUser,
  updateUser as updateUserInSlice,
  removeUser,
  selectUsersCacheValid
} from '../slices/usersSlice';

// Fixed import - only importing functions that actually exist in userService
import { 
  getAllUsers, 
  createUser, 
  updateUserRole, 
  updateUserCapabilities, 
  deleteUser 
} from '../../services/userService';

import { AppDispatch, RootState } from '../store';
import { User } from '../slices/usersSlice';

// Thunk type
type AppThunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void> | void;

// ============ USERS ACTIONS ============
// Updated: Fixed import issues - using correct service functions

// Fetch users with cache management
export const fetchUsersAction = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  
  // Check cache validity
  const cacheValid = selectUsersCacheValid(state);
  if (cacheValid) {
    console.log('[Redux] Users cache valid, skipping fetch');
    return;
  }
  
  try {
    dispatch(setUsersLoading(true));
    dispatch(clearUsersError());
    
    console.log('[Redux] Fetching users from API...');
    const users = await getAllUsers();
    
    dispatch(setUsers(users as User[]));
    console.log('[Redux] Users loaded successfully:', (users as User[])?.length || 0);
    
  } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to fetch users:', error);
    dispatch(setUsersError(err.message || 'Failed to fetch users'));
  } finally {
    dispatch(setUsersLoading(false));
  }
};

// Force refresh users (ignore cache)
export const refreshUsersAction = (): AppThunk => async (dispatch) => {
  try {
    dispatch(setUsersLoading(true));
    dispatch(clearUsersError());
    
    console.log('[Redux] Force refreshing users from API...');
    const users = await getAllUsers();
    
    dispatch(setUsers(users as User[]));
    console.log('[Redux] Users refreshed successfully:', (users as User[])?.length || 0);
    
  } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to refresh users:', error);
    dispatch(setUsersError(err.message || 'Failed to refresh users'));
  } finally {
    dispatch(setUsersLoading(false));
  }
};

// Create new user
export const createUserAction = (userData: Partial<User>): AppThunk => async (dispatch) => {
  try {
    console.log('[Redux] Creating new user...', userData);
    const newUser = await createUser(userData);
    
    dispatch(addUser((newUser as { user?: User; id?: string }).user || newUser as User));
    console.log('[Redux] User created successfully:', (newUser as { user?: User; id?: string }).user?.id || (newUser as { id?: string }).id);
    
  } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to create user:', error);
    dispatch(setUsersError(err.message || 'Failed to create user'));
    throw error;
  }
};

// Update existing user
export const updateUserAction = (userId: string, userData: { role?: string; capabilities?: string[]; [key: string]: unknown }): AppThunk => async (dispatch) => {
  try {
    console.log('[Redux] Updating user...', userId, userData);
    
    let updatedUser: User;
    if (userData.role !== undefined) {
      // Update user role and capabilities
      updatedUser = await updateUserRole(userId, userData.role, userData.capabilities || []) as User;
    } else if (userData.capabilities !== undefined) {
      // Update just capabilities
      updatedUser = await updateUserCapabilities(userId, userData.capabilities) as User;
    } else {
      throw new Error('No supported update fields provided');
    }
    
    dispatch(updateUserInSlice({ id: userId, updatedData: updatedUser }));
    console.log('[Redux] User updated successfully:', userId);
    
  } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to update user:', error);
    dispatch(setUsersError(err.message || 'Failed to update user'));
    throw error;
  }
};

// Delete user
export const deleteUserAction = (userId: string): AppThunk => async (dispatch) => {
  try {
    console.log('[Redux] Deleting user...', userId);
    await deleteUser(userId);
    
    dispatch(removeUser(userId));
    console.log('[Redux] User deleted successfully:', userId);
    
  } catch (error) {
    const err = error as Error;
    console.error('[Redux] Failed to delete user:', error);
    dispatch(setUsersError(err.message || 'Failed to delete user'));
    throw error;
  }
};

// Load users if not already loaded or cache expired
export const ensureUsersLoadedAction = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  const users = state.users?.users || [];
  const cacheValid = selectUsersCacheValid(state);
  
  // Only load if we have no users or cache is invalid
  if (users.length === 0 || !cacheValid) {
    await dispatch(fetchUsersAction());
  }
};

