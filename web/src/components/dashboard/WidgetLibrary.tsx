"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/store/dashboardStore';
import { WIDGET_CATALOG, WIDGET_CATEGORIES, WidgetType, WidgetCategory } from '@/types/dashboard';
import { cn } from '@/lib/utils';
const getIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Box;
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
      <SheetContent className="w-[400px] sm:w-[540px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-xl font-display">Widget Library</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Add widgets to customize your dashboard
          </p>
        </SheetHeader>
        {/* Category Filter */}
        <div className="py-4 border-b border-border">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="h-8"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {WIDGET_CATEGORIES.map((category) => {
              const CategoryIcon = getIcon(category.icon);
              return (
                <Button
                  key={category.id}
                  size="sm"
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  className="h-8 gap-1.5"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CategoryIcon className="h-3.5 w-3.5" />
                  {category.label}
                </Button>
              );
            })}
          </div>
        </div>
        {/* Widget List */}
        <div className="flex-1 overflow-auto py-4 custom-scrollbar">
          <div className="grid gap-3">
            <AnimatePresence>
              {filteredWidgets.map((widget, index) => {
                const WidgetIcon = getIcon(widget.icon);
                const isActive = activeWidgetTypes.has(widget.type);
                const category = WIDGET_CATEGORIES.find((c) => c.id === widget.category);
                return (
                  <motion.div
                    key={widget.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'widget-library-item flex items-start gap-4',
                      isActive && 'border-accent/50 bg-accent/5'
                    )}
                  >
                    <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                      <WidgetIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{widget.title}</h4>
                        {isActive && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Added
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {widget.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] px-2 py-0">
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
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        {/* Footer */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Drag and resize widgets after adding them to the dashboard
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};