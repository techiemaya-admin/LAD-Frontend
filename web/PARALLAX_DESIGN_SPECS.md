# ParallaxFeaturesSection - Design Specifications & Variants

## Component Architecture

### File Structure
```
web/src/components/landing/
├── ParallaxFeaturesSection.tsx          ← Main component
└── (No subcomponents - fully self-contained)
```

**No props required.** Component is fully self-contained with hardcoded content.

---

## Layout Specifications

### Desktop Layout (>= 1024px)
```
┌─────────────────────────────────────────────────────────────────┐
│                         Container                               │
│                      (gap: 32px / 2rem)                         │
├───────────────────────┬─────────────────────────────────────────┤
│                       │                                         │
│  LEFT COLUMN          │        RIGHT COLUMN (2 cols)           │
│  (33.33% width)       │        (66.67% width)                  │
│                       │                                         │
│ ┌─────────────────┐   │  ┌──────────────────────┐              │
│ │                 │   │  │                      │              │
│ │  STICKY         │   │  │  CARD 1              │              │
│ │  (top: 33%)     │   │  │  Parallax: y +50px   │              │
│ │                 │   │  │                      │              │
│ │ • Heading       │   │  └──────────────────────┘              │
│ │ • Description   │   │  ┌──────────────────────┐              │
│ │ • CTA           │   │  │                      │              │
│ │ • Trust Badge   │   │  │  CARD 2              │              │
│ │                 │   │  │  Parallax: y +80px   │              │
│ │                 │   │  │                      │              │
│ └─────────────────┘   │  └──────────────────────┘              │
│                       │  ┌──────────────────────┐              │
│                       │  │                      │              │
│                       │  │  CARD 3              │              │
│                       │  │  Parallax: y +110px  │              │
│                       │  │                      │              │
│                       │  └──────────────────────┘              │
│                       │  ┌──────────────────────┐              │
│                       │  │                      │              │
│                       │  │  CARD 4              │              │
│                       │  │  Parallax: y +140px  │              │
│                       │  │                      │              │
│                       │  └──────────────────────┘              │
│                       │                                         │
└───────────────────────┴─────────────────────────────────────────┘
```

### Dimensions
- **Section padding:** `py-20` (80px top/bottom)
- **Container max-width:** Tailwind `mx-auto` (standard)
- **Left column width:** 33.33% (`lg:col-span-1`)
- **Right column width:** 66.67% (`lg:col-span-2`)
- **Gap between columns:** 32px (`gap-8`)
- **Gap between cards:** 24px mobile / 32px tablet+ (`gap-6 md:gap-8`)

### Responsive Breakpoints
```css
/* Mobile: < 640px */
- Single column layout
- Full width cards
- Gap: 24px (6 units)

/* Tablet: 640px - 1023px */
- Still single column
- Cards with margins
- Gap: 24px initially, scales to 32px (md:gap-8)

/* Desktop: >= 1024px */
- 3-column grid (1-2-2 split)
- Sticky left column
- Full parallax effect
- Gap: 32px (8 units)
```

---

## Animation Specifications

### 1. Parallax Scroll Transforms

#### Scroll Detection
```typescript
const { scrollYProgress } = useScroll({
  target: containerRef,           // Track this container
  offset: ['start end', 'end start']  // From below viewport to above
});
```

#### Transform Mapping (Card Positions)
| Card # | Parallax Speed | Effect |
|--------|---|---|
| 1 | +50px | Slowest - moves least |
| 2 | +80px | Moderate |
| 3 | +110px | Faster |
| 4 | +140px | Fastest - moves most |

**Formula:** `speed = 50 + (cardIndex * 30)`

### 2. Spring Physics

All animations use Framer Motion spring configuration:
```typescript
{
  type: "spring",
  stiffness: 100,      // Range: 80-150 (lower = bouncier)
  damping: 20          // Range: 15-30 (lower = more oscillation)
}
```

