"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/store/dashboardStore';
import { WIDGET_CATALOG, WIDGET_CATEGORIES, WidgetType, WidgetCategory } from '@/types/dashboard';
import { cn } from '@/lib/utils';
const getIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Box;
};
const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  analytics: 'border-[#3B82F6] text-[#2563EB] dark:border-[#3B82F6] dark:text-[#60A5FA] bg-transparent',
  credits: 'border-[#D4A72C] text-[#B45309] dark:border-[#D4A72C] dark:text-[#F5C84C] bg-transparent',
  'voice-agent': 'border-[#c06be8] text-[#9333ea] dark:border-[#c06be8] dark:text-[#c06be8] bg-transparent',
  calendar: 'border-[#22C55E] text-[#16a34a] dark:border-[#22C55E] dark:text-[#4ADE80] bg-transparent',
  'ai-insights': 'border-[#14b8a6] text-[#0f766e] dark:border-[#51edc1] dark:text-[#51edc1] bg-transparent',
  whatsapp: 'border-[#22C55E] text-[#16a34a] dark:border-[#22C55E] dark:text-[#4ADE80] bg-transparent',
  linkedin: 'border-[#634af0] text-[#634af0] dark:border-[#634af0] dark:text-[#a594fd] bg-transparent',
  email: 'border-[#e8956b] text-[#c2410c] dark:border-[#e8956b] dark:text-[#fba87e] bg-transparent',
  instagram: 'border-[#E1306C] text-[#be185d] dark:border-[#E1306C] dark:text-[#F472B6] bg-transparent',
};

export const WidgetLibrary: React.FC = () => {
  const { isWidgetLibraryOpen, setWidgetLibraryOpen, addWidget, layout } = useDashboardStore();
  const [selectedCategory, setSelectedCategory] = React.useState<WidgetCategory | 'all'>('all');

  // Get widgets currently on dashboard
  const activeWidgetTypes = new Set(
    layout.map((item) => {
      const match = item.i.match(/^([a-z-]+)-\d+$/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );

  const filteredWidgets = Object.values(WIDGET_CATALOG).filter(
    (widget) => selectedCategory === 'all' || widget.category === selectedCategory
  );

  const handleAddWidget = (type: WidgetType) => {
    addWidget(type);
    // Don't close the drawer to allow adding multiple widgets
  };

  return (
    <Sheet open={isWidgetLibraryOpen} onOpenChange={setWidgetLibraryOpen}>
      <SheetContent className="w-full max-w-[90vw] sm:w-[500px] sm:max-w-[520px] p-4 sm:p-6 overflow-hidden flex flex-col bg-white dark:bg-[#000724] border-l border-slate-200 dark:border-blue-950/40">
        <SheetHeader className="pb-4 border-b border-slate-200 dark:border-blue-950/40">
          <SheetTitle className="text-lg sm:text-xl font-display text-slate-900 dark:text-white">Widget Library</SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-400">
            Add widgets to customize your dashboard
          </SheetDescription>
        </SheetHeader>

        {/* Category Filter */}
        <div className="py-3 sm:py-4 border-b border-slate-200 dark:border-blue-950/40">
          <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar items-center">
            {/* All Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] px-4 h-9 text-sm font-semibold transition-all duration-200 ease-in-out shrink-0 border",
                selectedCategory === 'all'
                  ? "bg-[#0B1957] text-white border-[#0B1957] hover:bg-[#0B1957] hover:text-white dark:bg-[#3B82F6] dark:text-white dark:border-[#3B82F6] dark:hover:bg-[#3B82F6] dark:hover:text-white shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-[#0B1957] hover:text-white hover:border-[#0B1957] dark:bg-[#071131] dark:text-slate-300 dark:border-blue-950/40 dark:hover:bg-[#3B82F6] dark:hover:text-white dark:hover:border-[#3B82F6]"
              )}
            >
              All
            </button>

            {WIDGET_CATEGORIES.map((category) => {
              const CategoryIcon = getIcon(category.icon);
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 h-9 text-sm font-medium transition-all duration-200 ease-in-out shrink-0 border",
                    isSelected
                      ? "bg-[#0B1957] text-white border-[#0B1957] hover:bg-[#0B1957] hover:text-white dark:bg-[#3B82F6] dark:text-white dark:border-[#3B82F6] dark:hover:bg-[#3B82F6] dark:hover:text-white shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-[#0B1957] hover:text-white hover:border-[#0B1957] dark:bg-[#071131] dark:text-slate-300 dark:border-blue-950/40 dark:hover:bg-[#3B82F6] dark:hover:text-white dark:hover:border-[#3B82F6]"
                  )}
                >
                  <CategoryIcon className="h-4 w-4 shrink-0" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Widget List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-1.5 sm:px-2 pr-2.5 sm:pr-3.5 custom-scrollbar">
          <div className="grid gap-3.5">
            <AnimatePresence>
              {filteredWidgets.map((widget, index) => {
                const WidgetIcon = getIcon(widget.icon);
                const isActive = activeWidgetTypes.has(widget.type);
                const category = WIDGET_CATEGORIES.find((c) => c.id === widget.category);
                const categoryClass = (category?.id && CATEGORY_BADGE_CLASSES[category.id]) || 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-blue-950/40';

                return (
                  <motion.div
                    key={widget.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="widget-library-item flex items-start gap-4 p-3.5 sm:p-4 rounded-xl border transition-colors bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40 shadow-sm"
                  >
                    <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                      <WidgetIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-slate-800 dark:text-white">{widget.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {widget.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0", categoryClass)}>
                          {category?.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {widget.defaultSize.w}×{widget.defaultSize.h}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? 'outline' : 'default'}
                      className="h-8 px-3 shrink-0"
                      onClick={() => handleAddWidget(widget.type)}
                      disabled={isActive}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {isActive ? 'Added' : 'Add'}
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-blue-950/40">
          <p className="text-xs text-muted-foreground text-center">
            Drag and resize widgets after adding them to the dashboard
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
