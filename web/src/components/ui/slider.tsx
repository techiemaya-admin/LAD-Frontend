import * as React from 'react';

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, onChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (onValueChange) {
        onValueChange(newValue);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="w-full">
        <input
          type="range"
          ref={ref}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider",
            className
          )}
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((value || 0) - min) / (max - min) * 100}%, #E5E7EB ${((value || 0) - min) / (max - min) * 100}%, #E5E7EB 100%)`
          }}
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };

