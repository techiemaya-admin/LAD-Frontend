// Redux slice for user settings (theme, language, timezone, etc.)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
      console.log('[Settings] Loaded from localStorage:', { companyLogo: parsed.companyLogo?.substring(0, 50) + '...' });
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  return {};
};

// Save settings to localStorage
const saveSettingsToStorage = (settings: SettingsState): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    console.log('[Settings] Saved to localStorage:', { companyLogo: settings.companyLogo?.substring(0, 50) + '...' });
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
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

