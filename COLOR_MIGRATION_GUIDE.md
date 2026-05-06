# Color Migration Guide - Moving to DaisyUI Theme System

This guide helps you migrate existing hardcoded colors to the new DaisyUI theme system.

## 🔄 Color Mapping Reference

### Find & Replace Guide

#### **Backgrounds**
```
#f2f7ff      → bg-background       (Light: oklch(98%...), Dark: oklch(23%...))
#ffffff      → bg-base-100         (White → Light gray in dark mode)
#0b1957      → bg-primary          (Navy → Bright blue in dark mode)
```

#### **Text Colors**
```
#111b21 (dark gray)  → text-foreground        (Auto-inverts in dark mode)
#666666 (medium)     → text-muted-foreground  (Auto-inverts in dark mode)
#ffffff (white)      → text-primary-foreground
```

#### **Borders**
```
#e0e0e0 (light gray)     → border-border           (Auto-inverts in dark mode)
#d0d0d0 (slightly darker) → border-base-300 / border-border
#999999 (medium)         → border-muted-foreground
```

#### **Accent Colors**
```
#0B1957 (navy)  → text-primary         (Main brand color)
#0B1957 (navy)  → bg-accent            (Highlight backgrounds)
Green (#0d8436) → bg-success / text-success
Red (#e74c3c)   → bg-destructive / text-destructive
```

## 📝 Before & After Examples

### Example 1: Button Component

**BEFORE:**
```tsx
<button
  style={{
    backgroundColor: '#0b1957',
    color: '#ffffff',
    borderColor: '#e0e0e0'
  }}
  className="px-4 py-2 rounded"
>
  Click me
</button>
```

**AFTER:**
```tsx
<button
  className="
    bg-primary
    text-primary-foreground
    border border-border
    px-4 py-2 rounded
    hover:bg-primary/90
    transition-colors
  "
>
  Click me
</button>
```

### Example 2: Card Component

**BEFORE:**
```tsx
<div
  style={{
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
    color: '#111b21'
  }}
  className="p-4 rounded border"
>
  <h3 style={{ color: '#0b1957' }}>Title</h3>
  <p style={{ color: '#666666' }}>Description</p>
</div>
```

**AFTER:**
```tsx
<div className="bg-card text-card-foreground border border-border p-4 rounded">
  <h3 className="text-primary font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Example 3: Status Badge

**BEFORE:**
```tsx
<span
  style={{
    backgroundColor: '#0d8436',
    color: '#ffffff',
    padding: '4px 8px'
  }}
  className="rounded-full text-sm"
>
  Active
</span>
```

**AFTER:**
```tsx
<span className="
  bg-success
  text-success-foreground
  px-2 py-1 rounded-full text-sm
">
  Active
</span>
```

### Example 4: Input Field

**BEFORE:**
```tsx
<input
  style={{
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
    color: '#111b21'
  }}
  className="px-3 py-2 rounded border"
  placeholder="Enter text..."
/>
```

**AFTER:**
```tsx
<input
  className="
    bg-input
    text-foreground
    border border-border
    px-3 py-2 rounded
    placeholder:text-muted-foreground
    focus:outline-none
    focus:ring-2
    focus:ring-ring
  "
  placeholder="Enter text..."
/>
```

### Example 5: Hover States

**BEFORE:**
```tsx
<div
  style={{
    backgroundColor: '#ffffff',
    color: '#0b1957'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#f2f7ff';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#ffffff';
  }}
  className="p-4 cursor-pointer transition"
>
  Hover me
</div>
```

**AFTER:**
```tsx
<div className="
  bg-base-100
  hover:bg-base-200
  text-base-content
  p-4
  cursor-pointer
  transition-colors
  rounded
">
  Hover me
</div>
```

## 🎨 Tailwind Color Utilities Reference

### Background Colors
```
bg-background       → Page background
bg-base-100        → Light backgrounds
bg-base-200        → Hover state backgrounds
bg-primary         → Primary actions
bg-accent          → Highlights/accents
bg-card            → Card containers
bg-input           → Input field backgrounds
bg-destructive     → Danger/error backgrounds
bg-success         → Success backgrounds
```

### Text Colors
```
text-foreground                → Main text
text-base-content             → Text on base backgrounds
text-primary                  → Primary colored text
text-primary-foreground       → Text on primary backgrounds
text-muted-foreground         → Disabled/secondary text
text-destructive              → Error/danger text
text-success                  → Success text
```

### Border Colors
```
border-border        → Default borders
border-base-300      → Alternative borders
```

### Opacity Variants
```
bg-primary/10       → 10% opacity
text-foreground/60  → 60% opacity
border-border/50    → 50% opacity

