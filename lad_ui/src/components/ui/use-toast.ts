/**
 * Toast Hook Compatibility Layer
 * Provides a compatible interface for the toast system
 */

import { useToast as useAppToast } from './app-toaster';

export function useToast() {
  const { push } = useAppToast();
  
  return {
    toast: (options: {
      title?: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => {
      const variant = options.variant === 'destructive' ? 'error' : 'default';
      push({
        title: options.title,
        description: options.description,
        variant
      });
    }
  };
}
