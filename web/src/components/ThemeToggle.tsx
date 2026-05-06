'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { isDark, setTheme, theme } = useTheme();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 select-none"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-accent" />
      ) : (
        <Moon className="h-5 w-5 text-primary" />
      )}
    </button>
  );
}

export function ThemeToggleDropdown() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`rounded-lg px-4 py-2 text-left transition-colors active:scale-95 select-none ${
          theme === 'light'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent/10'
        }`}
      >
        <Sun className="mb-1 inline-block h-4 w-4" /> Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`rounded-lg px-4 py-2 text-left transition-colors active:scale-95 select-none ${
          theme === 'dark'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent/10'
        }`}
      >
        <Moon className="mb-1 inline-block h-4 w-4" /> Dark
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`rounded-lg px-4 py-2 text-left transition-colors active:scale-95 select-none ${
          theme === 'system'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent/10'
        }`}
      >
        <span className="mb-1 inline-block">🖥️</span> System
      </button>
    </div>
  );
}
