# Troubleshooting Guide

## Common Issues & Solutions

---

## Issue 1: Skeleton Shows But Never Disappears

### Problem
The skeleton stays visible even after data loads.

### Causes
- API is not actually loading (check network tab)
- `isLoading` state is never set to `false`
- Hook is not updating properly

### Solutions

**Check if data is loading:**
```tsx
useEffect(() => {
  console.log("Numbers Loading:", numbersLoading);
  console.log("Agents Loading:", agentsLoading);
}, [numbersLoading, agentsLoading]);
```

**Verify the initialization check:**
```tsx
useEffect(() => {
  console.log("Setting isInitializing to:", !numbersLoading && !agentsLoading);
  if (!numbersLoading && !agentsLoading) {
    setIsInitializing(false);
  }
}, [numbersLoading, agentsLoading]);
```

**Add timeout fallback:**
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    console.warn("Loading timeout - forcing ready state");
    setIsInitializing(false);
  }, 5000); // 5 seconds

  return () => clearTimeout(timer);
}, []);
```

---

## Issue 2: Overlay Blocks Everything

### Problem
PageLoaderOverlay is stuck visible and blocks user interaction.

### Causes
- `isVisible` prop always `true`
- State is not updating properly
- Conditional logic is backwards

### Solutions

**Check the state:**
```tsx
useEffect(() => {
  console.log("Is Validating:", isValidating);
}, [isValidating]);
```

**Verify conditional logic:**
```tsx
// ✅ Correct
<PageLoaderOverlay isVisible={isValidating} message="Loading..." />

// ❌ Wrong
<PageLoaderOverlay isVisible={!isValidating} message="Loading..." />
```

**Add explicit state setter:**
```tsx
useEffect(() => {
  const validateAuth = async () => {
    try {
      await getCurrentUser();
      console.log("Auth successful");
      setIsValidating(false);  // ← Explicitly set to false
    } catch {
      console.log("Auth failed");
      setIsValidating(false);  // ← Set to false before redirect
      router.replace("/login");
    }
  };
  validateAuth();
}, []);
```

---

## Issue 3: Skeleton Layout Doesn't Match Real Component

### Problem
Skeleton looks different from actual content when it loads.

### Causes
- Wrong dimensions in skeleton
- Different number of elements
- Spacing/padding mismatch

### Solutions

**Compare side-by-side:**
1. Open your browser DevTools
2. Have skeleton and real component visible simultaneously
3. Check dimensions using DevTools Inspector

**Common fixes:**
```tsx
// ❌ Wrong - Too many skeleton rows
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-full" />  // Extra skeleton
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-full" />

// ✅ Correct - Match real component elements
<Skeleton className="h-8 w-48" />      {/* Title */}
<Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
<Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
<Skeleton className="h-10 w-24 rounded-md" />   {/* Button */}
```

**Check spacing:**
```tsx
// Must match real component spacing
<div className="space-y-4">  {/* Same gap as real component */}
  <Skeleton className="h-4 w-32" />
  <Skeleton className="h-10 w-full rounded-md" />
  <Skeleton className="h-10 w-full rounded-md" />
</div>
```

---

## Issue 4: Flash/Flicker Between States

### Problem
Content flashes/blinks when transitioning from skeleton to real content.

### Causes
- Too-quick state change
- Rendering issues
- CSS conflicts

### Solutions

**Add smooth transition:**
```tsx
<div className="transition-opacity duration-300">
  {isInitializing ? <Skeleton /> : <RealContent />}
