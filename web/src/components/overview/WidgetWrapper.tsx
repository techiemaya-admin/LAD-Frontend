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
  headerActions?: React.ReactNode;
  onSettings?: () => void;
  icon?: React.ReactNode;
}
export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  id,
  title,
  children,
  className,
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
        'widget-card h-full flex flex-col overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300',
        'bg-gradient-to-br from-white to-slate-50 dark:from-[#1A2A43] dark:to-[#0d1625]',
        'border border-gray-200 dark:border-[#2B7CFF]/20',
        isEditMode && 'widget-card-edit cursor-move',
        isDragging && 'shadow-xl ring-2 ring-accent',
        className
      )}
      {...attributes}
    >
      {/* Widget Header */}
      <div
        className="flex items-center justify-between px-2 sm:px-5 py-2 sm:py-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-[#1A2A43]/70 dark:to-transparent border-b border-gray-200 dark:border-[#2B7CFF]/20"
        {...(isEditMode ? listeners : {})}
      >
        <div className="flex items-center gap-2">
          {isEditMode && (
            <div className="drag-handle cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground dark:text-[#E0E0E0]" />
            </div>
          )}
          {icon && <div className="text-muted-foreground dark:text-[#E0E0E0]">{icon}</div>}
          <h3 className="font-semibold text-xs sm:text-sm font-display dark:text-[#E0E0E0]">{title}</h3>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {headerActions}
          {isEditMode && (
            <>
              {onSettings && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="widget-action-btn h-7 w-7 dark:text-[#E0E0E0] dark:hover:text-white"
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
                className="widget-action-btn h-7 w-7 hover:text-destructive dark:text-[#E0E0E0] dark:hover:text-white"
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