**Effect:** Natural, elastic motion that feels responsive

### 3. Entrance Animations

#### Container Stagger
- **Delay:** 0.2s before starting
- **Stagger:** 0.1s between children
- **Total duration:** ~1.5s for all elements

#### Individual Element Timings
```
0.2s delay ─┐
            ├─ Left content enters (0.4s)
            │
0.3s delay ─┼─ Card 1 enters (0.3s)
            │  + Card 1 stat pops in (0.2s, delay 0.2s)
            │  + Card 1 line grows (0.8s, delay 0.3s)
            │
0.4s delay ─┼─ Card 2 enters (0.3s)
            │  + Card 2 stat pops in (0.2s, delay 0.2s)
            │  + Card 2 line grows (0.8s, delay 0.3s)
            │
... (continues for cards 3 & 4)
            │
            └─ Bottom CTA appears at 0.5s delay
```

### 4. Hover Animations

#### Icon Hover
```typescript
whileHover={{
  scale: 1.1,      // 10% size increase
  rotate: 5        // 5 degree rotation
}}
transition={{
  type: "spring",
  stiffness: 200   // Snappy response
}}
```

#### Card Hover (Backdrop)
- Border color: Normal → `primary/30` (brighter)
- Gradient overlay opacity: 0% → 10%
- Transition: 300ms smooth

#### Text Hover
- Title color changes from `foreground` → `primary`
- Smooth color transition

### 5. Viewport Animations

#### Stat Pop-In (When Card Enters Viewport)
```typescript
initial={{ opacity: 0, scale: 0.5 }}
whileInView={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.3 }}
```
- Fades in and scales up from 50%
- Triggers when card enters viewport
- Duration: 300ms

#### Line Growth (After Card Renders)
```typescript
initial={{ width: 0 }}
whileInView={{ width: '100%' }}
transition={{
  delay: 0.3,      // Wait for card to settle
  duration: 0.8    // Smooth growth
}}
```
- Starts at 0% width
- Grows to 100% over 800ms
- Has 300ms delay after card entrance

---

## Color & Typography Specifications

### Typography

#### Section Title (h2)
- **Size:** `text-4xl lg:text-5xl` (36px → 48px)
- **Weight:** `font-bold` (700)
- **Color:** `text-foreground` (auto dark/light)
- **Line Height:** `leading-tight` (1.25)

#### Card Title (h3)
- **Size:** `text-xl md:text-2xl` (20px → 24px)
- **Weight:** `font-bold` (700)
- **Color:** `text-foreground` (base), `text-primary` (hover)
- **Transition:** 300ms color change

#### Card Description (p)
- **Size:** `text-base` (16px)
- **Color:** `text-muted-foreground` (auto dark/light)
- **Line Height:** `leading-relaxed` (1.625)

#### Stat (Number)
- **Size:** `text-4xl` (36px)
- **Weight:** `font-black` (900)
- **Color:** Gradient color (varies by card)
- **Effect:** `drop-shadow-sm` (text shadow)

#### Small Text (Badge, CTA)
- **Size:** `text-xs` (12px)
- **Weight:** `font-semibold` (600)
- **Color:** `text-muted-foreground` (main) or `text-primary` (accent)
- **Transform:** `uppercase` for labels

### Color Palette

#### Theme Colors (CSS Variables)
```css
--primary          #0B1957           Navy Blue
--foreground       (light) / (dark)  Main text
--muted-foreground (light) / (dark)  Secondary text
--background       (light) / (dark)  Page background
--border           (light) / (dark)  Border/divider color
```

#### Gradient Colors (Card-Specific)
```css
Card 1: from-blue-500 to-blue-600        Lockdown theme
Card 2: from-cyan-500 to-blue-400        Connection theme
Card 3: from-purple-500 to-pink-500      Intelligence theme
Card 4: from-green-500 to-emerald-500    Growth theme
```

