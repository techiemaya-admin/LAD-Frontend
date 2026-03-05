import React from 'react';
import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  current: number;
  max?: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  // If no max is provided, just show the current count
  if (max === undefined) {
    return (
      <span className={cn('char-counter', 'text-muted-foreground', className)}>
        {current.toLocaleString()} characters
      </span>
    );
  }

  const percentage = (current / max) * 100;
  
  const getColorClass = () => {
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 90) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <span className={cn('char-counter', getColorClass(), className)}>
      {current.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}
