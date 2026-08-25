import React from 'react';
import { Plus, Mic, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SidebarSkeleton() {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="glass-card dark:bg-[#071131] dark:border-blue-950/40 w-full min-w-0 max-w-none rounded-2xl h-full flex flex-col overflow-hidden shadow-lg">
      {/* Header */}
      <div className="w-full p-3 sm:p-4 md:p-5 lg:p-6 border-b border-border/50 dark:border-blue-950/40 bg-primary/5 dark:bg-[#071131]">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-xl text-foreground">Voice Agents</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">Select or create an agent</p>
      </div>

      {/* Search and Action Buttons Row */}
      <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 border-b border-border/30 dark:border-blue-950/40">
        {/* Search Bar */}
        <div className="relative w-full mb-3 mx-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents"
            disabled
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-9 py-2.5 rounded-lg bg-muted/30 dark:bg-[#071131] border border-border/50 dark:border-blue-950/40",
              "text-sm placeholder:text-muted-foreground text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
              "transition-all duration-200 cursor-not-allowed opacity-75"
            )}
          />
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 w-full">
          <Button
            disabled
            className="justify-center gap-2 h-10 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] text-white shadow-lg transition-all font-medium flex opacity-75"
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="whitespace-nowrap">New Agent</span>
          </Button>
          <Button
            disabled
            variant="outline"
            size="sm"
            className="justify-center gap-2 h-10 font-medium flex-1 px-3 sm:px-4 border-border/50 dark:border-blue-950/40 text-muted-foreground opacity-75"
          >
            <Sparkles className="h-4 w-4" />
            <span className="whitespace-nowrap">VOAG Playground</span>
          </Button>
        </div>
      </div>

      {/* Agent List - Skeleton Loading */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        <div className="space-y-2 p-3 md:p-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3 p-3 sm:p-4 rounded-xl border-2 border-border/30 dark:border-blue-950/40 bg-muted/10 dark:bg-[#00051d]/40">
              {/* Top Row: Icon + Name + Chevron */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg skeleton dark:bg-slate-800/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-24 rounded skeleton dark:bg-slate-800/60" />
                    <div className="h-3 w-32 rounded skeleton dark:bg-slate-800/60 mt-1.5" />
                  </div>
                </div>
                <div className="h-5 w-5 rounded skeleton dark:bg-slate-800/60 shrink-0 ml-2" />
              </div>
              
              {/* Bottom Row: Badges */}
              <div className="flex gap-2 flex-wrap">
                <div className="h-6 w-16 rounded-full skeleton dark:bg-slate-800/60" />
                <div className="h-6 w-12 rounded-full skeleton dark:bg-slate-800/60" />
                <div className="h-6 w-14 rounded-full skeleton dark:bg-slate-800/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