Works with all color utilities!
```

## 🔍 Migration Checklist

### Search for these patterns:
- [ ] `style={{` - Inline styles with colors
- [ ] `backgroundColor:` - Background color styles
- [ ] `color:` - Text color styles
- [ ] `borderColor:` - Border color styles
- [ ] `#[0-9a-f]{6}` - Hex color codes
- [ ] `rgb(` - RGB color values
- [ ] `hsl(` - HSL color values
- [ ] Tailwind colors like `bg-gray-100`, `text-blue-600` (replace with semantic colors)

## 🎯 Priority Migrations

### High Priority (Visual Impact)
1. **Navbar/Header** - Most visible
2. **Buttons & CTAs** - User interactions
3. **Cards & Containers** - Main layout
4. **Input Fields** - Forms and user input
5. **Status Badges** - Key information

### Medium Priority
6. **Typography colors** - Consistency
7. **Hover states** - User feedback
8. **Focus rings** - Accessibility
9. **Borders & dividers** - Visual structure
10. **Modal/Dialog** - Secondary UI

### Low Priority
11. **Animations** - Cosmetic only
12. **Shadows** - Depth perception
13. **Background patterns** - Decorative

## 💡 Pro Tips

### 1. Use Opacity for Variations
Instead of different colors, use opacity:
```tsx
<!-- Instead of creating multiple colors -->
<div className="bg-primary/10">Light primary</div>
<div className="bg-primary/50">Medium primary</div>
<div className="bg-primary/90">Dark primary</div>
```

### 2. Combine Utilities for States
```tsx
<button className="
  bg-base-200        <!-- Default background -->
  hover:bg-primary   <!-- Hover state -->
  active:bg-primary/90
  disabled:opacity-50
  disabled:cursor-not-allowed
  transition-colors
">
  Interactive Button
</button>
```

### 3. Use Color Pairs
Colors work in pairs:
```tsx
<button className="bg-primary text-primary-foreground">
  Correct - contrasting text
</button>
<button className="bg-success text-success-foreground">
  Correct - contrasting text
</button>
```

### 4. Accessibility Helpers
```tsx
<!-- Focus states for keyboard users -->
<input className="
  focus:outline-none
  focus:ring-2
  focus:ring-ring      ← Uses --ring color
  focus:ring-offset-2
  focus:ring-offset-background
"/>
```

## 📊 Color Palette Quick Reference

### Light Mode (Default)
| Purpose | Color Value | Utility |
|---------|-------------|---------|
| Background | oklch(98% 0.003 247.858) | `bg-background` |
| Foreground | oklch(20% 0.042 265.755) | `text-foreground` |
| Primary | #0B1957 | `bg-primary`, `text-primary` |
| Success | oklch(62% 0.194 149.214) | `bg-success` |
| Error | oklch(65% 0.241 354.308) | `bg-destructive` |
| Border | oklch(92% 0.013 255.508) | `border-border` |

### Dark Mode (Automatic)
| Purpose | Color Value | Utility |
|---------|-------------|---------|
| Background | oklch(23% 0.02 258.8) | `bg-background` |
| Foreground | oklch(95% 0.01 260) | `text-foreground` |
| Primary | oklch(65% 0.16 260) | `bg-primary`, `text-primary` |
| Success | oklch(62% 0.194 149.214) | `bg-success` |
| Error | oklch(65% 0.241 354.308) | `bg-destructive` |
| Border | oklch(33% 0.026 258) | `border-border` |

## ✅ Validation

After migrating a component:
1. Switch to light mode - does it look good?
2. Switch to dark mode - does it look good?
3. Check contrast ratios (should be 4.5:1 for text)
4. Test on mobile devices
5. Check keyboard focus states

---

**Happy Migrating!** 🎉
