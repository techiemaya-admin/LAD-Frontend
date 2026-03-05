"use client";
import { memo, useEffect, useRef } from 'react';
import { MessageSquare, Linkedin, Loader2, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import type { RealConversation, RealMessage } from '@/features/conversations/useConversations';
import { MessageComposer } from './MessageComposer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RealChatWindowProps {
    conversation: RealConversation | null;
    messages: RealMessage[];
    messagesLoading: boolean;
    onMarkResolved: (id: string) => void;
    onMute: (id: string) => void;
    onSendMessage: (content: string) => void;
    onTogglePanel: () => void;
    isPanelOpen: boolean;
}

function formatTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        const today = new Date();
        const isToday =
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
        if (isToday) return 'Today';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'sending') return <Clock className="w-3 h-3 text-muted-foreground" />;
    if (status === 'failed') return <AlertCircle className="w-3 h-3 text-destructive" />;
    if (status === 'read') return <CheckCheck className="w-3 h-3 text-blue-500" />;
    return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
}

export const RealChatWindow = memo(function RealChatWindow({
    conversation,
    messages,
    messagesLoading,
    onMarkResolved,
    onMute,
    onSendMessage,
    onTogglePanel,
    isPanelOpen,
}: RealChatWindowProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages load
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-background/50 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-1">Select a conversation</h3>
                <p className="text-sm">Choose from your conversations on the left</p>
            </div>
        );
    }

    // Group messages by date
    const grouped: { date: string; msgs: RealMessage[] }[] = [];
    messages.forEach(msg => {
        const date = formatDate(msg.createdAt);
        const last = grouped[grouped.length - 1];
        if (last && last.date === date) {
            last.msgs.push(msg);
        } else {
            grouped.push({ date, msgs: [msg] });
        }
    });

    const avatarInitials = conversation.leadName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shadow-sm">
                <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                    <AvatarImage src={conversation.leadAvatarUrl || ''} alt={conversation.leadName} />
                    <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                        {avatarInitials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                            {conversation.leadLinkedIn ? (
                                <a href={conversation.leadLinkedIn} target="_blank" rel="noreferrer" className="hover:underline">
                                    {conversation.leadName}
                                </a>
                            ) : (
                                conversation.leadName
                            )}
                        </span>
                        <Linkedin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        {conversation.hasReply && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                Replied
                            </span>
                        )}
                    </div>
                    {(conversation.leadEmail || conversation.leadHeadline || conversation.accountName) && (
                        <p className="text-xs text-muted-foreground truncate">
                            {conversation.leadHeadline || conversation.leadEmail || conversation.accountName}
                        </p>
                    )}
                </div>
                <button
                    onClick={onTogglePanel}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    title={isPanelOpen ? 'Close info panel' : 'Open info panel'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messagesLoading && (
                    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading messages...</span>
                    </div>
                )}

                {!messagesLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">No messages yet</p>
                    </div>
                )}

                {grouped.map(({ date, msgs }) => (
                    <div key={date}>
                        {/* Date separator */}
                        <div className="flex items-center gap-2 my-3">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground px-2">{date}</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <div className="space-y-2">
                            {msgs.map(msg => {
                                const isOutgoing = msg.isOutgoing || msg.direction === 'OUTGOING';
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {/* Incoming: show avatar */}
                                        {!isOutgoing && (
                                            <Avatar className="h-7 w-7 mr-2 mt-1 flex-shrink-0 border border-border">
                                                <AvatarImage src={conversation.leadAvatarUrl || ''} alt={msg.senderName || conversation.leadName} />
                                                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                                                    {avatarInitials}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}

                                        <div className={`max-w-[70%] ${isOutgoing ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                                            {/* Sender name for incoming */}
                                            {!isOutgoing && (
                                                <span className="text-xs text-muted-foreground pl-1">{msg.senderName || conversation.leadName}</span>
                                            )}

                                            <div
                                                className={`
                          px-3 py-2 rounded-2xl text-sm leading-relaxed
                          ${isOutgoing
                                                        ? 'bg-[#0B1957] text-white rounded-br-sm'
                                                        : 'bg-white border border-border text-foreground rounded-bl-sm shadow-sm'
                                                    }
                          ${msg.status === 'failed' ? 'opacity-60 bg-red-100 border-red-200 text-red-700' : ''}
                        `}
                                            >
                                                {msg.text}
                                            </div>

                                            {/* Time + status */}
                                            <div className={`flex items-center gap-1 px-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                                                {isOutgoing && <StatusIcon status={msg.status} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <MessageComposer
                channel="linkedin"
                onSendMessage={onSendMessage}
                disabled={conversation.status === 'resolved'}
            />
        </div>
    );
});
