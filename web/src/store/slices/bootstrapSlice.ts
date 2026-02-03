import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface BootstrapState {
  loading: boolean;
  finished: boolean;
  error: string | null;
  snackbar: {
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    open: boolean;
    timestamp: number;
  } | null;
}
const initialState: BootstrapState = {
  loading: false,
  finished: false,
  error: null,
  snackbar: null,
};
const bootstrapSlice = createSlice({
  name: 'bootstrap',
  initialState,
  reducers: {
    setBootstrapLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setBootstrapFinished: (state, action: PayloadAction<boolean>) => {
      state.finished = action.payload;
    },
    setBootstrapError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    showSnackbar: (
      state,
      action: PayloadAction<{ message: string; severity: 'success' | 'error' | 'info' | 'warning' }>
    ) => {
      state.snackbar = {
        message: action.payload.message,
        severity: action.payload.severity,
        open: true,
        timestamp: Date.now(),
      };
    },
    hideSnackbar: (state) => {
      if (state.snackbar) {
        state.snackbar.open = false;
      }
    },
  },
});
export const {
  setBootstrapLoading,
  setBootstrapFinished,
  setBootstrapError,
  showSnackbar,
  hideSnackbar,
} = bootstrapSlice.actions;
export default bootstrapSlice.reducer;