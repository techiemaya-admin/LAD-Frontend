import React from 'react';
import { Plus, Mic, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SidebarSkeleton() {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col overflow-hidden shadow-lg">
      {/* Header - Always Visible */}
      <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-xl text-foreground">Voice Agents</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">Select or create an agent</p>
      </div>

      {/* Create New Button - Always Visible */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 md:py-3 lg:py-3 border-b border-border/30">
        <Button
          disabled
          className="w-full justify-start gap-3 h-11 transition-all duration-200 font-medium"
          variant="outline"
        >
          <Plus className="h-5 w-5" />
          <span>Create New Agent</span>
        </Button>
      </div>

      {/* Search Box - Always Visible */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents by name, language..."
            disabled
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-9 py-2.5 rounded-lg bg-muted/30 border border-border/50",
              "text-sm placeholder:text-muted-foreground text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
              "transition-all duration-200 cursor-not-allowed opacity-75"
            )}
          />
        </div>
      </div>

      {/* Agent List - Skeleton Loading */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        <div className="space-y-2 p-3 md:p-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3 p-3 sm:p-4 rounded-xl border-2 border-border/30">
              {/* Top Row: Icon + Name + Chevron */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg skeleton shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-24 rounded skeleton" />
                    <div className="h-3 w-32 rounded skeleton mt-1.5" />
                  </div>
                </div>
                <div className="h-5 w-5 rounded skeleton shrink-0 ml-2" />
              </div>
              
              {/* Bottom Row: Badges */}
              <div className="flex gap-2 flex-wrap">
                <div className="h-6 w-16 rounded-full skeleton" />
                <div className="h-6 w-12 rounded-full skeleton" />
                <div className="h-6 w-14 rounded-full skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
