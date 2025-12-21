import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export type DashboardState = {
  analytics: any;
  leadStats: any;
  loading: boolean;
  error: string | null;
  lastFetchParams: Record<string, unknown> | null;
  timePeriod: TimePeriod;
  customRange: { from: string; to: string };
};

const initialState: DashboardState = {
  analytics: null,
  leadStats: null,
  loading: false,
  error: null,
  lastFetchParams: null,
  timePeriod: 'month',
  customRange: { from: '', to: '' },
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setAnalytics(state, action: PayloadAction<any>) {
      state.analytics = action.payload;
    },
    setLeadStats(state, action: PayloadAction<any>) {
      state.leadStats = action.payload;
    },
    setDashboardLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setDashboardError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearDashboard(state) {
      state.analytics = null;
      state.leadStats = null;
      state.loading = false;
      state.error = null;
      state.lastFetchParams = null;
    },
    setLastFetchParams(state, action: PayloadAction<Record<string, unknown>>) {
      state.lastFetchParams = action.payload;
    },
    setTimePeriod(state, action: PayloadAction<TimePeriod>) {
      state.timePeriod = action.payload;
    },
    setCustomRange(state, action: PayloadAction<{ from: string; to: string }>) {
      state.customRange = action.payload;
    },
  },
});

export const {
  setAnalytics,
  setLeadStats,
  setDashboardLoading,
  setDashboardError,
  clearDashboard,
  setLastFetchParams,
  setTimePeriod,
  setCustomRange,
} = dashboardSlice.actions;

export const selectDashboard = (state: RootState): DashboardState => state.dashboard;

export default dashboardSlice.reducer;


