import * as React from 'react';
import { createPortal } from 'react-dom';

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className="relative z-50 bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // Render in a portal to avoid transform containment issues
  return createPortal(dialogContent, document.body);
};

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight p-6 pb-4', className)}
        {...props}
      />
    );
  }
);
DialogTitle.displayName = 'DialogTitle';

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 pb-6', className)}
        {...props}
      />
    );
  }
);
DialogContent.displayName = 'DialogContent';

export interface DialogActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogActions = React.forwardRef<HTMLDivElement, DialogActionsProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex justify-end gap-2 p-6 pt-4', className)}
        {...props}
      />
    );
  }
);
DialogActions.displayName = 'DialogActions';

export { Dialog, DialogTitle, DialogContent, DialogActions };

