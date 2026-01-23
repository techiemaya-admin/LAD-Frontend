import * as React from 'react';
type Variant = 'default' | 'ghost' | 'outline' | 'destructive' | 'secondary' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';
export interface UIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}
const variantClasses: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:opacity-90',
  ghost: 'bg-transparent hover:bg-muted',
  outline: 'border border-input bg-transparent hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
  link: 'bg-transparent underline-offset-4 hover:underline',
};
const sizeClasses: Record<Size, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-8 w-8',
};
export const Button = React.forwardRef<HTMLButtonElement, UIButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const classes = [
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = 'Button';
export default Button;