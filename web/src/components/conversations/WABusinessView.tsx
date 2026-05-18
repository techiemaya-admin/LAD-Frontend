"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversations, useConversationMessages } from '@lad/frontend-features/conversations';
import type { Conversation, Message } from '@/types/conversation';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageList } from '../../../../../../LAD/l_code/web/src/components/conversations/MessageList';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  X, Video, Phone, Ban, ThumbsDown, Trash2, 
  MoreHorizontal, Smile, Paperclip, Mic, Send, MessageSquare, MessageSquarePlus, CheckCheck,
  Search, PlusSquare, MoreVertical, ArrowLeft, Grip, UserPlus, Users, Plus, FileText, ChevronDown,
  Pencil, Image as ImageIcon, Star, Bell, Clock, Shield, Lock, Heart, List, MinusCircle, ChevronRight,
  Info, CheckSquare, BellOff, XCircle, Link, Calendar, ListChecks, LogOut
} from 'lucide-react';

/* ========================================================================= */
/* WABAContextPanel                                                          */
/* ========================================================================= */

function WABAContextPanel({ conversation, onClose }: any) {
  if (!conversation) return null;

  const mockImages = [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop'
  ];

  return (
    <div className="h-full flex flex-col bg-background dark:bg-[#161717] overflow-y-auto border-l border-border dark:border-[#222d34]/80">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background dark:bg-[#161717] sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <X className="w-5 h-5 cursor-pointer text-muted-foreground dark:text-white hover:text-foreground" onClick={onClose} />
          <h2 className="font-normal text-[16px] text-foreground dark:text-white">Contact info</h2>
        </div>
        <Pencil className="w-5 h-5 cursor-pointer text-muted-foreground dark:text-white hover:text-foreground" />
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Profile Block */}
        <div className="flex flex-col items-center pt-6 pb-2">
          <Avatar className="w-[200px] h-[200px] mb-6 shadow-sm">
            <AvatarImage src={conversation.contact?.avatar} />
            <AvatarFallback className="text-6xl">{conversation.contact?.name?.[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-[24px] font-medium text-foreground dark:text-white mb-1">{conversation.contact?.name}</h2>
          <span className="text-[16px] text-muted-foreground dark:text-[#a2a2a2] mb-6">+91 98229 14250</span>

          <div className="flex gap-4 mb-4">
            <div className="w-[100px] h-[72px] border border-border dark:border-[#222d34] rounded-[16px] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
              <Search className="w-5 h-5 text-[#00a884] mb-1.5" />
              <span className="text-[14px] text-foreground dark:text-white">Search</span>
            </div>
          </div>
        </div>

        <div className="px-6 mb-4 mt-2">
          <span className="text-[14px] text-muted-foreground dark:text-[#a2a2a2] font-medium">About</span>
        </div>

        <div className="h-[1px] bg-border dark:bg-[#222d34] mx-6 my-2" />

        {/* Media */}
        <div className="py-2">
          <div className="flex items-center justify-between px-6 mb-4 cursor-pointer">
            <div className="flex items-center gap-4">
              <ImageIcon className="w-5 h-5 text-muted-foreground dark:text-white" />
              <h4 className="text-[15px] font-normal text-foreground dark:text-white">Media, links and docs</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-muted-foreground dark:text-[#a2a2a2]">26</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2 px-6 overflow-x-auto no-scrollbar">
            {mockImages.map((src, i) => (
              <div key={i} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden cursor-pointer">
                <img src={src} className="w-full h-full object-cover" alt="media" />
              </div>
            ))}
          </div>
        </div>

        <div className="h-[1px] bg-border dark:bg-[#222d34] mx-6 my-4" />

        {/* Settings 1 */}
        <div className="py-2">
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <Star className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <span className="text-[16px] text-foreground dark:text-white flex-1">Starred messages</span>
          </div>
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <span className="text-[16px] text-foreground dark:text-white flex-1">Mute notifications</span>
            <Switch />
          </div>
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <Clock className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <div className="flex-1">
              <span className="text-[16px] text-foreground dark:text-white block">Disappearing messages</span>
              <span className="text-[14px] text-muted-foreground dark:text-[#a2a2a2] mt-0.5 block">Off</span>
            </div>
          </div>
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <Shield className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <div className="flex-1">
              <span className="text-[16px] text-foreground dark:text-white block">Advanced chat privacy</span>
              <span className="text-[14px] text-muted-foreground dark:text-[#a2a2a2] mt-0.5 block">Off</span>
            </div>
          </div>
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <Lock className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <div className="flex-1">
              <span className="text-[16px] text-foreground dark:text-white block">Encryption</span>
              <span className="text-[14px] text-muted-foreground dark:text-[#a2a2a2] mt-0.5 block">Messages are end-to-end encrypted. Click to verify.</span>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-border dark:bg-[#222d34] mx-6 my-2" />

        {/* Settings 2 */}
        <div className="py-2">
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <Heart className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <span className="text-[16px] text-foreground dark:text-white flex-1">Add to favourites</span>
          </div>
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors">
            <List className="w-5 h-5 text-muted-foreground dark:text-white mr-6" />
            <div className="flex-1 flex justify-between items-center">
              <span className="text-[16px] text-foreground dark:text-white">Add to list</span>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-border dark:bg-[#222d34] mx-6 my-2" />

        {/* Actions */}
        <div className="py-2 px-4 space-y-2">
          <div className="flex items-center px-4 py-3 rounded-2xl cursor-pointer bg-[#2a171b] hover:bg-[#351e23] transition-colors text-[#f15c6d]">
            <MinusCircle className="w-5 h-5 mr-4" />
            <span className="text-[16px]">Clear chat</span>
          </div>
          <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] rounded-2xl transition-colors text-[#f15c6d]">
            <Ban className="w-5 h-5 mr-4" />
            <div className="flex-1">
              <span className="text-[16px] block">Block</span>
              <span className="text-[14px] opacity-80 mt-0.5 block">{conversation.contact?.name?.split(' ')[0] || 'Home'}</span>
            </div>
          </div>
          <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] rounded-2xl transition-colors text-[#f15c6d]">
            <ThumbsDown className="w-5 h-5 mr-4" />
            <div className="flex-1">
              <span className="text-[16px] block">Report</span>
              <span className="text-[14px] opacity-80 mt-0.5 block">{conversation.contact?.name?.split(' ')[0] || 'Home'}</span>
            </div>
          </div>
          <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] rounded-2xl transition-colors text-[#f15c6d]">
            <Trash2 className="w-5 h-5 mr-4" />
            <span className="text-[16px]">Delete chat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* WABAChatWindow                                                            */
/* ========================================================================= */

// ── Deduplicate messages by ID (newest wins on tie) ───────────────────────────
function dedupeById(msgs: Message[]): Message[] {
  const seen = new Map<string, Message>();
  for (const m of msgs) seen.set(m.id, m);
  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

const INITIAL_LIMIT = 50;
const LOAD_MORE_LIMIT = 100;

function WABAChatWindow({ 
  conversation, 
  onSendMessage, 
  onTogglePanel, 
  isPanelOpen, 
  onBack,
  onDeleteChat,
  onBlockChat,
  onFavoriteChat,
  onMuteChat,
  onClearChat,
  onCloseChat,
  channel
}: any) {
  const [text, setText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  
  const { messages: polledMessages, isLoading, total, isAgentTyping } = useConversationMessages(
    conversation?.id || null,
    { limit: INITIAL_LIMIT },
    channel || 'waba'
  );

  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderOffset, setOlderOffset] = useState(INITIAL_LIMIT);

  // Reset older messages when conversation changes
  const prevConvId = useRef<string | null>(null);
  useEffect(() => {
    if (conversation?.id && conversation.id !== prevConvId.current) {
      prevConvId.current = conversation.id;
      setOlderMessages([]);
      setOlderOffset(INITIAL_LIMIT);
    }
  }, [conversation?.id]);

  const allMessages = dedupeById([...olderMessages, ...polledMessages]);
  const hasMore = total > olderOffset;

  const matchingMessageIds = useMemo(() => {
    if (!searchText.trim()) return [];
    return allMessages
      .filter(m => m.content?.toLowerCase().includes(searchText.toLowerCase()))
      .map(m => m.id);
  }, [allMessages, searchText]);

  const totalMatches = matchingMessageIds.length;

  const handleSearchNext = () => {
    setSearchMatchIndex(prev => (prev + 1) % totalMatches);
  };
  const handleSearchPrev = () => {
    setSearchMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches);
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingOlder || !conversation?.id || !hasMore) return;
    setLoadingOlder(true);
    try {
      const url = `/api/whatsapp-conversations/conversations/${conversation.id}/messages` +
        `?limit=${LOAD_MORE_LIMIT}&offset=${olderOffset}&channel=${channel || 'waba'}`;
      const res = await fetchWithTenant(url);
      if (!res.ok) return;
      const data = await res.json();
      const raw: any[] = data.data || data.messages || [];

      const mapped: Message[] = raw.map((r: any) => {
        const rawRole = r.role || 'user';
        const meta =
          typeof r.metadata === 'string'
            ? (() => { try { return JSON.parse(r.metadata); } catch { return {}; } })()
            : (r.metadata || {});
        const role =
          meta.sender_type === 'human_agent' && rawRole === 'assistant'
            ? 'human_agent'
            : rawRole;
        const isOutgoing = role === 'assistant' || role === 'AI' || role === 'human_agent';
        return {
          id: r.id,
          conversationId: r.conversation_id,
          content: r.content || '',
          timestamp: new Date(r.created_at),
          isOutgoing,
          status: r.message_status || 'sent',
          sender: {
            id: isOutgoing ? (meta.human_agent_id || 'agent') : r.lead_id || 'user',
            name: isOutgoing ? (role === 'human_agent' ? (meta.sender_name || 'Agent') : 'AI Agent') : 'Contact',
          },
          role,
          senderName: role === 'human_agent' ? (meta.sender_name || undefined) : undefined,
          humanAgentId: meta.human_agent_id || undefined,
        } as Message;
      });

      setOlderMessages((prev) => dedupeById([...mapped, ...prev]));
      setOlderOffset((prev) => prev + LOAD_MORE_LIMIT);
    } catch (err) {
      console.error('Failed to load older messages', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversation?.id, loadingOlder, hasMore, olderOffset]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] border-l border-border dark:border-[#222d34]">
        <div className="bg-white dark:bg-[#111b21] p-8 rounded-2xl max-w-sm w-full flex flex-col items-center text-center shadow-sm">
          <div className="mb-6 relative">
             <div className="w-32 h-24 relative flex items-center justify-center">
                <svg viewBox="0 0 200 150" className="w-full h-full text-[#00a884]">
                   <path d="M40 120 L160 120 C165 120 170 115 170 110 L170 40 C170 35 165 30 160 30 L40 30 C35 30 30 35 30 40 L30 110 C30 115 35 120 40 120 Z" fill="#e9edef" />
                   <rect x="35" y="35" width="130" height="80" fill="#202c33" />
                   <path d="M20 125 L180 125 C185 125 185 130 180 130 L20 130 C15 130 15 125 20 125 Z" fill="#d1d7db" />
                   <rect x="40" y="40" width="120" height="70" fill="#00a884" />
                   <rect x="50" y="50" width="40" height="10" rx="2" fill="#fff" opacity="0.9" />
                   <rect x="110" y="70" width="40" height="10" rx="2" fill="#dcf8c6" />
                </svg>
             </div>
          </div>
          <h2 className="text-[19px] font-normal text-foreground dark:text-[#e9edef] mb-2">Download WhatsApp for Mac</h2>
          <p className="text-[13px] text-muted-foreground dark:text-[#8696a0] mb-8 leading-5">
            Make calls and get a faster experience when you download the Mac app.
          </p>
          <button className="bg-[#00a884] hover:bg-[#008f6f] text-white dark:text-[#111b21] font-medium text-[13px] px-6 py-2.5 rounded-full transition-colors">
            Get from App Store
          </button>
        </div>

        <div className="flex gap-6 mt-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-white dark:bg-[#111b21] rounded-2xl flex items-center justify-center shadow-sm cursor-pointer hover:bg-muted dark:hover:bg-[#202c33]">
              <FileText className="w-6 h-6 text-muted-foreground dark:text-[#8696a0]" />
            </div>
            <span className="text-[13px] text-muted-foreground dark:text-[#8696a0]">Send document</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-white dark:bg-[#111b21] rounded-2xl flex items-center justify-center shadow-sm cursor-pointer hover:bg-muted dark:hover:bg-[#202c33]">
              <UserPlus className="w-6 h-6 text-muted-foreground dark:text-[#8696a0]" />
            </div>
            <span className="text-[13px] text-muted-foreground dark:text-[#8696a0]">Add contact</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-white dark:bg-[#111b21] rounded-2xl flex items-center justify-center shadow-sm cursor-pointer hover:bg-muted dark:hover:bg-[#202c33]">
              <svg className="w-6 h-6 text-muted-foreground dark:text-[#8696a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </div>
            <span className="text-[13px] text-muted-foreground dark:text-[#8696a0]">Ask Meta AI</span>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage({ type: 'text', content: text });
    setText('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#161717] border-l border-border dark:border-[#222d34] relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-repeat opacity-[0.4] dark:opacity-[0.06]" style={{ backgroundImage: 'url("/assets/wa-dark-bg.png")' }} />
      {/* Header */}
      <div className="h-[60px] px-4 flex items-center justify-between bg-white dark:bg-[#161717] shrink-0 z-10 relative">

        {isSearchOpen ? (
          // ✅ NEW — search mode header
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchText('');
                setSearchMatchIndex(0);
              }}
            >
              <X className="w-5 h-5 text-muted-foreground dark:text-white" />
            </button>
            <input
              autoFocus
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setSearchMatchIndex(0);
              }}
              placeholder="Search messages..."
              className="flex-1 bg-transparent border-b border-[#00a884] text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-[#8696a0] text-[15px] focus:outline-none pb-1"
            />
            {searchText && (
              <div className="flex items-center gap-2 text-muted-foreground dark:text-[#8696a0] text-[13px] shrink-0">
                <span>
                  {totalMatches === 0 ? '0/0' : `${searchMatchIndex + 1}/${totalMatches}`}
                </span>
                <button
                  onClick={handleSearchPrev}
                  disabled={totalMatches === 0}
                  className="hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={handleSearchNext}
                  disabled={totalMatches === 0}
                  className="hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          // ✅ EXISTING header — only 2 small changes inside marked below
          <>
            <div className="flex items-center gap-3 cursor-pointer" onClick={onTogglePanel}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={conversation.contact?.avatar} />
                <AvatarFallback>{conversation.contact?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-[16px] text-foreground dark:text-white">
                  {conversation.contact?.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-5 text-muted-foreground dark:text-white">
              {/* ✅ CHANGE — add onClick here, was just an icon before */}
              <Search
                className="w-5 h-5 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsSearchOpen(true)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MoreVertical className="w-5 h-5 cursor-pointer hover:text-foreground transition-colors" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#161717] border border-border dark:border-0 shadow-lg text-foreground dark:text-[#d1d7db] py-2">
                  <DropdownMenuItem
                    className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4"
                    onClick={onTogglePanel}
                  >
                    <Info className="w-4 h-4" /> <span>Contact info</span>
                  </DropdownMenuItem>
                  {/* ✅ CHANGE — add onClick here too */}
                  <DropdownMenuItem
                    className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="w-4 h-4" /> <span>Search</span>
                  </DropdownMenuItem>
                  {/* all other items stay exactly the same */}
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <CheckSquare className="w-4 h-4" /> <span>Select messages</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex justify-between group" onClick={() => onMuteChat?.(conversation?.id)}>
                    <div className="flex items-center gap-4"><BellOff className="w-4 h-4" /> <span>Mute notifications</span></div>
                    <ChevronRight className="w-4 h-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <Clock className="w-4 h-4" /> <span>Disappearing messages</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onFavoriteChat?.(conversation?.id)}>
                    <Heart className="w-4 h-4" /> <span>Add to favourites</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <List className="w-4 h-4" /> <span>Add to list</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onCloseChat?.(conversation?.id)}>
                    <XCircle className="w-4 h-4" /> <span>Close chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <Link className="w-4 h-4" /> <span>Send call link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <Calendar className="w-4 h-4" /> <span>Schedule call</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <ThumbsDown className="w-4 h-4" /> <span>Report</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onBlockChat?.(conversation?.id)}>
                    <Ban className="w-4 h-4" /> <span>Block</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onClearChat?.(conversation?.id)}>
                    <MinusCircle className="w-4 h-4" /> <span>Clear chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-accent dark:focus:bg-[#182229] focus:text-white dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onDeleteChat?.(conversation?.id)}>
                    <Trash2 className="w-4 h-4" /> <span>Delete chat</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <MessageList
        messages={allMessages}
        conversationId={conversation.id}
        contact={conversation.contact}
        isAgentTyping={isAgentTyping}
        hasMore={hasMore}
        isLoadingMore={loadingOlder}
        onLoadMore={handleLoadMore}
        searchText={searchText}
        highlightedMessageId={matchingMessageIds[searchMatchIndex]}
      />

      {/* Composer */}
      <div className="p-3 px-4 bg-white dark:bg-[#161717] flex items-center shrink-0 z-10 relative">
        <div className="flex-1 flex items-center bg-[#f0f2f5] dark:bg-[#2e2f2f] rounded-full px-4 h-[44px]">
          <Plus className="w-6 h-6 text-muted-foreground dark:text-white shrink-0 cursor-pointer hover:text-foreground transition-colors mr-3" />
          <Smile className="w-6 h-6 text-muted-foreground dark:text-white shrink-0 cursor-pointer hover:text-foreground transition-colors mr-3" />
          <Input 
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message"
            className="flex-1 bg-transparent dark:bg-transparent border-0 text-foreground dark:text-[#e9edef] h-full px-0 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#8696a0] dark:placeholder:text-[#a2a2a2]"
          />
          <div className="shrink-0 cursor-pointer transition-colors ml-3" onClick={text ? handleSend : undefined}>
            {text ? <Send className="w-6 h-6 text-[#00a884] hover:text-[#008f6f]" /> : <Mic className="w-6 h-6 text-muted-foreground dark:text-white hover:text-foreground" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* WABASidebar                                                               */
/* ========================================================================= */

interface WABASidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type PanelView = 'main' | 'new_chat' | 'dialpad' | 'create_list';
type FilterTab = 'all' | 'unread' | 'favourites' | 'groups';

function WABASidebar({ conversations, selectedId, onSelectConversation, searchQuery, onSearchChange }: WABASidebarProps) {
  const [activePanel, setActivePanel] = useState<PanelView>('main');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [phoneNumber, setPhoneNumber] = useState('');

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchesSearch = searchQuery 
        ? conv.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          conv.contact?.phone?.includes(searchQuery)
        : true;
      
      if (!matchesSearch) return false;

      if (filterTab === 'unread') return conv.unreadCount && conv.unreadCount > 0;
      if (filterTab === 'favourites') return false; // Not implemented yet
      if (filterTab === 'groups') return false; // Not implemented yet
      return true; // 'all'
    });
  }, [conversations, filterTab, searchQuery]);

  const searchResults = useMemo(() => {
  if (!searchQuery) return [];
  return conversations.filter(conv =>
    conv.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contact?.phone?.includes(searchQuery)
  );
}, [conversations, searchQuery]);

  const unreadCount = conversations.filter(c => c.unreadCount && c.unreadCount > 0).length;

  const handleDial = (val: string) => {
    setPhoneNumber(prev => prev + val);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  if (activePanel === 'new_chat') {
    return (
      <div className="h-full flex flex-col bg-background text-foreground dark:bg-[#111b21]">
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-4">
            <ArrowLeft className="w-5 h-5 cursor-pointer" onClick={() => setActivePanel('main')} />
            <h1 className="text-xl font-medium">New chat</h1>
          </div>
          <Grip className="w-5 h-5 cursor-pointer text-muted-foreground dark:text-[#8696a0]" onClick={() => setActivePanel('dialpad')} />
        </div>
        
        <div className="px-4 pb-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-[#8696a0]" />
            <Input 
              placeholder="Search name or number" 
              className="pl-10 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg h-9 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:text-[#8696a0] focus-visible:ring-1 focus-visible:ring-[#00a884]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2">
          {/* Action items */}
          <div className="flex items-center gap-4 p-3 px-4 cursor-pointer hover:bg-muted/30 dark:hover:bg-[#202c33]/50">
            <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[#111111]" />
            </div>
            <span className="text-[17px] text-foreground dark:text-[#e9edef]">New group</span>
          </div>
          <div className="flex items-center gap-4 p-3 px-4 cursor-pointer hover:bg-muted/30 dark:hover:bg-[#202c33]/50">
            <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6 text-[#111111]" />
            </div>
            <span className="text-[17px] text-foreground dark:text-[#e9edef]">New contact</span>
          </div>
          <div className="flex items-center gap-4 p-3 px-4 cursor-pointer hover:bg-muted/30 dark:hover:bg-[#202c33]/50">
            <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[#111111]" />
            </div>
            <span className="text-[17px] text-foreground dark:text-[#e9edef]">New community</span>
          </div>

          <div className="mt-4 mb-2 px-4">
            <span className="text-sm font-medium text-[#00a884]">Contacts on WhatsApp</span>
          </div>

          {/* Contact list from real conversations API */}
          {searchQuery && (
            <div className="absolute top-12 left-0 right-0 bg-white dark:bg-[#202c33] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto border border-border dark:border-[#2a3942]">
              {searchResults.length > 0 ? (
                searchResults.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onSearchChange('');
                    }}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a3942]"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conv.contact?.avatar} />
                      <AvatarFallback>
                        {conv.contact?.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-white">
                        {conv.contact?.name}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-[#a2a2a2]">
                        {conv.contact?.phone}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground dark:text-[#8696a0] text-center">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activePanel === 'dialpad') {
    return (
      <div className="h-full flex flex-col bg-background text-foreground dark:bg-[#111b21]">
        <div className="flex items-center gap-4 p-4 pb-4">
          <ArrowLeft className="w-5 h-5 cursor-pointer" onClick={() => setActivePanel('new_chat')} />
          <h1 className="text-xl font-medium">Phone number</h1>
        </div>
        
        <div className="px-8 mt-4">
          <input 
            type="text" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full bg-transparent border-b border-[#00a884] text-xl pb-2 focus:outline-none focus:border-[#00a884] text-center"
            autoFocus
          />
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground dark:text-[#8696a0]">
          Enter a phone number to start a chat
        </div>

        <div className="flex-1 flex justify-center mt-8">
          <div className="grid grid-cols-3 gap-y-8 gap-x-16 max-w-xs w-full px-8">
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('1')}>
              <span className="text-2xl font-semibold">1</span>
              <span className="text-[10px] text-transparent select-none">.</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('2')}>
              <span className="text-2xl font-semibold">2</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">abc</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('3')}>
              <span className="text-2xl font-semibold">3</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">def</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('4')}>
              <span className="text-2xl font-semibold">4</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">ghi</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('5')}>
              <span className="text-2xl font-semibold">5</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">jkl</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('6')}>
              <span className="text-2xl font-semibold">6</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">mno</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('7')}>
              <span className="text-2xl font-semibold">7</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">pqrs</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('8')}>
              <span className="text-2xl font-semibold">8</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">tuv</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('9')}>
              <span className="text-2xl font-semibold">9</span>
              <span className="text-[10px] text-muted-foreground dark:text-[#8696a0] uppercase tracking-widest mt-1">wxyz</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer justify-center" onClick={() => handleDial('+')}>
              <span className="text-2xl font-semibold">+</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleDial('0')}>
              <span className="text-2xl font-semibold">0</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer justify-center" onClick={handleBackspace}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activePanel === 'create_list') {
    return (
      <div className="h-full flex flex-col bg-background text-foreground dark:bg-[#111b21]">
        <div className="flex items-center gap-4 p-4 pb-4">
          <ArrowLeft className="w-5 h-5 cursor-pointer" onClick={() => setActivePanel('main')} />
          <h1 className="text-xl font-medium">Create new list</h1>
        </div>
        
        <div className="px-6 mt-4 flex-1">
          <label className="text-xs text-muted-foreground dark:text-[#8696a0] font-medium mb-2 block">List name</label>
          <div className="relative mb-8 border-b-2 border-[#00a884] pb-1">
            <input 
              type="text" 
              placeholder="List name"
              className="w-full bg-transparent text-sm focus:outline-none pr-8 text-foreground"
            />
            <Smile className="w-5 h-5 absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-[#8696a0] cursor-pointer" />
          </div>

          <label className="text-xs text-muted-foreground dark:text-[#8696a0] font-medium mb-4 block">Included</label>
          <div className="flex items-center gap-4 cursor-pointer hover:bg-muted/30 dark:hover:bg-[#202c33]/50 p-2 -mx-2 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-[#111111]" />
            </div>
            <span className="text-[15px] text-foreground dark:text-[#e9edef]">Add people or groups</span>
          </div>

          <div className="mt-8">
            <button disabled className="px-4 py-2 rounded-full bg-muted dark:bg-[#2a3942] text-muted-foreground dark:text-[#8696a0] text-sm font-medium opacity-50 cursor-not-allowed">
              Create list
            </button>
          </div>
        </div>
      </div>
    );
  }

  // activePanel === 'main'
  return (
    <div className="h-full flex flex-col bg-background text-foreground dark:bg-[#161717]">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h1 className="text-[22px] font-bold dark:text-white">WhatsApp</h1>
        <div className="flex items-center gap-6 text-muted-foreground dark:text-white">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <MessageSquarePlus 
                  className="w-5 h-5 cursor-pointer hover:text-foreground" 
                  onClick={() => setActivePanel('new_chat')} 
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-zinc-800 text-white border-0 text-[10px]">
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreVertical className="w-5 h-5 cursor-pointer hover:text-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#161717] border border-border dark:border-0 text-foreground dark:text-[#d1d7db] py-2 shadow-lg">
              <DropdownMenuItem className="focus:bg-[#182229] focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                <Users className="w-4 h-4" /> <span>New group</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-[#182229] focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                <Star className="w-4 h-4" /> <span>Starred messages</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-[#182229] focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                <CheckSquare className="w-4 h-4" /> <span>Select chats</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-[#182229] focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4">
                <ListChecks className="w-4 h-4" /> <span>Mark all as read</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 pt-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-[#a2a2a2]" />
          <Input 
            placeholder="Search or start a new chat" 
            className="pl-10 bg-[#f0f2f5] dark:bg-[#2e2f2f] border-0 rounded-full h-9 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:text-[#a2a2a2] focus-visible:ring-1 focus-visible:ring-transparent"
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
           {/* ADD THIS */}
           {searchQuery && (
  <div className="absolute top-12 left-0 right-0 bg-white dark:bg-[#202c33] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto border dark:border-[#2a3942]">

    {conversations.length > 0 && filteredConversations.length > 0 ? (
      filteredConversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => {
            onSelectConversation(conv.id);
            onSearchChange('');
          }}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a3942]"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={conv.contact?.avatar} />
            <AvatarFallback>
              {conv.contact?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="text-sm font-medium text-foreground dark:text-white">
              {conv.contact?.name}
            </p>

            <p className="text-xs text-muted-foreground dark:text-[#a2a2a2]">
              {conv.contact?.phone}
            </p>
          </div>
        </div>
      ))
    ) : (
      conversations.length > 0 && (
        <div className="p-3 text-sm text-muted-foreground">
          No results found
        </div>
      )
    )}
  </div>
)}

        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border dark:border-[#222d34]/80">
        <button 
          onClick={() => setFilterTab('all')}
          className={cn("px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border", 
            filterTab === 'all' ? "bg-[#0a332c] dark:bg-[#1a342a] text-[#00a884] border-transparent" : "bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-[#2a3942]"
          )}>
          All
        </button>
        <button 
          onClick={() => setFilterTab('unread')}
          className={cn("px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border", 
            filterTab === 'unread' ? "bg-[#0a332c] dark:bg-[#1a342a] text-[#00a884] border-transparent" : "bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-[#2a3942]"
          )}>
          Unread {unreadCount > 0 ? ` ${unreadCount}` : ''}
        </button>
        <button 
          onClick={() => setFilterTab('favourites')}
          className={cn("px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border", 
            filterTab === 'favourites' ? "bg-[#0a332c] dark:bg-[#1a342a] text-[#00a884] border-transparent" : "bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-[#2a3942]"
          )}>
          Favourites
        </button>
        <button 
          onClick={() => setFilterTab('groups')}
          className={cn("px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border", 
            filterTab === 'groups' ? "bg-[#0a332c] dark:bg-[#1a342a] text-[#00a884] border-transparent" : "bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-[#2a3942]"
          )}>
          Groups
        </button>
        
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="px-3 py-1.5 rounded-full bg-muted/50 dark:bg-[#202c33] text-muted-foreground dark:text-[#a2a2a2] text-[14px] font-normal flex items-center justify-center hover:bg-muted dark:hover:bg-zinc-800 shrink-0"
                onClick={() => setActivePanel('create_list')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-800 text-white border-0 text-[10px]">
              <p>New List</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto mt-0">
        {filterTab === 'favourites' ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-4 h-[80%]">
            <div className="w-32 h-32 bg-muted/50 dark:bg-[#202c33] rounded-full flex items-center justify-center mb-4 relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="#00a884" strokeWidth="4">
                     <rect x="20" y="20" width="60" height="60" rx="8" />
                     <circle cx="50" cy="40" r="10" />
                     <path d="M30 70 C30 50, 70 50, 70 70" />
                  </svg>
               </div>
               <div className="absolute -right-2 -bottom-2 text-[#00a884]">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
               </div>
            </div>
            <h2 className="text-xl font-bold">Add to Favourites</h2>
            <p className="text-[15px] text-muted-foreground dark:text-[#8696a0] mt-2">Make it easy to find the people and groups that matter most across WhatsApp.</p>
            <button className="mt-4 text-[#00a884] text-[15px] font-medium hover:underline">
              Add to Favourites
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground dark:text-[#8696a0]">
            No chats found for this filter.
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isSelected = selectedId === conv.id;
            const initials = conv.contact?.name?.substring(0, 2).toUpperCase();
            // Use lastMessage from the conversation object if available, otherwise fallback to messages array
            const lastMsg = (conv as any).lastMessage || conv.messages?.[conv.messages.length - 1];
            const time = lastMsg ? formatDistanceToNow(new Date(lastMsg.timestamp || lastMsg.created_at || new Date()), { addSuffix: false }) : '';
            
            return (
              <div 
                key={conv.id} 
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "flex items-center gap-4 py-2 px-4 mx-2 cursor-pointer transition-colors rounded-xl",
                  isSelected ? "bg-[#d9fdd3] dark:bg-[#2e2f2f]" : "hover:bg-muted/30 dark:hover:bg-[#2e2f2f]/50"
                )}
              >
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={conv.contact?.avatar} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-medium text-[16px] truncate text-foreground dark:text-white">{conv.contact?.name}</span>
                    <span className={cn(
                      "text-xs",
                      conv.unreadCount ? "text-[#25D366] dark:text-[#00a884] font-medium" : "text-muted-foreground dark:text-[#a2a2a2]"
                    )}>{time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                      {lastMsg?.isOutgoing || lastMsg?.role === 'user' ? (
                        !conv.unreadCount && <CheckCheck className="w-[15px] h-[15px] text-[#53bdeb] shrink-0" />
                      ) : null}
                      <span className="text-[14px] text-muted-foreground dark:text-[#a2a2a2] truncate max-w-[80%]">
                        {lastMsg?.content || 'Started conversation'}
                      </span>
                    </div>
                    {conv.unreadCount ? (
                      <div className="w-[20px] h-[20px] rounded-full bg-[#25D366] dark:bg-[#00a884] text-[11px] font-bold text-white dark:text-[#111b21] flex items-center justify-center">
                        {conv.unreadCount}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* WABusinessView (Main Export)                                              */
/* ========================================================================= */

export function WABusinessView({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
}: {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
}) {
  const channel = 'personal';
  const queryClient = useQueryClient();
  
  const {
    conversations,
    selectedConversation,
    selectedId,
    selectConversation,
    searchQuery,
    setSearchQuery,
    sendMessage,
    muteConversation
  } = useConversations({ channel });

  const withChannel = useCallback(
    (url: string) => `${url}${url.includes('?') ? '&' : '?'}channel=${channel}`,
    [channel]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
  }, [queryClient]);

  const handleFavorite = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`/api/whatsapp-conversations/conversations/${id}/favorite`), { method: 'PATCH' });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`/api/whatsapp-conversations/conversations/${id}`), { method: 'DELETE' });
      if (res.ok) {
        invalidate();
        if (selectedId === id) selectConversation('');
      }
    } catch {}
  }, [withChannel, invalidate, selectedId, selectConversation]);

  const handleBlock = useCallback(async (id: string) => {
    try {
      const res = await fetchWithTenant(withChannel(`/api/whatsapp-conversations/conversations/${id}/status`), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) invalidate();
    } catch {}
  }, [withChannel, invalidate]);

  const handleClear = useCallback(async (id: string) => {
    // Usually handled identically to delete in some configs, or just clearing messages locally
    await handleDelete(id);
  }, [handleDelete]);

  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const toggleContextPanel = useCallback(() => setIsContextPanelOpen((p) => !p), []);

  const typedConversations = useMemo(() => (conversations || []) as Conversation[], [conversations]);
  const typedSelectedConversation = useMemo(
    () => (selectedConversation || null) as Conversation | null,
    [selectedConversation]
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {!isSidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 460, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex-shrink-0 overflow-hidden hidden lg:block border-r border-border dark:border-[#222d34] z-10 relative shadow-sm"
          >
            <WABASidebar
              conversations={typedConversations}
              selectedId={selectedId}
              onSelectConversation={selectConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <WABAChatWindow
        conversation={typedSelectedConversation}
        onSendMessage={sendMessage}
        onTogglePanel={toggleContextPanel}
        isPanelOpen={isContextPanelOpen}
        onBack={() => {
          selectConversation('');
          setIsSidebarCollapsed(false);
        }}
        onDeleteChat={handleDelete}
        onBlockChat={handleBlock}
        onFavoriteChat={handleFavorite}
        onMuteChat={muteConversation}
        onClearChat={handleClear}
        onCloseChat={(id: string) => selectConversation('')}
        channel={channel}
      />

      {/* Context Panel (Contact Info) */}
      <AnimatePresence mode="wait">
        {isContextPanelOpen && typedSelectedConversation && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex-shrink-0 overflow-hidden hidden lg:block border-l border-border dark:border-[#222d34] z-10 relative shadow-sm"
          >
            <WABAContextPanel
              conversation={typedSelectedConversation}
              onClose={toggleContextPanel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
