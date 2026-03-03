import React, { useState, useMemo } from 'react';
import { Plus, Bot, ChevronRight, Mic, User, Search, X } from 'lucide-react';
import { Agent, AgentStatus } from '@/types/agent';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  isLoading?: boolean;
}

const statusConfig: Record<AgentStatus, { label: string; className: string; bgColor: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 border-emerald-300', bgColor: 'bg-emerald-50' },
  draft: { label: 'Draft', className: 'bg-amber-100 text-amber-800 border-amber-300', bgColor: 'bg-amber-50' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-800 border-slate-300', bgColor: 'bg-slate-50' },
};

export function AgentSelector({
  agents,
  selectedAgentId,
  onSelectAgent,
  isLoading = false,
}: AgentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;

    const query = searchQuery.toLowerCase();
    return agents.filter(agent => {
      const name = (agent.name || agent.agent_name || '').toLowerCase();
      const language = (agent.language || agent.agent_language || agent.accent || '').toLowerCase();
      const provider = (agent.provider || '').toLowerCase();
      const description = (agent.description || '').toLowerCase();
      
      return (
        name.includes(query) ||
        language.includes(query) ||
        provider.includes(query) ||
        description.includes(query)
      );
    });
  }, [agents, searchQuery]);
  return (
    <div className="glass-card rounded-2xl h-full flex flex-col overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-xl text-foreground">Voice Agents</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">Select or create an agent</p>
      </div>

      {/* Create New Button */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 md:py-3 lg:py-3 border-b border-border/30">
        <Button
          onClick={() => onSelectAgent(null)}
          className={cn(
            "w-full justify-start gap-3 h-11 transition-all duration-200 font-medium",
            selectedAgentId === null && "gradient-primary shadow-lg scale-[1.02]"
          )}
          variant={selectedAgentId === null ? "default" : "outline"}
        >
          <Plus className="h-5 w-5" />
          <span>Create New Agent</span>
        </Button>
      </div>

      {/* Search Box */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents by name, language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-9 py-2.5 rounded-lg bg-muted/30 border border-border/50",
              "text-sm placeholder:text-muted-foreground text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
              "transition-all duration-200"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        <div className="space-y-2 p-3 md:p-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl skeleton h-20" />
            ))
          ) : filteredAgents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">{agents.length === 0 ? 'No agents yet' : 'No matching agents'}</p>
              <p className="text-xs mt-1">
                {agents.length === 0 
                  ? 'Create your first voice agent' 
                  : 'Try adjusting your search terms'}
              </p>
            </div>
          ) : (
            filteredAgents.map((agent, index) => {
              const agentId = agent.id || agent.agent_id;
              const agentName = agent.name || agent.agent_name || 'Unnamed Agent';
              const isSelected = selectedAgentId === agentId;
              const status = agent.status ? statusConfig[agent.status as AgentStatus] : statusConfig['active'];
              const language = agent.accent || agent.language || agent.agent_language || 'en';
              const genderIcon = agent.voice_gender === 'male' ? '♂️' : agent.voice_gender === 'female' ? '♀️' : '◉';
              const providerDisplay = agent.provider?.replace('-', ' ').replace('google chirp', 'Google') || '';
              
              return (
                <button
                  key={agentId}
                  onClick={() => onSelectAgent(agentId || '')}
                  className={cn(
                    "w-full text-left rounded-lg md:rounded-xl transition-all duration-300 border-2",
                    "hover:shadow-lg hover:border-primary/50 hover:scale-[1.01] md:hover:scale-[1.02]",
                    "animate-fade-in-up group overflow-hidden",
                    isSelected 
                      ? `border-primary ${status.bgColor} bg-gradient-to-r from-primary/10 via-transparent to-transparent shadow-lg` 
                      : "border-border/30 hover:border-border/60 hover:bg-accent/5 bg-background"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-3 sm:p-4">
                    {/* Top Row: Icon + Name + Chevron */}
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "p-2 rounded-lg shrink-0 transition-colors",
                          isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Mic className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-sm leading-snug break-words",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {agentName}
                          </h3>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-300 ml-2",
                        "text-muted-foreground group-hover:text-foreground",
                        isSelected && "text-primary rotate-90"
                      )} />
                    </div>

                    {/* Status Badge */}
                    <div className="mb-2 sm:mb-3">
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs font-medium border",
                          status.className
                        )}
                      >
                        {status.label}
                      </Badge>
                    </div>

                    {/* Metadata Row: Gender, Language, Provider */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      {/* Gender */}
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
                        <span className="text-sm">{genderIcon}</span>
                        <span className="text-muted-foreground capitalize truncate">
                          {agent.voice_gender || 'N/A'}
                        </span>
                      </div>
                      
                      {/* Language */}
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
                        <span className="text-base">🌐</span>
                        <span className="text-muted-foreground uppercase truncate font-mono">
                          {language}
                        </span>
                      </div>

                      {/* Provider */}
                      {agent.provider && (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40">
                          <span className="text-base">🔊</span>
                          <span className="text-muted-foreground text-xs truncate capitalize">
                            {providerDisplay}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {agent.description && (
                      <div className={cn(
                        "p-2 rounded-lg text-xs leading-relaxed",
                        isSelected ? "bg-primary/10 text-primary/90" : "bg-muted/30 text-muted-foreground"
                      )}>
                        {agent.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-border/50 bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {searchQuery ? (
            <>
              <span className="font-medium text-foreground">{filteredAgents.length}</span> of <span className="font-medium text-foreground">{agents.length}</span> agent{agents.length !== 1 ? 's' : ''} found
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{agents.length}</span> agent{agents.length !== 1 ? 's' : ''} configured
            </>
          )}
        </p>
      </div>
    </div>
  );
}
