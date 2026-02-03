import { memo, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Search, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Conversation, Channel } from '@/types/conversation';
import { ConversationListItem } from './ConversationListItem';
import { ChannelIcon } from './ChannelIcon';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  channelFilter: Channel | 'all';
  onChannelFilterChange: (channel: Channel | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unreadCounts: Record<Channel | 'all', number>;
}

const channelButtons: { id: Channel | 'all'; label: string; channel?: Channel }[] = [
  { id: 'all', label: 'All' },
  { id: 'whatsapp', label: 'WhatsApp', channel: 'whatsapp' },
  { id: 'linkedin', label: 'LinkedIn', channel: 'linkedin' },
  { id: 'gmail', label: 'Gmail', channel: 'gmail' },
];

const channelColorMap: Record<string, string> = {
  whatsapp: 'hover:bg-green-50 border-green-200',
  linkedin: 'hover:bg-blue-50 border-blue-200',
  gmail: 'hover:bg-orange-50 border-orange-200',
  all: 'bg-slate-900 text-white hover:bg-slate-800',
};

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  selectedId,
  onSelectConversation,
  channelFilter,
  onChannelFilterChange,
  searchQuery,
  onSearchChange,
  unreadCounts,
}: ConversationSidebarProps) {
  const renderItem = useCallback(
    (index: number) => {
      const conversation = conversations[index];
      return (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedId === conversation.id}
          onSelect={onSelectConversation}
        />
      );
    },
    [conversations, selectedId, onSelectConversation]
  );

  const itemContent = useCallback(
    (index: number) => renderItem(index),
    [renderItem]
  );

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-secondary/50"
          />
        </div>
      </div>

      {/* Channel Filters */}
      <div className="p-2 flex gap-1 border-b border-border overflow-x-auto">
        {channelButtons.map(({ id, label, channel }) => {
          const isActive = channelFilter === id;
          const count = unreadCounts[id];

          return (
            <Button
              key={id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChannelFilterChange(id)}
              className={cn(
                'flex-shrink-0 h-8 px-2.5 gap-1.5 text-xs font-medium transition-all',
                isActive ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800' : channelColorMap[id]
              )}
            >
              {channel ? (
                <ChannelIcon channel={channel} size={14} />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center',
                    isActive ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Conversation List - Virtualized */}
      <div className="flex-1 overflow-hidden">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No conversations found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <Virtuoso
            style={{ height: '100%' }}
            totalCount={conversations.length}
            itemContent={itemContent}
            className="custom-scrollbar"
          />
        )}
      </div>
    </div>
  );
});
