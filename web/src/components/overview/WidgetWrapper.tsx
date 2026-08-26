"use client";
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
interface WidgetWrapperProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  headerActions?: React.ReactNode;
  onSettings?: () => void;
  icon?: React.ReactNode;
}
export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  id,
  title,
  children,
  className,
  headerClassName,
  headerActions,
  onSettings,
  icon,
}) => {
  const { isEditMode, removeWidget } = useDashboardStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled: !isEditMode,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'widget-card h-full flex flex-col overflow-hidden rounded-[20px] shadow-sm hover:shadow-md transition-shadow duration-300',
        'bg-white dark:bg-[#071131] text-slate-800 dark:text-slate-100',
        'border border-slate-200 dark:border-blue-950/40',
        isEditMode && 'widget-card-edit cursor-move',
        isDragging && 'shadow-xl ring-2 ring-accent',
        className
      )}
      {...attributes}
    >
      {/* Widget Header */}
      <div
        className={cn(
          "flex items-center justify-between px-2 sm:px-5 py-2 sm:py-4 bg-white dark:bg-[#071131] border-b border-slate-200 dark:border-blue-950/40",
          headerClassName
        )}
        {...(isEditMode ? listeners : {})}
      >
        <div className="flex items-center gap-2">
          {isEditMode && (
            <div className="drag-handle cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-slate-500 dark:text-[#E0E0E0]" />
            </div>
          )}
          {icon && <div className="text-slate-600 dark:text-slate-300">{icon}</div>}
          <h3 className="font-semibold text-xs sm:text-sm font-display text-slate-800 dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {headerActions}
          {isEditMode && (
            <>
              {onSettings && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="widget-action-btn h-7 w-7 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettings();
                  }}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="widget-action-btn h-7 w-7 text-slate-500 hover:text-destructive dark:text-slate-400 dark:hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  removeWidget(id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Widget Content */}
      <div className="flex-1 p-2 sm:p-5 overflow-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};
