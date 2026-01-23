import * as React from 'react';
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}
const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, name, value, onValueChange, children, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      }
    };
    return (
      <div
        ref={ref}
        className={cn('flex gap-4', className)}
        role="radiogroup"
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              name,
              checked: value === child.props.value,
              onChange: handleChange,
            } as any);
          }
          return child;
        })}
      </div>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';
export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  label?: string;
}
const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const radioId = id || `radio-${props.value}`;
    return (
      <div className="flex items-center gap-2">
        <input
          type="radio"
          className={cn(
            'h-4 w-4 border-gray-300 text-black focus:ring-2 focus:ring-black focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          id={radioId}
          {...props}
        />
        {label && (
          <label htmlFor={radioId} className="text-sm font-normal cursor-pointer">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Radio.displayName = 'Radio';
export { RadioGroup, Radio };