</div>
```

**Use key to prevent flashing:**
```tsx
{isInitializing ? (
  <div key="skeleton">
    <Skeleton />
  </div>
) : (
  <div key="content">
    <RealContent />
  </div>
)}
```

**Add small delay if needed:**
```tsx
useEffect(() => {
  if (!numbersLoading && !agentsLoading) {
    // Small delay for smooth transition
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 200);
    return () => clearTimeout(timer);
  }
}, [numbersLoading, agentsLoading]);
```

---

## Issue 5: API Data Not Showing After Skeleton Disappears

### Problem
Skeleton disappears but data is empty/null.

### Causes
- API call failed silently
- Data state not updated correctly
- Hook returning empty array

### Solutions

**Check API response:**
```tsx
useEffect(() => {
  console.log("Available Numbers:", availableNumbers);
  console.log("Available Agents:", availableAgents);
}, [availableNumbers, availableAgents]);
```

**Add error tracking:**
```tsx
const { 
  data: availableNumbers = [], 
  isLoading: numbersLoading,
  error: numbersError  // ← Check this
} = useUserAvailableNumbers();

useEffect(() => {
  if (numbersError) {
    console.error("Numbers API Error:", numbersError);
  }
}, [numbersError]);
```

**Provide fallback:**
```tsx
{!isInitializing && (
  <CallConfiguration
    numbers={numbers.length > 0 ? numbers : []}
    agents={agents.length > 0 ? agents : []}
    // ... other props
  />
)}
```

---

## Issue 6: useOptimisticNavigate Not Working

### Problem
Navigation doesn't happen or stays in loading state.

### Causes
- Hook not imported correctly
- Promise not awaited
- Async action never resolves

### Solutions

**Check import:**
```tsx
// ✅ Correct
import { useOptimisticNavigate } from "@/hooks/useOptimisticNavigate";

// ❌ Wrong paths won't work
import { useOptimisticNavigate } from "./hooks/useOptimisticNavigate";
```

**Verify navigation syntax:**
```tsx
const { navigate, isNavigating } = useOptimisticNavigate();

// ✅ Correct
await navigate("/target-page");

// With async action
await navigate("/target-page", async () => {
  await someAsyncAction();
});

// ❌ Wrong - missing await
navigate("/target-page");  // Fire and forget, won't work right
```

**Debug the hook:**
```tsx
const { navigate, isNavigating } = useOptimisticNavigate({
  onSuccess: () => console.log("✅ Navigation successful"),
  onError: (error) => console.error("❌ Error:", error),
});

const handleClick = async () => {
  console.log("Starting navigation...");
  await navigate("/target-page");
  console.log("Navigation complete!");
};
```

---

## Issue 7: Components Look Too Similar in Dark Mode

### Problem
Skeleton blends with dark background.

### Causes
- Skeleton color not visible on dark background
- No contrast

### Solutions

**Add dark mode styling:**
```tsx
<Skeleton className="h-4 w-32 bg-gray-700 dark:bg-gray-600" />
```

**Use explicit colors:**
```tsx
<div className="animate-pulse">
  <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
</div>
```

**Check with devtools:**
1. Press F12
2. Click Elements tab
3. Use element inspector to select skeleton
4. Check computed styles

---

## Issue 8: TypeScript Errors in Skeleton Component

### Problem
Type errors like "Parameter implicitly has type any"

### Causes
- Missing type definitions
- `<React.FC>` not imported
- Component props not typed

### Solutions

**Add proper imports:**
```tsx
// ✅ Correct
"use client";
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const MySkeleton: React.FC = () => {
  // ...
};
```

**Type props correctly:**
```tsx
interface MySkeletonProps {
  count?: number;
  className?: string;
}

export const MySkeleton: React.FC<MySkeletonProps> = ({
  count = 3,
  className = "",
}) => {
  // ...
};
```

**Check tsconfig:**
Ensure `"strict": true` in `tsconfig.json` (or turn it off if needed)

---

## Issue 9: Performance - Skeleton Takes Too Long to Render

### Problem
Skeleton appears slowly, defeating the purpose.

### Causes
- Complex skeleton component logic
- Heavy animations
- Too many DOM elements

### Solutions

**Simplify skeleton:**
```tsx
// ❌ Too complex
export const MySkeleton = () => {
  const items = useComplexHook();
  const processed = items.map(processItem);
  return processed.map(renderItem);
};

