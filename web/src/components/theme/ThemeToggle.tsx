'use client';

import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-50 p-2.5 rounded-full transition-all duration-300"
      style={{
        background: theme === 'dark'
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.05)',
        border: theme === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : '1px solid rgba(0, 0, 0, 0.1)',
        color: theme === 'dark' ? '#ffffff' : '#000000',
      }}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} className="transition-transform duration-300 rotate-0" />
      ) : (
        <Moon size={20} className="transition-transform duration-300 rotate-0" />
      )}
    </button>
  );
}
