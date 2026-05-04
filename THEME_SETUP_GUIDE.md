# DaisyUI Theme System - Setup & Usage Guide

## 🎨 Overview

Your application now has a complete **light/dark mode theme system** using DaisyUI color palette. The theme is controlled via a React context and automatically persists to localStorage.

## 📋 What Was Updated

### 1. **Color Variables** (`globals.css`)
- **Light Mode (Default)**: Bright, clean palette
  - Background: `oklch(98% 0.003 247.858)` (near white)
  - Foreground: `oklch(20% 0.042 265.755)` (dark navy)
  - Primary: `#0B1957` (navy blue)

- **Dark Mode**: Professional dark palette
  - Background: `oklch(23% 0.02 258.8)` (dark gray-blue)
  - Foreground: `oklch(95% 0.01 260)` (light gray)
  - Primary: `oklch(65% 0.16 260)` (bright navy)

### 2. **Theme Provider** (`ThemeContext.tsx`)
- Global theme state management
- Supports: `'light'`, `'dark'`, `'system'` options
- Auto-syncs with system preferences
- Persists to localStorage

### 3. **Theme Initialization** (`layout.tsx`)
- Removed forced light mode
- Added system preference detection
- Smooth theme transitions on page load

### 4. **Theme UI Components** (`ThemeToggle.tsx`)
- `<ThemeToggle />` - Simple icon button (Sun/Moon)
- `<ThemeToggleDropdown />` - Full dropdown menu

## 🚀 How to Use

### Option 1: Add Theme Toggle to Navbar
```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between">
      {/* Your navbar content */}
      <ThemeToggle />
    </nav>
  );
}
```

### Option 2: Add Theme Dropdown to Settings
```tsx
import { ThemeToggleDropdown } from '@/components/ThemeToggle';

export function SettingsPage() {
  return (
    <div>
      <h2>Theme Settings</h2>
      <ThemeToggleDropdown />
    </div>
  );
}
```

### Option 3: Access Theme in Your Component
```tsx
'use client';

import { useTheme } from '@/contexts/ThemeContext';

export function MyComponent() {
  const { isDark, theme, setTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Is dark mode? {isDark ? '✓ Yes' : '✗ No'}</p>

      <button onClick={() => setTheme('light')}>Light Mode</button>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={() => setTheme('system')}>System Default</button>
    </div>
  );
}
```

## 🎯 Available CSS Color Variables

All variables automatically update when theme changes:

### Semantic Colors
```css
--primary              /* #0B1957 light, oklch(65% 0.16 260) dark */
--primary-foreground   /* Text on primary backgrounds */
--secondary            /* Secondary accent color */
--accent               /* Highlight/accent color */
--destructive          /* Error/delete actions */
--success              /* Success states */
--warning              /* Warning states */
```

### Layout Colors
```css
--background           /* Page/body background */
--foreground           /* Main text color */
--card                 /* Card/panel background */
--card-foreground      /* Card text color */
--border               /* Border color */
--input                /* Input field background */
--ring                 /* Focus ring color */
--muted                /* Disabled/secondary background */
```

### Component Colors
```css
--sidebar              /* Sidebar background */
--sidebar-foreground   /* Sidebar text */
--sidebar-primary      /* Sidebar primary color */
```

## 🎨 Using Colors in Components

### With Tailwind Classes
```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Primary Button
  </button>

  <div className="bg-card border border-border rounded-lg">
    <p className="text-foreground">Card content</p>
  </div>
</div>
```

### With CSS Variables
```css
.my-element {
  background-color: var(--background);
  color: var(--foreground);
  border: 1px solid var(--border);
}

.my-element:hover {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
```

## 📱 How It Works

### Initialization Flow
1. Page loads → Script checks localStorage for saved theme
2. If no saved theme → Uses system preference (`prefers-color-scheme`)
3. Adds `class="dark"` to `<html>` element if dark mode is active
4. CSS variables in `.dark` section override light mode values
5. Body transition: `transition: background-color 0.3s ease`

