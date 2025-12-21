import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import conversationReducer from './slices/conversationSlice';
import settingsReducer from './slices/settingsSlice';
import dashboardReducer from './slices/dashboardSlice';
import bootstrapReducer from './slices/bootstrapSlice';
import notificationReducer from './slices/notificationSlice';
import pipelineReducer from './slices/pipelineSlice';
import leadsReducer from './slices/leadsSlice';
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

// Debug: Log the initial state to verify masterData is initialized
console.log('[Store] Main store initialized with keys:', Object.keys(store.getState()));
console.log('[Store] masterData slice present:', !!store.getState().masterData);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
