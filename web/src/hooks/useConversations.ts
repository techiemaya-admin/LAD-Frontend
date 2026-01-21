import { useState, useMemo, useCallback } from 'react';
import { Conversation, Channel, Message } from '@/types/conversation';
import { mockConversations } from '@/data/mockConversations';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedId, setSelectedId] = useState<string | null>(mockConversations[0]?.id || null);
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesChannel = channelFilter === 'all' || conv.channel === channelFilter;
      const matchesSearch = 
        searchQuery === '' ||
        conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesChannel && matchesSearch;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [conversations, channelFilter, searchQuery]);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || null;
  }, [conversations, selectedId]);

  const unreadCounts = useMemo(() => {
    const counts = { all: 0, whatsapp: 0, linkedin: 0, gmail: 0 };
    conversations.forEach((conv) => {
      counts.all += conv.unreadCount;
      counts[conv.channel] += conv.unreadCount;
    });
    return counts;
  }, [conversations]);

  const selectConversation = useCallback((id: string) => {
    setSelectedId(id);
    // Mark as read
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, unreadCount: 0 } : conv
      )
    );
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!selectedId || !content.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedId,
      content: content.trim(),
      timestamp: new Date(),
      isOutgoing: true,
      status: 'sent',
      sender: { id: 'user-1', name: 'You' },
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: newMessage,
              updatedAt: new Date(),
            }
          : conv
      )
    );
  }, [selectedId]);

  const markAsResolved = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, status: 'resolved' } : conv
      )
    );
  }, []);

  const muteConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id
          ? { ...conv, status: conv.status === 'muted' ? 'open' : 'muted' }
          : conv
      )
    );
  }, []);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    selectedConversation,
    selectedId,
    selectConversation,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
  };
}
