import * as React from 'react';
// Minimal no-op tooltip primitives so code compiles without Radix dependency
export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
type TooltipTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;
export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  if (React.isValidElement(children) && (children.type as any) === 'button') {
    return children;
  }
  return (
    <div {...props}>
      {children}
    </div>
  );
};
export const TooltipContent: React.FC<{ children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }> = ({ children }) => {
  // Render nothing for now; upgrade to Radix-based implementation when desired
  return <>{children}</>;
};
export default Tooltip;