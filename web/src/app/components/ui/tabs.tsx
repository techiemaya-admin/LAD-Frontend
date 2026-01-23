"use client";
import * as React from 'react';
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}
const TabsContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});
const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, orientation = 'horizontal', children, ...props }, ref) => {
    return (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          className={cn(
            orientation === 'vertical' ? 'flex flex-col' : 'flex',
            className
          )}
          role="tablist"
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';
export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  label?: string;
}
const Tab = React.forwardRef<HTMLButtonElement, TabProps>(
  ({ className, value, label, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
    const isSelected = selectedValue === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        onClick={() => onValueChange?.(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          isSelected
            ? 'bg-gray-100 text-black font-semibold'
            : 'text-gray-500 hover:bg-gray-100',
          className
        )}
        {...props}
      >
        {label || children}
      </button>
    );
  }
);
Tab.displayName = 'Tab';
export { Tabs, Tab };