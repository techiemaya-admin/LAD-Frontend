import { useEffect, useState } from 'react';

/**
 * Returns a value that updates only after `delay` ms of no change.
 * Used to throttle search-input API calls — pass the raw input value
 * to the hook, then wire the debounced result into your fetch.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
