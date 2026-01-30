"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, RotateCcw, Save, X } from 'lucide-react';
import { Check, Layout, ChevronDown, TvMinimalPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
export const DashboardHeader: React.FC = () => {
  const {
    isEditMode,
    toggleEditMode,
    setEditMode,
    setWidgetLibraryOpen,
    savedLayouts,
    currentLayoutId,
    saveCurrentLayout,
    loadLayout,
    deleteLayout,
    resetToDefault,
  } = useDashboardStore();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const currentLayout = savedLayouts.find((l) => l.id === currentLayoutId);
  const handleSaveLayout = () => {
    if (layoutName.trim()) {
      saveCurrentLayout(layoutName.trim());
      setLayoutName('');
      setIsSaveDialogOpen(false);
    }
  };
  const handleExitEditMode = () => {
    setEditMode(false);
  };
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <TvMinimalPlay className="h-20 w-8" color="#0b1957" />
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Smart Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentLayout ? currentLayout.name : 'Default Layout'}
            {isEditMode && (
              <span className="ml-2 text-accent">• Editing</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isEditMode ? (
          <>
            {/* Add Widget Button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setWidgetLibraryOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
            {/* Layout Management Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Layout className="h-4 w-4" />
                  Layouts
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Current Layout
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Layout</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Input
                        placeholder="Layout name..."
                        value={layoutName}
                        onChange={(e) => setLayoutName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
                      />
                      <Button onClick={handleSaveLayout}>Save Layout</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                {savedLayouts.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {savedLayouts.map((layout) => (
                      <DropdownMenuItem
                        key={layout.id}
                        className="flex items-center justify-between"
                        onClick={() => loadLayout(layout.id)}
                      >
                        <span className="truncate">{layout.name}</span>
                        {layout.id === currentLayoutId && (
                          <Check className="h-4 w-4 text-accent" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Done Button */}
            <Button
              size="sm"
              className="gap-2"
              onClick={handleExitEditMode}
            >
              <Check className="h-4 w-4" />
              Done
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={toggleEditMode}
          >
            <Pencil className="h-4 w-4" />
            Edit Dashboard
          </Button>
        )}
      </div>
    </div>
  );
};
