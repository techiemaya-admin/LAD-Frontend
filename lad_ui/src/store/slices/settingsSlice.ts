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

const initialState: SettingsState = {
  theme: 'light',
  language: 'en',
  timezone: 'Asia/Kolkata',
  timeFormat: '24',
  dateFormat: 'DD-MM-YYYY',
  companyName: 'Techiemaya',
  companyLogo: 'https://agent.techiemaya.com/assets/logo-DtZyzd-3.png',
  // ...other settings as needed
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Set the theme (light/dark)
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
    // Set the language
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    // Set the company name
    setCompanyName(state, action: PayloadAction<string>) {
      state.companyName = action.payload;
    },
    // Set the company logo
    setCompanyLogo(state, action: PayloadAction<string>) {
      state.companyLogo = action.payload;
    },
    // Set multiple user settings at once
    setUserSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      Object.assign(state, action.payload);
    },
  },
});

// Export actions for use in components
export const { setTheme, setLanguage, setCompanyName, setCompanyLogo, setUserSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

// Selector to get the settings object from state
export const selectSettings = (state: { settings: SettingsState }): SettingsState => state.settings;