// ✅ Simple and fast
export const MySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-10 w-full rounded-md" />
  </div>
);
```

**Reduce DOM nodes:**
```tsx
// ❌ Too many skeletons
{Array.from({ length: 100 }).map((_, i) => (
  <Skeleton key={i} />
))}

// ✅ Just show key elements
<div className="space-y-4">
  <Skeleton />
  <Skeleton />
  <Skeleton />
</div>
```

---

## Issue 10: Mobile/Responsive Issues

### Problem
Skeleton looks wrong on mobile or tablets.

### Causes
- Fixed widths
- Grid not responsive
- Padding/margins off

### Solutions

**Use responsive grid:**
```tsx
// ✅ Good
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <Skeleton />
  <Skeleton />
</div>

// ❌ Bad - fixed width
<div className="grid grid-cols-2 gap-4">
  <Skeleton />
  <Skeleton />
</div>
```

**Test all breakpoints:**
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1024px+
- Wide: 1440px+

**Use DevTools device emulation:**
1. F12 → Device Toolbar (Ctrl+Shift+M)
2. Select device to test
3. Verify skeleton layout matches

---

## Quick Diagnostic Checklist

```
□ Is skeleton component rendering?
  → Check with: console.log("Rendering skeleton")

□ Is isLoading state correct?
  → Check in DevTools React Profiler

□ Are API calls happening?
  → Check Network tab in DevTools

□ Is data returned correctly?
  → Check API response in Network tab

□ Is state updating?
  → Add console.log in useEffect hooks

□ Is conditional render correct?
  → Verify: isLoading ? <Skeleton /> : <Content />

□ Are imports correct?
  → Verify all imports work with Cmd+Click

□ Is styling applied?
  → Check computed styles in DevTools

□ Are dependencies correct?
  → Check useEffect dependencies array

□ Is animation smooth?
  → Check CSS in DevTools > Animations
```

---

## Debug Mode

Enable detailed logging:

```tsx
// Add to your component
const DEBUG = true;

useEffect(() => {
  if (DEBUG) {
    console.log("=== SKELETON LOADING DEBUG ===");
    console.log("isInitializing:", isInitializing);
    console.log("numbersLoading:", numbersLoading);
    console.log("agentsLoading:", agentsLoading);
    console.log("numbers.length:", numbers.length);
    console.log("agents.length:", agents.length);
    console.log("==============================");
  }
}, [isInitializing, numbersLoading, agentsLoading, numbers, agents]);
```

---

## Performance Monitoring

```tsx
// Measure time to interactive
const startTime = useRef(Date.now());

useEffect(() => {
  if (!isInitializing) {
    const loadTime = Date.now() - startTime.current;
    console.log(`✅ Page ready in ${loadTime}ms`);
  }
}, [isInitializing]);
```

---

## When to Ask for Help

If you've checked everything above and it's still not working:

1. **Check the browser console** - Are there error messages?
2. **Check the Network tab** - Are API calls succeeding?
3. **Compare to working example** - Look at make-call page
4. **Simplify** - Remove features until it works
5. **Review the docs** - Check OPTIMISTIC_NAVIGATION.md

---

## Common Success Patterns

### Pattern: Basic Skeleton
```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetchData().finally(() => setIsLoading(false));
}, []);

return isLoading ? <Skeleton /> : <Content />;
```

### Pattern: Multiple Data Sources
```tsx
useEffect(() => {
  if (!loading1 && !loading2 && !loading3) {
    setIsInitializing(false);
  }
}, [loading1, loading2, loading3]);
```

### Pattern: With Overlay
```tsx
return (
  <>
    <PageLoaderOverlay isVisible={isValidating} />
    {isInitializing ? <Skeleton /> : <Content />}
  </>
);
```

All these patterns are used in the make-call page - copy and adapt!
