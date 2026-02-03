// Redux slice for user settings (theme, language, timezone, etc.)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logger } from '@/lib/logger';
import { UserStorage } from '@/utils/userStorage';
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

let userStorage: UserStorage | null = null;

// Initialize user storage from auth
const initializeUserStorage = async (): Promise<void> => {
  try {
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    if (user?.id) {
      userStorage = new UserStorage(user.id);
    }
  } catch (e) {
    logger.debug('[Settings] Could not initialize user storage', { error: String(e) });
  }
};

// Load settings from user-scoped localStorage if available
const loadSettingsFromStorage = (): Partial<SettingsState> => {
  if (typeof window === 'undefined') return {};
  try {
    let stored: string | null = null;
    
    // Try user-scoped storage first
    if (userStorage) {
      stored = userStorage.getItem('app_settings');
    }
    
    // Fallback to regular localStorage
    if (!stored) {
      stored = localStorage.getItem('app_settings');
    }
    
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
// Save settings to user-scoped localStorage
const saveSettingsToStorage = (settings: SettingsState): void => {
  if (typeof window === 'undefined') return;
  try {
    const settingsJson = JSON.stringify(settings);
    // Try to save to user-scoped storage first
    if (userStorage) {
      userStorage.setItem('app_settings', settingsJson);
    } else {
      // Fallback to regular localStorage
      localStorage.setItem('app_settings', settingsJson);
    }
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[Settings] Saved to localStorage');
    }
  } catch (error) {
    logger.warn('Failed to save settings to localStorage', error);
  }
};
// Initialize user storage on app start
if (typeof window !== 'undefined') {
  initializeUserStorage();
}
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

// Always use default state during initial render to avoid hydration mismatch
const initialState: SettingsState = { ...defaultState };
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Rehydrate settings from storage (called client-side only)
    rehydrateSettings(state) {
      if (typeof window !== 'undefined') {
        const stored = loadSettingsFromStorage();
        Object.assign(state, stored);
      }
    },
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
export const { rehydrateSettings, setTheme, setLanguage, setCompanyName, setCompanyLogo, setUserSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
// Selector to get the settings object from state
export const selectSettings = (state: { settings: SettingsState }): SettingsState => state.settings;