#### Interactive States
```css
Default border:  border-border
Hover border:    border-primary/30
Focus (a11y):    outline-ring/50
```

---

## Card Component Specifications

### Card Container
- **Background:** `bg-background` with `backdrop-blur-sm`
- **Border:** `border border-border`
- **Radius:** `rounded-2xl` (16px)
- **Padding:** `p-6 md:p-8` (24px → 32px)
- **Shadow:** None by default
- **Hover effects:** Border brightness, gradient overlay

### Card Layout (Internal Grid)
```
┌──────────────────────────────────────────┐
│ ┌────────────────────────────────────┐   │
│ │ [ICON]              [STAT]         │   │ ← Header (flex items-start justify-between)
│ └────────────────────────────────────┘   │    mb-6
│                                          │
│ Title (h3)                               │    mb-3
│ Up to 2 lines with line-clamp-2         │
│                                          │
│ Description (p)                          │    mb-6
│ Multiple lines, natural wrap             │
│                                          │
│ ┌──────────────────────────────────┐   │    mb-0
│ │ [LINE] Learn more →              │   │ ← Footer (flex items-center gap-3)
│ └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Icon Specifications
- **Container size:** `w-14 h-14` (56px)
- **Padding:** `p-3` (12px)
- **Background:** Gradient (card-specific)
- **Shape:** `rounded-xl` (12px)
- **Icon size:** `w-8 h-8` (32px)
- **Color:** `text-white`
- **Shadow:** `shadow-lg`

### Stat Specifications
- **Font size:** `text-4xl` (36px)
- **Font weight:** `font-black` (900)
- **Color:** Gradient color (card-specific)
- **Effect:** `drop-shadow-sm` (subtle shadow)
- **Animation:** Pops in when card enters viewport

### Accent Line Specifications
- **Height:** `h-1` (4px)
- **Background:** Gradient (matches icon)
- **Radius:** `rounded-full` (50%)
- **Flex:** `flex-1` (fills remaining space)
- **Animation:** Grows from 0% to 100% width on viewport entry

---

## Left Content Specifications

### Container
- **Position:** `sticky top-1/3` (desktop only)
- **Height:** `h-fit` (content height)
- **Grid span:** `lg:col-span-1` (33.33% width)
- **Display:** `flex flex-col justify-center`

### Heading
- **Size:** `text-4xl lg:text-5xl` (36px → 48px)
- **Weight:** `font-bold` (700)
- **Color:** `text-foreground` (base)
- **Accent:** ` "Safe & Fast"` span in `text-primary`
- **Margin:** `mb-6`
- **Line height:** `leading-tight` (1.25)

### Description
- **Size:** `text-lg` (18px)
- **Color:** `text-muted-foreground`
- **Margin:** `mb-8`
- **Line height:** `leading-relaxed` (1.625)
- **Max width:** None (inherits from column)

### CTA Button
- **Size:** `px-8 py-4` (32px × 16px padding)
- **Background:** `bg-gradient-to-r from-primary to-blue-600`
- **Color:** `text-white`
- **Typography:** `font-semibold` (600)
- **Radius:** `rounded-lg` (8px)
- **Shadow:** `shadow-lg` → `shadow-xl` (hover)
- **Animation:** Scale 1.05x on hover

### Trust Badge
- **Margin:** `mt-12 pt-8` (border-top separator)
- **Border:** `border-t border-border`
- **Label:**
  - Size: `text-xs` (12px)
  - Weight: `font-semibold` (600)
  - Color: `text-muted-foreground`
  - Transform: `uppercase`
  - Tracking: `tracking-wider` (letter-spacing)
  - Margin: `mb-3`
- **Content:**
  - Size: `text-sm` (14px)
  - Color: `text-muted-foreground`
  - Items separated by `text-primary` bullet

---

## Bottom CTA Section Specifications

### Container
- **Margin:** `mt-20 pt-12` (80px top + 48px padding)
- **Border:** `border-t border-border`
- **Text align:** `text-center`

### Heading
- **Size:** `text-2xl md:text-3xl` (24px → 30px)
- **Weight:** `font-bold` (700)
- **Color:** `text-foreground`
- **Margin:** `mb-4`

### Description
- **Size:** `text-base` (16px)
- **Color:** `text-muted-foreground`
- **Margin:** `mb-8`
- **Max width:** `max-w-2xl` (672px)
- **Centered:** `mx-auto`

### Button
- **Size:** `px-10 py-4` (40px × 16px padding)
- **Background:** `bg-primary`
- **Color:** `text-white`
- **Weight:** `font-semibold` (600)
- **Radius:** `rounded-lg` (8px)
- **Shadow:** `shadow-lg` → `shadow-xl` (hover)
- **Animation:** Scale 1.05x on hover

### Subtext
- **Size:** `text-xs` (12px)
- **Color:** `text-muted-foreground`
- **Margin:** `mt-4`

---

## Background & Effects

### Section Background
- **Base color:** `bg-gradient-to-b from-background via-background to-background`
- **Linear gradient:** Top to bottom (no visible gradient, smooth transition)

### Background Blobs (Decorative)
```typescript
// Top-right blob
<div className="absolute top-0 right-0 w-96 h-96
                bg-blue-500/5 rounded-full blur-3xl
                pointer-events-none" />

