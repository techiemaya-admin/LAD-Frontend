// Redux slice for user settings (theme, language, timezone, etc.)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logger } from '@/lib/logger';
// Initial state for settings
interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  timeFormat: '12' | '24';
  dateFormat: 'DD-MM-YYYY' | 'MM-DD-YYYY';
  companyName: string;
  companyLogo: string;
  [key: string]: unknown;
}
// Load settings from localStorage if available
const loadSettingsFromStorage = (): Partial<SettingsState> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Settings] Loaded from localStorage');
      }
      return parsed;
    }
  } catch (error) {
    logger.warn('Failed to load settings from localStorage', error);
  }
  return {};
};
// Save settings to localStorage
const saveSettingsToStorage = (settings: SettingsState): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[Settings] Saved to localStorage');
    }
  } catch (error) {
    logger.warn('Failed to save settings to localStorage', error);
  }
};
const defaultState: SettingsState = {
  theme: 'light',
  language: 'en',
  timezone: 'Asia/Kolkata',
  timeFormat: '24',
  dateFormat: 'DD-MM-YYYY',
  companyName: 'Techiemaya',
  companyLogo: 'https://agent.techiemaya.com/assets/logo-DtZyzd-3.png',
  // ...other settings as needed
};
const initialState: SettingsState = {
  ...defaultState,
  ...loadSettingsFromStorage()
};
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Set the theme (light/dark)
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
      saveSettingsToStorage(state);
    },
    // Set the language
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
      saveSettingsToStorage(state);
    },
    // Set the company name
    setCompanyName(state, action: PayloadAction<string>) {
      state.companyName = action.payload;
      saveSettingsToStorage(state);
    },
    // Set the company logo
    setCompanyLogo(state, action: PayloadAction<string>) {
      state.companyLogo = action.payload;
      saveSettingsToStorage(state);
    },
    // Set multiple user settings at once
    setUserSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      Object.assign(state, action.payload);
      saveSettingsToStorage(state);
    },
  },
});
// Export actions for use in components
export const { setTheme, setLanguage, setCompanyName, setCompanyLogo, setUserSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
// Selector to get the settings object from state
export const selectSettings = (state: { settings: SettingsState }): SettingsState => state.settings;