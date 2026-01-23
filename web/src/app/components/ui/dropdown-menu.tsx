import * as React from 'react';
import { createPortal } from 'react-dom';
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorEl: HTMLElement | null;
  setAnchorEl: (el: HTMLElement | null) => void;
}
const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null);
export interface DropdownMenuProps {
  children: React.ReactNode;
}
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, anchorEl, setAnchorEl }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};
export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, onClick, asChild, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      context.setAnchorEl(e.currentTarget);
      context.setOpen(!context.open);
      onClick?.(e);
    };
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref,
        onClick: handleClick,
        className: cn('outline-none', className, (children as React.ReactElement<any>).props.className),
        ...props,
      });
    }
    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn('outline-none', className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';
export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'center';
}
export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'end', children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
      setMounted(true);
    }, []);
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (context.anchorEl && !context.anchorEl.contains(event.target as Node)) {
          const target = event.target as HTMLElement;
          if (!target.closest('[data-dropdown-content]')) {
            context.setOpen(false);
          }
        }
      };
      if (context.open) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [context.open, context.anchorEl]);
    if (!context.open || !mounted) return null;
    // Use fixed positioning to avoid transform issues
    const rect = context.anchorEl?.getBoundingClientRect();
    const position = rect
      ? {
          top: rect.bottom + 4,
          left: rect.left,
          right: window.innerWidth - rect.right,
        }
      : { top: 0, left: 0, right: 0 };
    const content = (
      <div
        ref={ref}
        data-dropdown-content
        className={cn(
          'fixed z-50 min-w-[8rem] rounded-md border bg-white shadow-md',
          align === 'end' && 'left-auto',
          align === 'center' && 'transform -translate-x-1/2',
          className
        )}
        style={{ 
          top: `${position.top}px`, 
          left: align === 'end' ? 'auto' : align === 'center' ? `${position.left}px` : `${position.left}px`,
          right: align === 'end' ? `${position.right}px` : 'auto'
        }}
        {...props}
      >
        {children}
      </div>
    );
    // Render in a portal to avoid transform issues
    return createPortal(content, document.body);
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';
export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onSelect?: () => void;
}
export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, children, onClick, onSelect, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) throw new Error('DropdownMenuItem must be used within DropdownMenu');
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onSelect?.();
      context.setOpen(false);
    };
    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';