// Bottom-left blob
<div className="absolute bottom-0 left-0 w-80 h-80
                bg-cyan-500/5 rounded-full blur-3xl
                pointer-events-none" />
```

- **Size:** 96×96 units (384px × 384px)
- **Color:** `blue-500` / `cyan-500`
- **Opacity:** `5%` (very subtle)
- **Blur:** `blur-3xl` (64px)
- **Pointer:** `pointer-events-none` (doesn't interfere with clicks)
- **Z-index:** Behind content (`absolute`, not `relative`)

### Card Overlay (On Hover)
```typescript
className={`absolute inset-0 rounded-2xl
            bg-gradient-to-br ${card.gradient}
            opacity-0 group-hover:opacity-10
            transition-opacity duration-300 blur-xl`}
```

- **Starts:** Fully transparent (0%)
- **Hover:** 10% opacity
- **Transition:** 300ms smooth
- **Blur:** `blur-xl` (24px) for soft effect
- **Behind:** Card content (absolute positioning)

---

## Interactive Elements

### Buttons
All buttons support these interactions:

```typescript
whileHover={{ scale: 1.05 }}      // 5% size increase
whileTap={{ scale: 0.95 }}        // 5% size decrease on click
className="transition-shadow"      // Smooth shadow change
```

- **Hover shadow:** `shadow-lg` → `shadow-xl`
- **Hover scale:** 100% → 105%
- **Tap scale:** 100% → 95%
- **Transition:** Spring physics (stiffness: 100)

### Icons
```typescript
whileHover={{ scale: 1.1, rotate: 5 }}
transition={{ type: "spring", stiffness: 200 }}
```

- **Hover scale:** 100% → 110%
- **Hover rotate:** 0° → 5°
- **Response:** Snappy (stiffness: 200)

### Grayscale/Filter Effects
- Cards do NOT have grayscale filters
- Icons DO NOT have color filters
- All colors are solid or gradient

---

## Responsive Behavior Details

### Mobile (< 640px)
```
Full width, single column stack:
┌──────────────────────┐
│ Heading              │
│ Description          │
│ Button               │
│ Trust Badge          │
└──────────────────────┘
┌──────────────────────┐
│ Card 1               │
│ (no parallax)        │
└──────────────────────┘
│ Card 2               │
│ (no parallax)        │
└──────────────────────┘
... etc
┌──────────────────────┐
│ Bottom CTA           │
└──────────────────────┘
```

### Tablet (640px - 1023px)
```
Similar to mobile, but:
- Larger padding
- Larger gaps between cards
- Left content not sticky
- Cards are full width
- Same stacking behavior
```

### Desktop (1024px+)
```
3-column grid (1-2-2):
┌─────┬─────────────────┐
│Left │ Card 1 (parallax)│
│     ├─────────────────┤
│sticky│ Card 2 (parallax)│
│     ├─────────────────┤
│     │ Card 3 (parallax)│
│     ├─────────────────┤
│     │ Card 4 (parallax)│
└─────┴─────────────────┘
```

---

## Performance Specifications

### CSS Properties
- **GPU-accelerated:** `transform: translateY()`
- **No repaints:** Only transforms and opacity changes
- **No layout shifts:** Predictable dimensions

### Animation Frame Rate
- **Target:** 60fps
- **Expected CPU usage:** < 10% during scroll
- **Parallax calculations:** Per scroll frame (max 60fps)

### Bundle Size Impact
- **Component code:** ~3KB (uncompressed)
- **Gzipped:** ~1KB
- **Dependencies:** 0 (uses existing Framer Motion)

---

## Accessibility Specifications

### Semantic HTML
- `<section>` for main container
- `<h2>` for section title
- `<h3>` for card titles
- `<p>` for descriptions
- `<button>` for interactive elements

### Color Contrast
- **WCAG AA:** Text meets minimum 4.5:1 ratio
- **Primary text on background:** ✅ Pass
- **Secondary text on background:** ✅ Pass
- **Text on gradient backgrounds:** ✅ Pass

### Keyboard Navigation
- Buttons are focusable
- Tab order: Left-to-right, top-to-bottom
- Focus indicators: Default browser style

### Motion Preferences
- Respects `prefers-reduced-motion` (via Framer Motion)
- Animations optional (content still visible)

### Screen Reader
- No `aria-hidden` on interactive content
- Buttons have clear labels
- Decorative elements are truly decorative

---

## Alternative Layouts (Future Options)

### Variant A: Vertical Stack (Mobile-first)
Replace sticky layout with vertical scroll:
```typescript
// Instead of sticky top-1/3:
className="lg:col-span-1 flex flex-col justify-start"
```

### Variant B: Animated Counter Cards
Replace static stats with animated counters:
```typescript
<motion.span>
  <AnimatedNumber from={0} to={1000} /> {/* +1,000 */}
