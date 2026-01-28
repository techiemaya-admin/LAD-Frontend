# Optimistic Navigation & Skeleton Loading Pattern

## Overview
This document describes the new optimistic navigation and skeleton component loading pattern implemented in the application. This pattern provides a better user experience by navigating to pages immediately and showing skeleton placeholders while data loads in the background.

## Components Added

### 1. **Skeleton Components** (`/src/components/skeletons/`)

#### `CallConfigurationSkeleton.tsx`
- Placeholder for the CallConfiguration component
- Shows loading state for all form fields (dropdowns, inputs, textareas)
- Matches the layout of the actual CallConfiguration component
- Includes animated pulse effect

#### `CallOptionsSkeleton.tsx`
- Placeholder for the CallOptions component
- Shows loading state for tabs, buttons, and content areas
- Matches the layout of the actual CallOptions component
- Includes animated pulse effect

#### `PageSkeleton.tsx`
- Generic page-level skeleton component
- Configurable: header title, breadcrumbs, number of columns
- Useful for any page that needs a generic loading state

### 2. **PageLoaderOverlay.tsx** (`/src/components/`)
- Full-screen overlay loader with spinner and message
- Used during critical operations (auth validation, API calls)
- Smooth fade-in/fade-out animations
- Prevents user interaction during loading

### 3. **useOptimisticNavigate Hook** (`/src/hooks/`)
- Custom React hook for optimistic navigation
- Navigates immediately to target page
- Executes async actions (API calls) in background
- Includes error handling and callbacks
- Tracks navigation state

## Usage Patterns

### Pattern 1: Optimistic Page Navigation (Make-Call Page)

**File:** `/src/app/make-call/page.tsx`

```tsx
import { PageLoaderOverlay } from "@/components/PageLoaderOverlay";
import { useOptimisticNavigate } from "@/hooks/useOptimisticNavigate";

export default function MakeCallPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const router = useRouter();

  // Auth check happens, but shows overlay while validating
  useEffect(() => {
    (async () => {
      setIsValidating(true);
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        router.replace(`/login?redirect_url=${encodeURIComponent("/make-call")}`);
      } finally {
        setIsValidating(false);
      }
    })();
  }, [router]);

  return (
    <>
      {/* Show overlay while validating */}
      <PageLoaderOverlay isVisible={isValidating} message="Verifying credentials..." />
      <MakeCallContent />
    </>
  );
}
```

### Pattern 2: Skeleton Loading During API Fetch (Make-Call Content)

**File:** `/src/app/make-call/make-call-content.tsx`

```tsx
import { CallConfigurationSkeleton } from "@/components/skeletons/CallConfigurationSkeleton";
import { CallOptionsSkeleton } from "@/components/skeletons/CallOptionsSkeleton";

export default function MakeCallContent() {
  // Track initialization state
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // SDK Hooks for fetching data
  const { data: availableNumbers = [], isLoading: numbersLoading } = useUserAvailableNumbers();
  const { data: availableAgents = [], isLoading: agentsLoading } = useAvailableAgents();

  // Mark initialization complete when data is loaded
  useEffect(() => {
    if (!numbersLoading && !agentsLoading) {
      setIsInitializing(false);
    }
  }, [numbersLoading, agentsLoading]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      {isInitializing ? (
        // Show skeletons while loading
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CallConfigurationSkeleton />
          <CallOptionsSkeleton />
        </div>
      ) : (
        // Show actual content once loaded
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CallConfiguration {...props} />
          <CallOptions {...props} />
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Using Optimistic Navigate Hook

```tsx
import { useOptimisticNavigate } from "@/hooks/useOptimisticNavigate";

export function MyComponent() {
  const { navigate, isNavigating } = useOptimisticNavigate({
    showLoader: true,
    onSuccess: () => console.log("Navigation complete"),
    onError: (error) => console.error("Navigation failed", error),
  });

  const handleNavigate = async () => {
    await navigate("/target-page", async () => {
      // Optional: Execute async action while navigating
      await saveData();
    });
  };

  return (
    <button onClick={handleNavigate} disabled={isNavigating}>
      {isNavigating ? "Loading..." : "Navigate"}
    </button>
  );
}
```

## How It Works

### User Experience Flow:

1. **User navigates to make-call page**
   ↓
2. **Page component immediately shows PageLoaderOverlay**
   - Auth validation happens in background
   ↓
3. **Auth validation completes**
   - Overlay disappears
   - MakeCallContent renders with skeleton loaders
   ↓
4. **API data (numbers, agents) loads**
   - Skeleton components displayed as placeholders
   - Real API requests in flight
   ↓
5. **Data arrives**
   - isInitializing becomes false
   - Skeletons are replaced with actual content
   ↓
6. **Page is fully interactive**

## Benefits

✅ **Faster Perceived Performance**
- User sees page immediately instead of waiting for all data
- No blank screens or long loading waits

✅ **Better UX**
- Skeleton provides visual feedback and context
- Users know what content will load

✅ **Graceful Fallback**
- If auth fails, user redirected cleanly
- Error states handled appropriately

✅ **Reusable Components**
- Skeleton components can be used in other pages
- PageLoaderOverlay works for any critical operation

✅ **Non-Blocking Architecture**
- Auth and API calls don't block page rendering
- Parallel loading of multiple data sources

## Implementation Checklist for Other Pages

To implement this pattern on other pages:

1. **Create skeleton components** matching the real components
   ```bash
   # Example
   src/components/skeletons/MyComponentSkeleton.tsx
   ```

2. **Add loading state** in your content component
   ```tsx
   const [isInitializing, setIsInitializing] = useState(true);
   
   useEffect(() => {
     if (!isLoading1 && !isLoading2) {
       setIsInitializing(false);
     }
   }, [isLoading1, isLoading2]);
   ```

3. **Update render** to show skeletons during loading
   ```tsx
   return isInitializing ? <Skeleton /> : <RealComponent />;
   ```

4. **Optional: Add PageLoaderOverlay** for auth/critical operations
   ```tsx
   <PageLoaderOverlay isVisible={isValidating} message="Loading..." />
   ```

## File Structure

```
src/
├── app/
│   └── make-call/
│       ├── page.tsx (updated with PageLoaderOverlay)
│       └── make-call-content.tsx (updated with skeletons)
├── components/
│   ├── PageLoaderOverlay.tsx (new)
│   └── skeletons/ (new)
│       ├── CallConfigurationSkeleton.tsx
│       ├── CallOptionsSkeleton.tsx
│       ├── PageSkeleton.tsx
│       └── index.ts
└── hooks/
    └── useOptimisticNavigate.ts (new)
```

## Performance Tips

- **Keep skeletons lightweight**: They should be simple markup without complex logic
- **Match real component layout**: Skeleton dimensions should closely match actual content
- **Use CSS animations**: Prefer CSS `animate-pulse` over JavaScript animations
- **Batch API calls**: Load all required data in parallel, not sequentially
- **Set reasonable timeouts**: Consider fallback UI if loading takes too long

## Accessibility

- Skeletons include `aria-busy="true"` semantics via animate-pulse class
- PageLoaderOverlay uses proper overlay semantics
- Text content provides clear loading messages
- Focus management preserved during transitions

## Browser Support

All components use standard CSS and React patterns:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers
- ✅ CSS animations via Tailwind