### Theme Switching
1. User clicks theme toggle
2. `setTheme()` updates React context
3. Saves preference to localStorage
4. Updates `<html class="dark">` class
5. CSS variables automatically update
6. Components re-render with new colors (auto via context)

### System Preference Sync
- If user selects "System", app watches `(prefers-color-scheme: dark)` media query
- Automatically switches when OS theme changes
- Respects user's OS-level dark mode preference

## ✨ Color Values Reference

### DaisyUI Light Theme
```
Base 100:     oklch(98% 0.003 247.858)     ← Background
Base 200:     oklch(96% 0.007 247.896)     ← Hover
Base 300:     oklch(92% 0.013 255.508)     ← Border
Base Content: oklch(20% 0.042 265.755)     ← Text

Primary:      #0B1957 (Navy Blue)
Success:      oklch(62% 0.194 149.214)     ← Green
Error:        oklch(65% 0.241 354.308)     ← Red
```

### DaisyUI Dark Theme
```
Base 100:     oklch(23% 0.02 258.8)        ← Background
Base 200:     oklch(28% 0.025 258)         ← Hover
Base 300:     oklch(33% 0.026 258)         ← Border
Base Content: oklch(95% 0.01 260)          ← Text

Primary:      oklch(65% 0.16 260)          ← Bright Blue
```

## 🔧 Customizing Theme Colors

To modify colors, edit `/web/src/app/globals.css`:

### Light Mode
```css
:root {
  --primary: #0B1957;          /* Change primary color */
  --background: oklch(...);    /* Change background */
  --success: oklch(...);       /* Change success color */
  /* ... etc */
}
```

### Dark Mode
```css
.dark {
  --primary: oklch(...);       /* Change primary in dark mode */
  --background: oklch(...);    /* Change dark background */
  /* ... etc */
}
```

## 🐛 Troubleshooting

### Theme not applying?
- Ensure `<html suppressHydrationWarning>` is in `layout.tsx` ✓
- Check that `ThemeProvider` wraps your entire app in `providers.tsx` ✓
- Clear browser cache and localStorage

### Colors not updating on switch?
- Make sure components use Tailwind color utilities (`bg-primary`, `text-foreground`)
- Or use CSS variables: `background: var(--primary)`
- Avoid hardcoded colors like `#000` or `rgb(255, 0, 0)`

### Dark class not appearing?
- Open DevTools → Elements tab
- Check `<html>` tag for `class="dark"`
- Check localStorage for `theme` key

## 📚 Component Examples

### Button Component
```tsx
<button className="
  bg-primary
  text-primary-foreground
  hover:bg-primary/90
  border border-border
  rounded-lg
  px-4 py-2
  transition-colors
">
  Click me
</button>
```

### Card Component
```tsx
<div className="
  bg-card
  text-card-foreground
  border border-border
  rounded-lg
  p-6
">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</div>
```

### Input Component
```tsx
<input
  className="
    bg-input
    text-foreground
    border border-border
    rounded-lg
    px-3 py-2
    focus:outline-none
    focus:ring-2
    focus:ring-ring
  "
  placeholder="Enter text..."
/>
```

## 🎬 Next Steps

1. **Add Theme Toggle** to your navbar/header using `<ThemeToggle />`
2. **Replace Hardcoded Colors** with Tailwind utilities and CSS variables
3. **Test Dark Mode** - Open DevTools and toggle the `dark` class
4. **Customize Colors** if needed in `globals.css`

## 📝 Files Changed

- ✅ `/web/src/app/globals.css` - Theme variables
- ✅ `/web/src/app/layout.tsx` - Theme initialization
- ✅ `/web/src/app/providers.tsx` - ThemeProvider wrapper
- ✨ `/web/src/contexts/ThemeContext.tsx` - Theme logic (NEW)
- ✨ `/web/src/components/ThemeToggle.tsx` - UI components (NEW)

---

**Theme is ready to use!** 🎉 Start adding `<ThemeToggle />` to your UI.