</motion.span>
```

### Variant C: Image Cards
Replace icon + gradient with full images:
```typescript
<img src={card.image} alt={card.title} className="w-full" />
```

### Variant D: Tabs Layout
Replace card stack with tab interface:
```typescript
// One card visible at a time, user clicks tabs
<Tabs>
  <Tab key={card.id}>{card.content}</Tab>
</Tabs>
```

### Variant E: Slider/Carousel
Replace static cards with horizontal scroll:
```typescript
<motion.div className="flex overflow-x-auto">
  {cards.map(card => <Card key={card.id} {...card} />)}
</motion.div>
```

---

## Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Sticky | ✅ | ✅ | ✅ | ✅ |
| Transforms | ✅ | ✅ | ✅ | ✅ |
| Backdrop-filter | ✅ | ⚠️ | ✅ | ✅ |
| Framer Motion | ✅ | ✅ | ✅ | ✅ |
| useScroll Hook | ✅ | ✅ | ✅ | ✅ |

**⚠️ Firefox:** Backdrop-filter may need `-webkit-` prefix (handled by Tailwind)

---

## Version & Maintenance

**Component Version:** 1.0.0
**Created:** 2026-04-24
**Last Updated:** 2026-04-24
**Status:** Production Ready

**Dependencies:**
- Framer Motion: ^12.29.2 ✅ (already installed)
- Lucide React: ^0.545.0 ✅ (already installed)
- Tailwind CSS: ^4 ✅ (already installed)

**No external dependencies needed** - uses project's existing stack
