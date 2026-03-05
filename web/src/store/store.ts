import { configureStore } from '@reduxjs/toolkit';
import { logger } from '@/lib/logger';
import authReducer from './slices/authSlice';
import conversationReducer from './slices/conversationSlice';
import settingsReducer from './slices/settingsSlice';
import dashboardReducer from './slices/dashboardSlice';
import bootstrapReducer from './slices/bootstrapSlice';
import notificationReducer from './slices/notificationSlice';
import pipelineReducer from '../features/deals-pipeline/store/slices/pipelineSlice';
import leadsReducer from '../features/deals-pipeline/store/slices/leadsSlice';
import masterDataReducer from './slices/masterDataSlice';
import usersReducer from './slices/usersSlice';
import uiReducer from './slices/uiSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    conversation: conversationReducer,
    settings: settingsReducer,
    dashboard: dashboardReducer,
    bootstrap: bootstrapReducer,
    notification: notificationReducer,
    pipeline: pipelineReducer,
    leads: leadsReducer,
    masterData: masterDataReducer,
    users: usersReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});
// Debug: Log the initial state to verify masterData is initialized (development only)
if (process.env.NODE_ENV === 'development') {
  logger.debug('[Store] Main store initialized with keys:', {
    keys: Object.keys(store.getState()),
    masterDataPresent: !!store.getState().masterData
  });
}
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;