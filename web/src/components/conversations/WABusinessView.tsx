"use client";

import { useState, useCallback, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversations, useConversationMessages } from '@lad/frontend-features/conversations';
import type { Conversation, Message } from '@/types/conversation';

// ── Type Extensions for API Response Properties ─────────────────────────────
type ExtendedMessage = Message & {
  created_at?: string | Date;
  message_status?: string;
  sender_type?: string;
  human_agent_id?: string;
  sender_name?: string;
  template_name?: string;
  media_id?: string;
  file_url?: string;
  url?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaCaption?: string;
};

type ExtendedConversation = Conversation & {
  leadId?: string | number;
  lead_id?: string | number;
  is_favorite?: boolean;
  isFavorite?: boolean;
  favorite?: boolean;
  is_group?: boolean;
  isGroup?: boolean;
  groupId?: string;
  messageCount?: number;
  context_status?: string | null;
  labels?: Array<string | LabelLike>;
  labelIds?: Array<string | number>;
  owner?: string | null;
};
import { formatDistanceToNow, format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { cn, getAvatarColor } from '@/lib/utils';

function formatWhatsAppSidebarTimestamp(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return '';
  const date = rawTimestamp instanceof Date ? rawTimestamp : new Date(rawTimestamp);
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return format(date, 'h:mm a').toLowerCase();
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const now = new Date();
  const diffDays = differenceInCalendarDays(now, date);

  if (diffDays > 0 && diffDays < 7) {
    return format(date, 'EEEE');
  }

  return format(date, 'dd/MM/yyyy');
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MessageList } from './MessageList';
import { ConversationContextPanel } from './ConversationContextPanel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── New imports needed for the rich New Chat overlay ──────────────────────────
import { TemplatePicker } from './TemplatePicker';
import { ImportLeadsDialog } from './ImportLeadsDialog';
import { StarredMessagesDialog } from './StarredMessagesDialog';
import { ChatGroupManager, AddToGroupDropdown, type ChatGroup } from './ChatGroupManager';
import { MessageComposer } from './MessageComposer';
import type { Channel } from '@/types/conversation';
import type { RichMessagePayload as ComposerRichPayload } from '@lad/frontend-features/conversations';
import { CreateBroadcastGroupModal } from './CreateBroadcastGroupModal';
import { ScheduleBroadcastModal } from './ScheduleBroadcastModal';
import { ScheduledBroadcastsModal } from './ScheduledBroadcastsModal';
import { BroadcastGroupActionsPanel } from './BroadcastGroupActionsPanel';
import { GroupInfoModal } from './GroupInfoModal';
import { MessageSettings } from './MessageSettings';
import { MrLadAvatar } from './MrLadAvatar';
import { useTheme } from '@/contexts/ThemeContext';

import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  X, Video, Phone, Ban, ThumbsDown, Trash2, User, Camera, Music, MapPin, BarChart2, Star as StarIcon,
  MoreHorizontal, Smile, Paperclip, Mic, Send, MessageSquare, MessageSquarePlus, CheckCheck,
  Search, PlusSquare, MoreVertical, ArrowLeft, Grip, UserPlus, Users, Plus, FileText, ChevronDown, ChevronLeft,
  Pencil, Image as ImageIcon, Star, Bell, Clock, Shield, Lock, Heart, List, MinusCircle, ChevronRight,
  Info, CheckSquare, BellOff, XCircle, Calendar, ListChecks, LogOut, RefreshCw, LayoutTemplate,
  // ── New icons for sort/filter toolbar ──
  ArrowDownUp, EyeOff, Eye, Hash, Tag, Filter,
  // ── New icons for rich New Chat overlay ──
  Megaphone, Loader2, CheckCircle2, Play, Pause, StopCircle,
} from 'lucide-react';
import { usePhoneMasking } from '@/hooks/usePhoneMasking';

// ── Shared type for context status chips ────────────────────────────────────
interface ContextStatusOption {
  value: string;
  label: string;
  count: number;
}

/** Convert snake_case context_status → readable label */
function formatContextStatus(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Solid colour per WABA conversation stage, shown as a small WhatsApp-style
 *  label tag on each conversation row (colour only - the stage name shows on
 *  hover and in the filter, not repeated as text on every row). Keyed by the
 *  lowercased context_status. */
const WABA_STAGE_TAG_HEX: Record<string, string> = {
  greeting: '#3b82f6', // blue
  info_gathering: '#8b5cf6', // violet
  booking_in_progress: '#f59e0b', // amber
  booking_completed: '#10b981', // emerald
  cancelled: '#f43f5e', // rose
  human: '#f97316', // orange
  // legacy values still present on older rows
  booked: '#10b981',
  qualified: '#8b5cf6',
  active: '#8b5cf6',
};
const WABA_STAGE_TAG_DEFAULT = '#9ca3af'; // gray

// ── Configuration Constants ──────────────────────────────────────────────────
const CONFIG = {
  MAX_ATTACHMENT_BYTES: 16 * 1024 * 1024, // 16MB
  INITIAL_MESSAGE_LIMIT: 50,
  LOAD_MORE_LIMIT: 100,
  MAX_OLDER_MESSAGES: 500,
  MAX_RECENT_EMOJIS: 20,
  EMOJI_STORAGE_KEY: 'wa_emoji_recent_v1', // gitleaks:allow - localStorage key for recent emojis, not a secret
  VOICE_RECORDING_TIMEOUT: 10000, // 10 seconds
  SEARCH_DEBOUNCE_MS: 150,
  SIDEBAR_MIN_WIDTH: 260,
  SIDEBAR_MAX_WIDTH: 600,
  SIDEBAR_DEFAULT_WIDTH: 380,
  TEMPLATE_BATCH_DELAY_MIN: 1,
  TEMPLATE_BATCH_DELAY_RANDOM: 2,
  TEMPLATE_DAILY_LIMIT: 250,
} as const;

// ── Error Types ───────────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class StorageError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'STORAGE_ERROR', originalError);
    this.name = 'StorageError';
  }
}

class NetworkError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type AgentType = 'human' | 'ai';

interface PendingFile {
  id: string;
  file: File;
  base64: string;
  previewUrl: string;
  mediaType: 'image' | 'video' | 'document' | 'audio';
}

interface RichMessagePayload {
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'poll';
  content?: string;
  fileBase64?: string;
  filename?: string;
  contentType?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  contactName?: string;
  contactPhone?: string;
  pollQuestion?: string;
  pollOptions?: string[];
}

interface LabelLike {
  id?: string | number;
  label_id?: string | number;
  [key: string]: unknown; // Allow additional properties for flexibility
}

interface SidebarErrorState {
  message: string;
}

type ConversationActionHandler = (id: string) => void | Promise<void>;

interface WABAChatWindowProps {
  conversation: Conversation | null;
  onSendMessage: (payload: RichMessagePayload) => void | Promise<void>;
  onTogglePanel?: () => void;
  isPanelOpen?: boolean;
  onBack?: () => void;
  onDeleteChat?: ConversationActionHandler;
  onBlockChat?: ConversationActionHandler;
  onFavoriteChat?: ConversationActionHandler;
  onMuteChat?: ConversationActionHandler;
  onClearChat?: ConversationActionHandler;
  onCloseChat?: ConversationActionHandler;
  onOpenImportLeads?: () => void;
  channel?: 'personal' | 'waba';
  conversationId?: string;
  owner?: string | null;
  backendChannel?: 'personal' | 'waba';
}

interface WABAContextPanelProps {
  conversation: Conversation | null;
  onClose: () => void;
  onFavoriteChat?: ConversationActionHandler;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function inferMediaType(file: File): PendingFile['mediaType'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function sanitizeInput(input: string): string {
  if (!input) return '';
  // Remove potentially dangerous HTML/JavaScript
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeMessageContent(content: string | undefined): string {
  if (!content) return '';
  // For message content, we need to be more permissive to allow basic formatting
  // but still prevent script injection and dangerous HTML
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}

function getConversationLeadId(conv: Conversation): string | undefined {
  const raw = conv as Conversation & { leadId?: string | number; lead_id?: string | number };
  return raw.leadId != null ? String(raw.leadId) : raw.lead_id != null ? String(raw.lead_id) : undefined;
}

function getConversationLastMessageTimestamp(conv: Conversation): string | Date | undefined {
  const raw = conv as Conversation & { lastMessage?: { timestamp?: string | Date } };
  return raw.lastMessage?.timestamp;
}

function getConversationContextStatus(conv: Conversation): string | undefined {
  const raw = conv as Conversation & { context_status?: string | null };
  return raw.context_status ?? conv.conversationState ?? undefined;
}

function getConversationLabelIds(conv: Conversation): string[] {
  const raw = conv as Conversation & { labels?: Array<string | LabelLike>; labelIds?: Array<string | number> };
  const labels = (raw.labels ?? []).map((label) => {
    if (typeof label === 'string') return label;
    if (label && typeof label === 'object' && 'id' in label && label.id != null) return String(label.id);
    if (label && typeof label === 'object' && 'label_id' in label && label.label_id != null) return String(label.label_id);
    return '';
  });
  const labelIds = (raw.labelIds ?? []).map(String);
  return [...labels, ...labelIds, ...(conv.tags ?? []).map(String)].filter(Boolean);
}

async function getApiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  return fallback;
}

function MessageTicks({ status }: { status?: string }) {
  const s = status || 'sent';

  if (s === 'read' || s === 'seen') {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block shrink-0">
        <path d="M1 5.5L4.5 9L8 5.5" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 5.5L8.5 9L15 2" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (s === 'delivered') {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block shrink-0">
        <path d="M1 5.5L4.5 9L8 5.5" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 5.5L8.5 9L15 2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 'sent' or 'pending' - single tick
  return (
    <svg width="12" height="11" viewBox="0 0 12 11" fill="none" className="inline-block shrink-0">
      <path d="M1 5.5L4.5 9L11 2" stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ATTACH_ITEMS = [
  { id: 'document', label: 'Document', icon: <FileText className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-100   dark:bg-blue-900/40' },
  { id: 'gallery', label: 'Photos & videos', icon: <ImageIcon className="w-5 h-5" />, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  { id: 'camera', label: 'Camera', icon: <Camera className="w-5 h-5" />, color: 'text-pink-500', bg: 'bg-pink-100   dark:bg-pink-900/40' },
  { id: 'audio', label: 'Audio', icon: <Music className="w-5 h-5" />, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  { id: 'contact', label: 'Contact', icon: <User className="w-5 h-5" />, color: 'text-teal-500', bg: 'bg-teal-100   dark:bg-teal-900/40' },
  { id: 'poll', label: 'Poll', icon: <BarChart2 className="w-5 h-5" />, color: 'text-slate-600 dark:text-blue-300', bg: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'event', label: 'Event', icon: <Calendar className="w-5 h-5" />, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  { id: 'sticker', label: 'New sticker', icon: <StarIcon className="w-5 h-5" />, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  { id: 'template', label: 'Send template', icon: <LayoutTemplate className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
];


// ── Sub-modals ─────────────────────────────────────────────────────────────────
function PollModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const addOption = () => options.length < 10 && setOptions([...options, '']);
  const updateOption = (i: number, v: string) => { const n = [...options]; n[i] = v; setOptions(n); };
  const removeOption = (i: number) => options.length > 2 && setOptions(options.filter((_, x) => x !== i));
  const handleSend = () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) return;
    onSend({ type: 'poll', pollQuestion: sanitizeInput(question.trim()), pollOptions: validOpts.map(sanitizeInput) });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0b1957] flex items-center justify-center"><BarChart2 className="w-4 h-4 text-white" /></div>
            <h3 className="font-semibold">Create Poll</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Question</label>
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question..."
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Options</label>
            <div className="mt-1 space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0b1957]/10 text-[#0b1957] text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                  <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                  {options.length > 2 && <button type="button" aria-label="Remove option" onClick={() => removeOption(i)}><X className="w-4 h-4 text-gray-300" /></button>}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button type="button" onClick={addOption} className="mt-2 text-xs text-[#0b1957] font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add option
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-2 justify-end">
          <button type="button" onClick={handleSend} disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            className="px-4 py-2 text-sm font-semibold bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] disabled:opacity-40">
            Send Poll
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const handleSend = () => {
    if (!name.trim() || !phone.trim()) return;
    onSend({ type: 'contact', contactName: sanitizeInput(name.trim()), contactPhone: sanitizeInput(phone.trim()) });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center"><Phone className="w-4 h-4 text-white" /></div>
            <h3 className="font-semibold">Share Contact</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[{ label: 'Full Name *', value: name, set: setName, ph: 'John Doe' }, { label: 'Phone *', value: phone, set: setPhone, ph: '+971501234567' }].map(f => (
            <div key={f.label}>
              <label className="text-xs font-medium text-gray-500">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t flex justify-end">
          <button type="button" onClick={handleSend} disabled={!name.trim() || !phone.trim()}
            className="px-4 py-2 text-sm font-semibold bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-40">
            Share Contact
          </button>
        </div>
      </div>
    </div>
  );
}

function EventModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const handleSend = () => {
    if (!title.trim() || !date) return;
    const text = `📅 *Event: ${sanitizeInput(title.trim())}*\n🗓️ ${sanitizeInput(date)}${time ? ' at ' + sanitizeInput(time) : ''}`;
    onSend({ type: 'text', content: sanitizeMessageContent(text) });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center"><Calendar className="w-4 h-4 text-white" /></div>
            <h3 className="font-semibold">Share Event</h3>
          </div>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Event Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Team Meeting"
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="event-date" className="text-xs font-medium text-gray-500">Date *</label>
              <input id="event-date" type="date" value={date} onChange={e => setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label htmlFor="event-time" className="text-xs font-medium text-gray-500">Time</label>
              <input id="event-time" type="time" value={time} onChange={e => setTime(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end">
          <button type="button" onClick={handleSend} disabled={!title.trim() || !date}
            className="px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40">
            Share Event
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manual, setManual] = useState('');
  const getLocation = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('done'); },
      () => setGpsStatus('error'),
      { timeout: CONFIG.VOICE_RECORDING_TIMEOUT }
    );
  };
  const handleSend = () => {
    if (coords) onSend({ type: 'location', latitude: coords.lat, longitude: coords.lng, locationName: 'My Location', locationAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` });
    else if (manual.trim()) onSend({ type: 'location', locationName: sanitizeInput(manual.trim()), locationAddress: sanitizeInput(manual.trim()), latitude: 0, longitude: 0 });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><MapPin className="w-4 h-4 text-white" /></div>
            <h3 className="font-semibold">Share Location</h3>
          </div>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <button type="button" onClick={getLocation} disabled={gpsStatus === 'loading'}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-green-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              {gpsStatus === 'loading' ? <Loader2 className="w-5 h-5 text-green-600 animate-spin" /> : <MapPin className="w-5 h-5 text-green-600" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">{gpsStatus === 'loading' ? 'Getting location…' : gpsStatus === 'done' ? '✓ Location found' : 'Send Current Location'}</p>
              {coords && <p className="text-xs text-gray-500">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
              {gpsStatus === 'error' && <p className="text-xs text-red-500">Location access denied</p>}
            </div>
          </button>
          <div>
            <label className="text-xs font-medium text-gray-500">Or enter address</label>
            <input value={manual} onChange={e => setManual(e.target.value)} placeholder="e.g. Dubai Mall, UAE"
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end">
          <button type="button" onClick={handleSend} disabled={!coords && !manual.trim()}
            className="px-4 py-2 text-sm font-semibold bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-40">
            Share Location
          </button>
        </div>
      </div>
    </div>
  );
}

const EMOJI_CATEGORIES = [
  {
  id: 'recent', label: 'Recently used', icon: '🕐',
  emojis: [], // populated dynamically - see EmojiPicker state
},
  {
    id: 'smileys', label: 'Smileys & People', icon: '😊',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
      '🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸',
      '😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
      '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
      '👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶',
      '👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🩸',
    ],
  },
  {
    id: 'animals', label: 'Animals & Nature', icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊',
      '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜',
      '🦟','🦗','🦂','🐢','🐍','🦎','🦕','🦖','🦏','🦛','🐘','🦒','🦘','🐃','🐂','🐄','🐎','🐖',
      '🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️',
      '🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴',
      '🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻',
      '🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','☁️','⛅',
    ],
  },
  {
    id: 'food', label: 'Food & Drink', icon: '🍔',
    emojis: [
      '🍏','🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🫒','🥑',
      '🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🫘','🌰','🍞','🥐','🥖','🫓',
      '🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔','🌮','🌯',
      '🫙','🥙','🧆','🥚','🍿','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥',
      '🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧',
      '🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸',
    ],
  },
  {
    id: 'activities', label: 'Activities', icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅',
      '⛳','🪁','🏹','🎣','🤿','🎽','🎿','🛷','🥌','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇','🧘','🏄','🏊',
      '🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🎨','🎬',
      '🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎰','🎮','🕹️',
    ],
  },
  {
    id: 'travel', label: 'Travel & Places', icon: '🚗',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺',
      '🚨','🚥','🚦','🛑','🚧','⛽','🚢','✈️','🛩️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚞',
      '🚝','🚄','🚅','🚈','🚂','🚃','🚋','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛰️','🚀','🛸','🌍','🌎',
      '🌏','🗺️','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🏘️','🏚️','🏠','🏡',
      '🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🕍',
    ],
  },
  {
    id: 'objects', label: 'Objects', icon: '💡',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','📷','📸','📹','🎥','📽️','🎞️','📞',
      '☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔',
      '🧯','🛢️','💸','💵','💴','💶','💷','💴','💰','💳','💎','⚖️','🧰','🔧','🔨','⚒️','🛠️','⛏️','🪛',
      '🔩','⚙️','🗜️','🔗','⛓️','🧲','🔫','💣','🪓','🔪','🗡️','🛡️','🚬','⚰️','⚱️','🏺','🔮','📿','🧿',
      '💈','⚗️','🔭','🔬','🩺','🩻','🩹','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🪤','🪣','🧴','🧷',
      '🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🧯','🛒','🚪','🪞','🪟','🛋️','🪑','🚽','🪠','🚿','🛁',
    ],
  },
  {
    id: 'symbols', label: 'Symbols', icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟',
      '☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏',
      '♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐',
      '㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯',
      '💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','🔇','🔈','🔉','🔊','📣','📢','👁️‍🗨️','💬','💭','🗯️',
      '♠️','♣️','♥️','♦️','🃏','🀄','🎴','🔀','🔁','🔂','▶️','⏩','⏭️','⏯️','◀️','⏪','⏮️','🔼','⏫',
      '🔽','⏬','⏸️','⏹️','⏺️','🎦','🔅','🔆','📶','📳','📴','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️',
    ],
  },
];


function EmojiPicker({ onSelect, onClose }: { onSelect: (s: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Dynamic recent emojis ──────────────────────────────────────────────
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(CONFIG.EMOJI_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch (err) {
      console.error('Failed to load recent emojis from localStorage:', err);
      return [];
    }
  });

  const trackEmoji = useCallback((emoji: string) => {
    setRecentEmojis(prev => {
      const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, CONFIG.MAX_RECENT_EMOJIS);
      try {
        localStorage.setItem(CONFIG.EMOJI_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save recent emojis to localStorage:', err);
        // Silently fail - recent emojis are non-critical
      }
      return next;
    });
  }, []);

  // Patch the static 'recent' category with live data
  const liveCategories = useMemo(
    () => EMOJI_CATEGORIES.map(cat =>
      cat.id === 'recent' ? { ...cat, emojis: recentEmojis } : cat
    ),
    [recentEmojis]
  );

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return EMOJI_CATEGORIES.flatMap(cat => cat.emojis).filter((_, i) => i < 200);
  }, [searchQuery]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    for (const cat of liveCategories) {
      const el = categoryRefs.current[cat.id];
      if (el && el.offsetTop <= scrollTop + 40) {
        setActiveCategory(cat.id);
      }
    }
  }, []);

  const scrollToCategory = (catId: string) => {
    const el = categoryRefs.current[catId];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
    }
    setActiveCategory(catId);
  };

  return (
    <div
      data-sticker-picker
      className="absolute bottom-full left-0 mb-2 z-[10000] bg-white dark:bg-[#233138] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ width: 340, height: 350 }}
    >
      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#8696a0]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search emoji"
            className="w-full pl-8 pr-3 py-1.5 bg-[#f0f2f5] dark:bg-[#2a3942] rounded-full text-[13px] text-foreground dark:text-[#e9edef] placeholder:text-gray-400 dark:placeholder:text-[#8696a0] focus:outline-none border-0"
          />
        </div>
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-0 px-2 pb-1 border-b border-gray-100 dark:border-[#2a3942] shrink-0 overflow-x-auto no-scrollbar">
          {liveCategories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => scrollToCategory(cat.id)}
              className={cn(
                'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors relative',
                activeCategory === cat.id
                  ? 'text-[#00a884]'
                  : 'text-gray-500 dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-[#2a3942]'
              )}
              title={cat.label}
            >
              {cat.icon}
              {activeCategory === cat.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#00a884] rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {searchQuery ? (
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_CATEGORIES.flatMap(c => c.emojis)
              .filter((e, i, arr) => arr.indexOf(e) === i)
              .slice(0, 120)
              .map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); trackEmoji(emoji); onSelect(emoji); }}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
          </div>
       ) : (
          liveCategories.map(cat => (
            <div key={cat.id} ref={el => { categoryRefs.current[cat.id] = el; }}>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-[#8696a0] uppercase tracking-wide px-1 pt-2 pb-1 sticky top-0 bg-white dark:bg-[#233138]">
                {cat.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji, idx) => (
                  <button
                    key={`${cat.id}-${idx}`}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); trackEmoji(emoji); onSelect(emoji); }}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* WABAContextPanel                                                          */
/* ========================================================================= */

function WABAContextPanel({ conversation, onClose, onFavoriteChat }: WABAContextPanelProps) {
  if (!conversation) return null;
  const isPanelFav = Boolean(
    (conversation as any)?.is_favorite ||
    (conversation as any)?.isFavorite ||
    (conversation as any)?.favorite
  );

  const mockImages = [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
  ];

  return (
    <div className="h-full flex flex-col bg-background dark:bg-[#161717] overflow-y-auto border-l border-border dark:border-[#222d34]/80">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background dark:bg-[#161717] sticky top-0 z-10 border-b border-border dark:border-[#222d34]">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to chat"
            className="xl:hidden inline-flex items-center justify-center w-8 h-8 -ml-1 rounded-md text-muted-foreground dark:text-white hover:text-foreground hover:bg-muted/50 dark:hover:bg-[#202c33]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact info"
            className="hidden xl:inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground dark:text-white hover:text-foreground hover:bg-muted/50 dark:hover:bg-[#202c33]"
          >
            <X className="w-5 h-5" />
          </button>
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
          <span className="text-[16px] text-muted-foreground dark:text-[#a2a2a2] mb-6">+91 9998887770</span>

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
          <button
            type="button"
            onClick={() => onFavoriteChat?.(conversation?.id)}
            className="w-full flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-[#202c33] transition-colors text-left"
          >
            <Heart className={cn("w-5 h-5 mr-6", isPanelFav ? "fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400" : "text-muted-foreground dark:text-white")} />
            <span className="text-[16px] text-foreground dark:text-white flex-1">
              {isPanelFav ? 'Remove from favourites' : 'Add to favourites'}
            </span>
          </button>
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

function dedupeById(msgs: Message[]): Message[] {
  const seen = new Map<string, Message>();
  for (const m of msgs) seen.set(m.id, m);
  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}


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
  onOpenImportLeads,
  channel,
  conversationId,
  owner,
  backendChannel,
}: WABAChatWindowProps) {
  const [text, setText] = useState('');
  const { isDark } = useTheme();
  const [agentType, setAgentType] = useState<AgentType>(owner === 'human_agent' ? 'human' : 'ai');
  const [showTakeoverDialog, setShowTakeoverDialog] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // ── "Add to Group" (broadcast groups) ───────────────────────────────────
  const [addGroups, setAddGroups] = useState<{ id: string; name: string; conversation_count?: number }[]>([]);
  const [addGroupsLoading, setAddGroupsLoading] = useState(false);
  const [addGroupsLoaded, setAddGroupsLoaded] = useState(false);
  const [addingGroupId, setAddingGroupId] = useState<string | null>(null);
  const [groupActionNote, setGroupActionNote] = useState<{ ok: boolean; text: string } | null>(null);

  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
const [isVoiceLocked, setIsVoiceLocked] = useState(false);
const [voiceElapsed, setVoiceElapsed] = useState(0);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const audioStreamRef = useRef<MediaStream | null>(null);
const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const voiceStartPointerRef = useRef({ x: 0, y: 0 });
const voiceAnimFrameRef = useRef<number | null>(null);
const voiceAnalyserRef = useRef<AnalyserNode | null>(null);
const waveCanvasRef = useRef<HTMLCanvasElement>(null);
const micBtnRef = useRef<HTMLButtonElement>(null);
const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
const [isVoicePlaying, setIsVoicePlaying] = useState(false);
const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
const [voicePlayProgress, setVoicePlayProgress] = useState(0);

  const loadAddGroups = useCallback(async () => {
    if (addGroupsLoaded || addGroupsLoading) return;
    setAddGroupsLoading(true);
    try {
      const res = await fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${backendChannel || 'waba'}`);
      const data = await res.json();
      // "Add to Group" targets broadcast groups: the manually-created chat groups
      // (collections of contacts) AND the saved broadcast sets (is_broadcast_list).
      // Only native WhatsApp groups (wa_group_jid) are excluded - you can't add
      // members to a synced WA group from here.
      const rows = (Array.isArray(data?.data) ? data.data : []).filter(
        (g: { metadata?: { wa_group_jid?: string } | null }) =>
          !(g?.metadata as { wa_group_jid?: string } | null | undefined)?.wa_group_jid,
      );
      setAddGroups(
        rows.map((g: { id: string | number; name: string; conversation_count?: number; metadata?: { member_group_ids?: unknown[] } | null }) => ({
          id: String(g.id),
          name: g.name,
          conversation_count: Array.isArray(g.metadata?.member_group_ids)
            ? g.metadata!.member_group_ids!.length
            : g.conversation_count,
        })),
      );
      setAddGroupsLoaded(true);
    } catch {
      setGroupActionNote({ ok: false, text: 'Could not load groups' });
    } finally {
      setAddGroupsLoading(false);
    }
  }, [addGroupsLoaded, addGroupsLoading, backendChannel]);

  const handleAddToGroup = useCallback(async (groupId: string, groupName: string) => {
    if (!conversationId || addingGroupId) return;
    setAddingGroupId(groupId);
    setGroupActionNote(null);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/${groupId}/conversations?channel=${backendChannel || 'waba'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_ids: [conversationId] }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGroupActionNote({ ok: true, text: `Added to “${groupName}”` });
    } catch {
      setGroupActionNote({ ok: false, text: `Couldn't add to “${groupName}”` });
    } finally {
      setAddingGroupId(null);
    }
  }, [conversationId, addingGroupId, backendChannel]);
  const [showEvent, setShowEvent] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templateSending, setTemplateSending] = useState(false);
  const [templateSendProgress, setTemplateSendProgress] = useState<{ sent: number; total: number; running: boolean } | null>(null);
  const [templateSendResult, setTemplateSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [ownershipUpdating, setOwnershipUpdating] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingFilesRef = useRef<PendingFile[]>([]);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const attachBtnRef = useRef<HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(new Set());
  // Optimistic per-message starred overrides (messageId → starred), merged into allMessages.
  const [starOverrides, setStarOverrides] = useState<Record<string, boolean>>({});
  const [deletedForEveryoneIds, setDeletedForEveryoneIds] = useState<Set<string>>(new Set());

   const { messages: polledMessages, isLoading, total, isAgentTyping } = useConversationMessages(
    conversation?.id || null,
    { limit: CONFIG.INITIAL_MESSAGE_LIMIT },
    channel || 'waba'
  );

  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderOffset, setOlderOffset] = useState<number>(CONFIG.INITIAL_MESSAGE_LIMIT);

  const prevConvId = useRef<string | null>(null);

  // Cleanup effect for voice recording resources
  useEffect(() => {
    return () => {
      // Clean up voice recording resources on unmount
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      if (voiceAnimFrameRef.current) {
        cancelAnimationFrame(voiceAnimFrameRef.current);
        voiceAnimFrameRef.current = null;
      }
      if (voiceAnalyserRef.current) {
        voiceAnalyserRef.current.disconnect();
        voiceAnalyserRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
    };
  }, [voicePreviewUrl]);

  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      // Clean up pending file URLs on unmount
      pendingFilesRef.current.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
      pendingFilesRef.current = [];
    };
  }, []);

  // Cleanup effect for conversation change
  useEffect(() => {
    if (conversation?.id && conversation.id !== prevConvId.current) {
      prevConvId.current = conversation.id;
      // Clean up pending files when conversation changes
      setPendingFiles((prev) => {
        prev.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
        return [];
      });
      setText('');
      setSendError(null);
      setOwnershipError(null);
      setOlderMessages([]);
      setOlderOffset(CONFIG.INITIAL_MESSAGE_LIMIT);
      setDeletedForMeIds(new Set());
      setDeletedForEveryoneIds(new Set());
    }
  }, [conversation?.id]);

  // Sync owner → agentType
  useEffect(() => {
    setAgentType(owner === 'human_agent' ? 'human' : 'ai');
  }, [owner, conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`; }
  }, [text]);

  // Close attach menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return;
    const h = (e: MouseEvent) => {
      if (attachBtnRef.current && !attachBtnRef.current.contains(e.target as Node))
        setShowAttachMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAttachMenu]);

  useEffect(() => {
    if (conversation?.id && conversation.id !== prevConvId.current) {
      prevConvId.current = conversation.id;
      setPendingFiles((prev) => {
        prev.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
        return [];
      });
      setText('');
      setSendError(null);
      setOwnershipError(null);
      setOlderMessages([]);
      setOlderOffset(CONFIG.INITIAL_MESSAGE_LIMIT);
      setDeletedForMeIds(new Set());
      setDeletedForEveryoneIds(new Set());
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (!showStickers) return;
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sticker-picker]') && !target.closest('[data-sticker-btn]'))
        setShowStickers(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStickers]);

  const normalizeStatus = (s: string | undefined): string => {
    if (!s) return 'sent';
    if (s === 'read' || s === 'seen') return 'read';
    if (s === 'delivered' || s === 'delivered_to_device') return 'delivered';
    if (s === 'failed' || s === 'error') return 'failed';
    if (s === 'received') return 'sent'; // incoming messages treated as sent on display
    return 'sent';
  };

  const effectivePolledMessages = polledMessages;

  const normalizedPolledMessages = effectivePolledMessages.map((m: Message) => ({
    ...m,
    status: normalizeStatus(
      (m as Message & { message_status?: string }).status ||
      (m as Message & { message_status?: string }).message_status
    ) as Message['status'],
  }));

  const baseMessages = dedupeById([...olderMessages, ...normalizedPolledMessages]);
  const allMessages = useMemo(
    () =>
      baseMessages
        .filter((m) => !deletedForMeIds.has(m.id))
        .map((m) => {
          // Apply optimistic star override so the indicator flips immediately.
          const starred = m.id in starOverrides ? starOverrides[m.id] : m.starred;
          const base = starred === m.starred ? m : ({ ...m, starred } as Message);
          if (!deletedForEveryoneIds.has(m.id)) return base;
          return {
            ...base,
            content: base.isOutgoing ? 'You deleted this message' : 'This message was deleted',
            mediaId: undefined,
            mediaType: undefined,
            mediaMimeType: undefined,
            mediaFilename: undefined,
            mediaCaption: undefined,
            templateName: undefined,
            latitude: undefined,
            longitude: undefined,
            locationName: undefined,
            locationAddress: undefined,
          } as Message;
        }),
    [baseMessages, deletedForMeIds, deletedForEveryoneIds, starOverrides]
  );
  const hasMore = total > olderOffset;

  const matchingMessageIds = useMemo(() => {
    if (!searchText.trim()) return [];
    return allMessages
      .filter((m) => m.content?.toLowerCase().includes(searchText.toLowerCase()))
      .map((m) => m.id);
  }, [allMessages, searchText]);

  const totalMatches = matchingMessageIds.length;

  const handleSearchNext = () => setSearchMatchIndex((prev) => (prev + 1) % totalMatches);
  const handleSearchPrev = () => setSearchMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);

  const handleLoadMore = useCallback(async () => {
    if (loadingOlder || !conversation?.id || !hasMore) return;
    setLoadingOlder(true);
    try {
      const url =
        `/api/whatsapp-conversations/conversations/${conversation.id}/messages` +
        `?limit=${CONFIG.LOAD_MORE_LIMIT}&offset=${olderOffset}&channel=${channel || 'waba'}`;
      const res = await fetchWithTenant(url);
      if (!res.ok) return;
      const data = await res.json();
      const raw = (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.messages) ? data.messages : [])) as Array<Record<string, unknown>>;

      const mapped: Message[] = raw.map((r) => {
        const rawRole = r.role || 'user';
        const rawType = String(r.type || '').toLowerCase();
        const inferredMediaTypeFromRawType =
          rawType === 'image' || rawType === 'video' || rawType === 'audio' || rawType === 'document'
            ? rawType
            : undefined;
        const meta =
          typeof r.metadata === 'string'
            ? (() => { try { return JSON.parse(r.metadata); } catch { return {}; } })()
            : r.metadata || {};
        const role =
          meta.sender_type === 'human_agent' && rawRole === 'assistant' ? 'human_agent' : rawRole;
        const isOutgoing = role === 'assistant' || role === 'AI' || role === 'human_agent';
        // Agent-forward: NEW forwards carry the customer name in metadata (clean body);
        // OLD ones baked "📩 *New message from X*\n\nBody" into content - parse as fallback.
        let displayContent = (r.content as string) || '';
        let forwardSender: string | undefined =
          (meta.via === 'agent_forward' || meta.sender_type === 'forward')
            ? (meta.sender_name || undefined)
            : undefined;
        if (!forwardSender) {
          const fwd = displayContent.match(/^[^\n]*\*New message from ([^*\n]+)\*\s*\n+([\s\S]+)$/);
          if (fwd) { forwardSender = fwd[1].trim(); displayContent = fwd[2].trim(); }
        }
        return {
          id: r.id,
          conversationId: r.conversation_id,
          content: displayContent,
          timestamp: r.created_at ? new Date(r.created_at as string | Date) : new Date(),
          isOutgoing,
          status: (() => {
            const s = r.message_status || r.status || '';
            if (s === 'read' || s === 'seen') return 'read';
            if (s === 'delivered' || s === 'delivered_to_device') return 'delivered';
            if (s === 'failed' || s === 'error') return 'failed';
            return 'sent'; // covers 'sent', 'pending', '' etc.
          })(),
          sender: {
            id: isOutgoing ? meta.human_agent_id || 'agent' : r.lead_id || 'user',
            name: isOutgoing
              ? (role === 'human_agent' ? meta.sender_name || 'Agent' : 'AI Agent')
              : (meta.is_group ? (meta.sender_name || meta.sender_phone || 'Member') : 'Contact'),
          },
          role,
          // Sender label above a bubble: human-agent name, group participant, or the
          // customer an agent-forward is from. 1:1 chats stay undefined.
          senderName: role === 'human_agent'
            ? (meta.sender_name || undefined)
            : (forwardSender || (meta.is_group && !isOutgoing ? (meta.sender_name || meta.sender_phone || undefined) : undefined)),
          humanAgentId: meta.human_agent_id || undefined,
          templateName: meta.template_name || r.template_name || undefined,
          latitude: meta.latitude !== undefined
            ? Number(meta.latitude)
            : (r.latitude !== undefined ? Number(r.latitude) : undefined),
          longitude: meta.longitude !== undefined
            ? Number(meta.longitude)
            : (r.longitude !== undefined ? Number(r.longitude) : undefined),
          locationName: meta.location_name || r.location_name || undefined,
          locationAddress: meta.location_address || r.location_address || undefined,
          mediaId: meta.media_id || r.media_id || r.mediaId || r.file_url || r.url || undefined,
          mediaType: meta.message_type || meta.media_type || r.message_type || r.media_type || r.mediaType || inferredMediaTypeFromRawType || undefined,
          mediaMimeType: meta.mime_type || r.mime_type || r.content_type || r.media_mime_type || undefined,
          mediaFilename: meta.filename || r.filename || r.media_filename || undefined,
          mediaCaption: meta.caption || r.caption || undefined,
        } as Message;
      });

      setOlderMessages((prev) => dedupeById([...mapped, ...prev]).slice(-CONFIG.MAX_OLDER_MESSAGES));
      const nextOffsetIncrement = raw.length > 0 ? raw.length : CONFIG.LOAD_MORE_LIMIT;
      setOlderOffset((prev) => prev + nextOffsetIncrement);
    } catch (err: unknown) {
      setSendError(getErrorMessage(err, 'Failed to load older messages'));
    } finally {
      setLoadingOlder(false);
    }
  }, [conversation?.id, loadingOlder, hasMore, olderOffset]);

  // ── Ownership ──────────────────────────────────────────────────────────────
  const updateOwnership = useCallback(async (newOwner: 'AI' | 'human_agent') => {
    const convId = conversationId || conversation?.id;
    if (!convId) return;
    const res = await fetchWithTenant(`/api/whatsapp-conversations/conversations/${convId}/ownership?channel=${backendChannel || 'waba'}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner: newOwner }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to update ownership (${res.status})`);
    }
  }, [conversationId, conversation?.id]);

  const handleAgentTypeChange = useCallback(async (type: AgentType) => {
    if (ownershipUpdating || type === agentType) return;
    setOwnershipError(null);
    if (type === 'human' && agentType === 'ai') setShowTakeoverDialog(true);
    else if (type === 'ai' && agentType === 'human') {
      setOwnershipUpdating(true);
      try {
        await updateOwnership('AI');
        setAgentType('ai');
      } catch (err: unknown) {
        setOwnershipError(getErrorMessage(err, 'Failed to return control to AI'));
      } finally {
        setOwnershipUpdating(false);
      }
    }
  }, [agentType, ownershipUpdating, updateOwnership]);

  const confirmTakeover = useCallback(async () => {
    if (ownershipUpdating) return;
    setOwnershipUpdating(true);
    setOwnershipError(null);
    try {
      await updateOwnership('human_agent');
      setAgentType('human');
      setShowTakeoverDialog(false);
    } catch (err: unknown) {
      setOwnershipError(getErrorMessage(err, 'Failed to take over from AI'));
    } finally {
      setOwnershipUpdating(false);
    }
  }, [ownershipUpdating, updateOwnership]);

  // ── File handling ──────────────────────────────────────────────────────────
  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileLoading(true);
    const additions: PendingFile[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > CONFIG.MAX_ATTACHMENT_BYTES) {
          throw new Error(`${file.name} is larger than ${CONFIG.MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB`);
        }
        const base64 = await readFileAsBase64(file);
        additions.push({
          id: `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file, base64,
          previewUrl: URL.createObjectURL(file),
          mediaType: inferMediaType(file),
        });
      }
      setPendingFiles(prev => [...prev, ...additions]);
      setSendError(null);
    } catch (err: unknown) {
      additions.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
      const error = err instanceof Error ? new ValidationError('Failed to read attachment', err) : new ValidationError('Failed to read attachment');
      setSendError(error.message);
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (isSending) return;
    setSendError(null);
    if (pendingFiles.length > 0) {
      setIsSending(true);
      const sentIds = new Set<string>();
      try {
        for (const pf of pendingFiles) {
          await Promise.resolve(onSendMessage({
            type: pf.mediaType,
            fileBase64: pf.base64,
            filename: pf.file.name,
            contentType: pf.file.type,
            caption: text.trim() || undefined,
          }));
          sentIds.add(pf.id);
          URL.revokeObjectURL(pf.previewUrl);
        }
        setPendingFiles([]);
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      } catch (err: unknown) {
        if (sentIds.size > 0) {
          setPendingFiles((prev) => prev.filter((pf) => !sentIds.has(pf.id)));
        }
        const error = err instanceof Error ? new NetworkError('Failed to send attachment', err) : new NetworkError('Failed to send attachment');
        setSendError(error.message);
      } finally {
        setIsSending(false);
      }
      return;
    }
    if (!text.trim()) return;
    setIsSending(true);
    try {
      await Promise.resolve(onSendMessage({ type: 'text', content: sanitizeMessageContent(text.trim()) }));
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err: unknown) {
      const error = err instanceof Error ? new NetworkError('Failed to send message', err) : new NetworkError('Failed to send message');
      setSendError(error.message);
    } finally {
      setIsSending(false);
    }
  }, [isSending, pendingFiles, text, onSendMessage]);

  const handleRichSend = useCallback(async (payload: RichMessagePayload) => {
    setSendError(null);
    setIsSending(true);
    try {
      await Promise.resolve(onSendMessage(payload));
    } catch (err: unknown) {
      const error = err instanceof Error ? new NetworkError('Failed to send message', err) : new NetworkError('Failed to send message');
      setSendError(error.message);
      return;
    } finally {
      setIsSending(false);
    }
    setShowPoll(false); setShowContact(false); setShowEvent(false); setShowLocation(false);
  }, [onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
    // Shift+Enter: do nothing - browser inserts \n naturally
  }, [handleSend]);

  const handleAttachItem = useCallback((id: string) => {
    setShowAttachMenu(false);
    switch (id) {
      case 'gallery': galleryRef.current?.click(); break;
      case 'camera': cameraRef.current?.click(); break;
      case 'document': documentRef.current?.click(); break;
      case 'audio': audioRef.current?.click(); break;
      case 'location': setShowLocation(true); break;
      case 'contact': setShowContact(true); break;
      case 'poll': setShowPoll(true); break;
      case 'sticker': setShowStickers(true); break;
      case 'event': setShowEvent(true); break;
      case 'template':  setIsTemplatePickerOpen(true); break;
    }
  }, []);

  const handleDeleteMessage = useCallback(
    async (message: Message, scope: 'me' | 'everyone') => {
      if (scope === 'me') {
        setDeletedForMeIds((prev) => new Set(prev).add(message.id));
        return;
      }

      const convId = conversationId || conversation?.id;
      if (!convId) return;

      setDeletedForEveryoneIds((prev) => new Set(prev).add(message.id));
      try {
        const selectedChannel = backendChannel || channel || 'waba';
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/${convId}/messages/${message.id}?channel=${selectedChannel}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delete_for_everyone: true }),
          }
        );
        if (!res.ok) throw new Error('Delete failed');
      } catch {
        setDeletedForEveryoneIds((prev) => {
          const next = new Set(prev);
          next.delete(message.id);
          return next;
        });
        setSendError('Could not delete for everyone');
      }
    },
    [backendChannel, channel, conversationId, conversation?.id]
  );

  // ── Star / unstar a message (personal WhatsApp only) ────────────────────────
  const handleToggleStar = useCallback(
    async (message: Message) => {
      const convId = conversationId || conversation?.id;
      if (!convId) return;
      const current = message.id in starOverrides ? starOverrides[message.id] : message.starred;
      const next = !current;
      setStarOverrides((prev) => ({ ...prev, [message.id]: next }));
      try {
        const selectedChannel = backendChannel || channel || 'waba';
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/${convId}/messages/${message.id}/star?channel=${selectedChannel}`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
        );
        if (!res.ok) throw new Error('Star failed');
      } catch {
        setStarOverrides((prev) => ({ ...prev, [message.id]: !next }));
        setSendError('Could not update star');
      }
    },
    [backendChannel, channel, conversationId, conversation?.id, starOverrides]
  );

  // ── Template send ──────────────────────────────────────────────────────────
  const handleTemplateSend = useCallback(async (
    templateName: string, languageCode: string, parameters: string[],
    _nameFormat: 'first' | 'full', _batch: { batchSize?: number; delayMin?: number; delayRandom?: number; dailyLimit?: number },
    headerParamCount: number, headerType: string, headerUrl: string,
    // The number the template lives on. A template exists on one WABA, so the
    // send has to leave from that number or Meta cannot find it.
    accountId: string,
  ) => {
    const convId = conversationId || conversation?.id;
    if (!convId) {
      // Never fail silently - otherwise the picker can appear to "succeed"
      // while no request is ever sent.
      setTemplateSendResult({ success: false, message: 'Cannot send: this conversation has no ID. Reopen the chat and try again.' });
      return;
    }
    setTemplateSending(true);
    setTemplateSendResult(null);
    setTemplateSendProgress({ sent: 0, total: 1, running: true });
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/conversations/bulk?channel=${backendChannel || channel || 'waba'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send-template',
            conversation_ids: [convId],
            template_name: templateName,
            language_code: languageCode,
            parameters: parameters || [],
            header_param_count: headerParamCount ?? 0,
            header_type: headerType || '',
            header_url: headerUrl || '',
            account_id: accountId || '',
          }),
        }
      );
      const data = await res.json();
      const sent = Number(data.sent) || 0;
      const failed = Number(data.failed) || 0;
      setTemplateSendProgress({ sent, total: 1, running: false });
      // Gate success on ACTUAL delivery. A 2xx with sent:0 means WhatsApp/Meta
      // rejected the send (e.g. template not yet approved, or a parameter
      // mismatch) - surface the real reason instead of a misleading "✓ sent".
      if (!res.ok || !data.success || sent < 1) {
        throw new Error(
          data.results?.[0]?.error || data.error ||
          (failed > 0
            ? 'WhatsApp rejected the template (often: not yet approved, or a parameter mismatch).'
            : 'Template was not sent.')
        );
      }
      setTemplateSendResult({ success: true, message: `Template "${templateName}" sent` });
      setTimeout(() => setIsTemplatePickerOpen(false), 500);
      setTimeout(() => setTemplateSendResult(null), 4000);
    } catch (err: unknown) {
      setTemplateSendResult({ success: false, message: getErrorMessage(err, 'Failed to send template') });
      setTemplateSendProgress(null);
    } finally {
      setTemplateSending(false);
    }
  }, [conversationId, conversation?.id, backendChannel, channel]);

  const fmtDur = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const stopVoiceTracks = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
  }, []);

  const stopVoiceRecording = useCallback(() => {
    setIsVoiceRecording(false);
    setIsVoiceLocked(false);
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voiceAnimFrameRef.current) {
      cancelAnimationFrame(voiceAnimFrameRef.current);
      voiceAnimFrameRef.current = null;
    }
    if (voiceAnalyserRef.current) {
      voiceAnalyserRef.current.disconnect();
      voiceAnalyserRef.current = null;
    }
  }, []);

  const drawWaveform = useCallback(() => {
    const analyser = voiceAnalyserRef.current;
    const canvas = waveCanvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      voiceAnimFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(buf);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2; ctx.strokeStyle = '#25d366'; ctx.beginPath();
      const sw = W / buf.length; let x = 0;
      buf.forEach((v, i) => {
        const y = (v / 128) * H / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sw;
      });
      ctx.lineTo(W, H / 2); ctx.stroke();
    };
    draw();
  }, []);

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256;
      src.connect(analyser);
      voiceAnalyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecorderRef.current = mr;

      setIsVoiceRecording(true);
      setIsVoiceLocked(false);
      setVoiceElapsed(0);
      voiceTimerRef.current = setInterval(() => setVoiceElapsed(s => s + 1), 1000);
      drawWaveform();
    } catch {
      setSendError('Microphone permission denied');
    }
  }, [drawWaveform]);

  const cancelVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current!.onstop = null;
      mediaRecorderRef.current!.stop();
    }
    stopVoiceTracks();
    stopVoiceRecording();
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current.src = '';
    }
    setVoicePreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setVoicePreviewBlob(null);
    setIsVoicePlaying(false);
    setVoicePlayProgress(0);
  }, [stopVoiceTracks, stopVoiceRecording]);

  const stopAndPreviewRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setVoicePreviewBlob(blob);
        setVoicePreviewUrl(url);
      };
      mr.stop();
    }
    stopVoiceTracks();
    stopVoiceRecording();
  }, [stopVoiceTracks, stopVoiceRecording]);

  const sendVoiceRecording = useCallback(async () => {
    const blob = voicePreviewBlob;
    if (!blob) return;
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current.src = '';
    }
    setIsSending(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Failed to read audio'));
        reader.readAsDataURL(blob);
      });
      await Promise.resolve(onSendMessage({ type: 'audio', fileBase64: base64, filename: `voice_${Date.now()}.webm`, contentType: 'audio/webm' }));
      setVoicePreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setVoicePreviewBlob(null);
      setIsVoicePlaying(false);
      setVoicePlayProgress(0);
    } catch (err: unknown) {
      const error = err instanceof Error ? new NetworkError('Failed to send voice message', err) : new NetworkError('Failed to send voice message');
      setSendError(error.message);
    } finally {
      setIsSending(false);
    }
  }, [voicePreviewBlob, onSendMessage]);

  const toggleVoicePlayback = useCallback(() => {
    const audio = voicePreviewAudioRef.current;
    if (!audio) return;
    if (isVoicePlaying) {
      audio.pause();
      setIsVoicePlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsVoicePlaying(true);
    }
  }, [isVoicePlaying]);

  const isFav = Boolean(
    (conversation as ExtendedConversation)?.is_favorite ||
    (conversation as ExtendedConversation)?.isFavorite ||
    (conversation as ExtendedConversation)?.favorite
  );

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#161717]">
        <div className="flex gap-6 mt-8">
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-[62px] h-12 bg-black/4 dark:bg-[#35373b] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#d8dadf] dark:hover:bg-[#323436] transition-colors">
              <FileText className="w-6 h-6 text-[#111b21] dark:text-[#e9edef]" />
            </div>
            <span className="text-[13px] font-medium text-[#111b21] dark:text-[#e9edef]">Send Template</span>
          </div>
          <button
            type="button"
            onClick={onOpenImportLeads}
            className="flex flex-col items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer group focus:outline-none"
          >
            <div className="w-[62px] h-12 bg-black/4 dark:bg-[#35373b] rounded-full flex items-center justify-center group-hover:bg-[#d8dadf] dark:group-hover:bg-[#323436] transition-colors">
              <UserPlus className="w-6 h-6 text-[#111b21] dark:text-[#e9edef]" />
            </div>
            <span className="text-[13px] font-medium text-[#111b21] dark:text-[#e9edef]">Import Leads</span>
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#161717] relative">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-repeat opacity-[0.4] dark:opacity-[0.06]"
        style={{ backgroundImage: 'url("/assets/wa-dark-bg.png")' }}
      />
      {/* Header */}
      <div className="h-[60px] px-4 flex items-center justify-between bg-white dark:bg-[#161717] shrink-0 z-10 relative">
        {isSearchOpen ? (
          <div className="flex items-center gap-3 w-full">
            <button type="button" onClick={() => { setIsSearchOpen(false); setSearchText(''); setSearchMatchIndex(0); }}>
              <X className="w-5 h-5 text-muted-foreground dark:text-white" />
            </button>
            <input
              autoFocus
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setSearchMatchIndex(0); }}
              placeholder="Search messages..."
              className="flex-1 bg-transparent border-b border-[#00a884] text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-[#8696a0] text-[15px] focus:outline-none pb-1"
            />
            {searchText && (
              <div className="flex items-center gap-2 text-muted-foreground dark:text-[#8696a0] text-[13px] shrink-0">
                <span>{totalMatches === 0 ? '0/0' : `${searchMatchIndex + 1}/${totalMatches}`}</span>
                <button type="button" aria-label="Previous match" onClick={handleSearchPrev} disabled={totalMatches === 0} className="hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
                <button type="button" aria-label="Next match" onClick={handleSearchNext} disabled={totalMatches === 0} className="hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {/* Back button - visible only on mobile, matches LinkedIn style exactly */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 -ml-1 text-muted-foreground dark:text-white"
                onClick={onBack}
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={onTogglePanel}>
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={conversation.contact?.avatar} />
                  <AvatarFallback 
                    style={{
                      '--av-bg-light': `color-mix(in srgb, ${getAvatarColor(conversation.contact?.phone || conversation.contact?.name || conversation.id)} 20%, white)`,
                      '--av-text-light': `color-mix(in srgb, ${getAvatarColor(conversation.contact?.phone || conversation.contact?.name || conversation.id)} 70%, black)`,
                      '--av-bg-dark': `color-mix(in srgb, ${getAvatarColor(conversation.contact?.phone || conversation.contact?.name || conversation.id)} 30%, black)`,
                      '--av-text-dark': `color-mix(in srgb, ${getAvatarColor(conversation.contact?.phone || conversation.contact?.name || conversation.id)} 80%, white)`,
                    } as React.CSSProperties}
                    className="bg-[var(--av-bg-light)] text-[var(--av-text-light)] dark:bg-[var(--av-bg-dark)] dark:text-[var(--av-text-dark)]"
                  >
                    {conversation.contact?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-[16px] text-foreground dark:text-white">{conversation.contact?.name}</h3>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 text-muted-foreground dark:text-white">
              <Search className="w-5 h-5 cursor-pointer hover:text-foreground transition-colors" onClick={() => setIsSearchOpen(true)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MoreVertical className="w-5 h-5 cursor-pointer hover:text-foreground transition-colors" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#161717] border border-border dark:border-0 shadow-lg text-foreground dark:text-[#d1d7db] py-2 [&_[role=menuitem]]:hover:bg-zinc-100 dark:[&_[role=menuitem]]:hover:bg-zinc-800 [&_[role=menuitem]]:focus:bg-zinc-100 dark:[&_[role=menuitem]]:focus:bg-zinc-800 [&_[role=menuitem]]:hover:text-foreground dark:[&_[role=menuitem]]:hover:text-[#d1d7db] [&_[role=menuitem]]:focus:text-foreground dark:[&_[role=menuitem]]:focus:text-[#d1d7db] [&_[role=menuitem][data-state=open]]:bg-zinc-100 dark:[&_[role=menuitem][data-state=open]]:bg-zinc-800 [&_[role=menuitem][data-state=open]]:text-foreground dark:[&_[role=menuitem][data-state=open]]:text-[#d1d7db]">
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={onTogglePanel}>
                    <Info className="w-4 h-4" /> <span>Contact info</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <CheckSquare className="w-4 h-4" /> <span>Select messages</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex justify-between group" onClick={() => onMuteChat?.(conversation?.id)}>
                    <div className="flex items-center gap-4"><BellOff className="w-4 h-4" /> <span>Mute notifications</span></div>
                    <ChevronRight className="w-4 h-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onFavoriteChat?.(conversation?.id)}>
                    <Heart className={cn("w-4 h-4", isFav && "fill-current text-rose-500 dark:text-rose-400")} />
                    <span>{isFav ? 'Remove from favourites' : 'Add to favourites'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSub onOpenChange={(o) => { if (o) loadAddGroups(); }}>
                    <DropdownMenuSubTrigger className="cursor-pointer py-2.5 px-4 flex justify-between group">
                      <div className="flex items-center gap-4"><Users className="w-4 h-4" /> <span>Add to Group</span></div>
                      <ChevronRight className="w-4 h-4" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto bg-white dark:bg-[#161717] border border-border dark:border-0 shadow-lg text-foreground dark:text-[#d1d7db] [&_[role=menuitem]]:hover:bg-zinc-100 dark:[&_[role=menuitem]]:hover:bg-zinc-800 [&_[role=menuitem]]:focus:bg-zinc-100 dark:[&_[role=menuitem]]:focus:bg-zinc-800 [&_[role=menuitem]]:hover:text-foreground dark:[&_[role=menuitem]]:hover:text-[#d1d7db] [&_[role=menuitem]]:focus:text-foreground dark:[&_[role=menuitem]]:focus:text-[#d1d7db]">
                      {addGroupsLoading ? (
                        <DropdownMenuItem disabled className="py-2.5 px-4 text-muted-foreground">Loading…</DropdownMenuItem>
                      ) : addGroups.length === 0 ? (
                        <DropdownMenuItem disabled className="py-2.5 px-4 text-muted-foreground">No broadcast groups</DropdownMenuItem>
                      ) : (
                        addGroups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            disabled={addingGroupId !== null}
                            onSelect={(e) => { e.preventDefault(); handleAddToGroup(g.id, g.name); }}
                            className="cursor-pointer py-2.5 px-4 flex items-center justify-between gap-4"
                          >
                            <span className="truncate">{g.name}</span>
                            {addingGroupId === g.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              : <span className="text-[10px] text-muted-foreground shrink-0">{g.conversation_count ?? 0}</span>}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onCloseChat?.(conversation?.id)}>
                    <XCircle className="w-4 h-4" /> <span>Close chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4">
                    <Calendar className="w-4 h-4" /> <span>Schedule call</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onBlockChat?.(conversation?.id)}>
                    <Ban className="w-4 h-4" /> <span>Block</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onClearChat?.(conversation?.id)}>
                    <MinusCircle className="w-4 h-4" /> <span>Clear chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 px-4 flex items-center gap-4" onClick={() => onDeleteChat?.(conversation?.id)}>
                    <Trash2 className="w-4 h-4" /> <span>Delete chat</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      {/*
        68 px = px-4 (16) + avatar w-10 (40) + gap-3 (12) - matches the
        header's contact-name start position exactly.
        We target both sides:
          • ml-[68px]  on the incoming bubble container
          • mr-[68px]  mirrors the indent on outgoing bubbles so the
                       conversation feels balanced
        The selectors below cover the two most common patterns MessageList
        uses to mark direction.  Adjust the attribute/class names if your
        MessageList uses different ones.
      */}
      <div className={cn(
        "flex-1 overflow-hidden flex flex-col min-h-0",
        // incoming bubbles - left indent aligns with header name
        "[&_[data-incoming='true']>*:first-child]:ml-[68px]",
        "[&_[data-role='user']>*:first-child]:ml-[68px]",
        // outgoing bubbles - mirror indent from the right
        "[&_[data-incoming='false']>*:first-child]:mr-[68px]",
        "[&_[data-role='assistant']>*:first-child]:mr-[68px]",
        "[&_[data-role='human_agent']>*:first-child]:mr-[68px]",
      )}>
      <MessageList
        messages={allMessages}
        conversationId={conversation.id}
        contact={conversation.contact}
        onDeleteMessage={handleDeleteMessage}
        onToggleStar={(backendChannel || channel) === 'personal' ? handleToggleStar : undefined}
        isAgentTyping={isAgentTyping}
        hasMore={hasMore}
        isLoadingMore={loadingOlder}
        onLoadMore={handleLoadMore}
        searchText={searchText}
        highlightedMessageId={matchingMessageIds[searchMatchIndex]}
      />
      </div>

      {/* ── Modals ── */}
      <AlertDialog open={showTakeoverDialog} onOpenChange={setShowTakeoverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take over from AI Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause the AI agent and give you manual control.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTakeover}>Yes, take control</AlertDialogAction>
          </AlertDialogFooter>
          {ownershipError && (
            <p className="px-6 pb-4 text-sm text-red-600">{ownershipError}</p>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {showPoll && <PollModal onClose={() => setShowPoll(false)} onSend={handleRichSend} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} onSend={handleRichSend} />}
      {showEvent && <EventModal onClose={() => setShowEvent(false)} onSend={handleRichSend} />}
      {showLocation && <LocationModal onClose={() => setShowLocation(false)} onSend={handleRichSend} />}

      {/* ── Hidden file inputs ── */}
      <input ref={galleryRef} type="file" multiple className="hidden" aria-label="Upload photos or videos" onChange={handleFileChange} accept="image/*,video/*" />
      <input ref={cameraRef} type="file" className="hidden" aria-label="Take a photo" onChange={handleFileChange} accept="image/*,video/*" />
      <input ref={documentRef} type="file" multiple className="hidden" aria-label="Upload document" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" />
      <input ref={audioRef} type="file" multiple className="hidden" aria-label="Upload audio" onChange={handleFileChange} accept="audio/*" />

      {/* ── Template Picker ── */}
      <div className="[&_[class*='111b21']]:dark:bg-[rgb(22,23,23)] [&_[class*='dark:bg-']>div]:dark:bg-[rgb(22,23,23)]">
        <TemplatePicker
          open={isTemplatePickerOpen}
          onOpenChange={setIsTemplatePickerOpen}
          selectedCount={1}
          onSend={handleTemplateSend}
          sending={templateSending}
          sendProgress={templateSendProgress}
          channel={backendChannel ?? 'waba'}
          isBulkSend={false}
          variant="whatsapp"
        />
      </div>

      {/* Composer */}
      <div className="mt-4 px-2 bg-white dark:bg-[#242626] rounded-[50px] mb-2 sm:mb-[1.5%] mx-2 sm:mx-[3%] shrink-0 z-10 relative">

        {/* ── Pending file previews ── */}
        {(pendingFiles.length > 0 || fileLoading) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {fileLoading && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm text-blue-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Reading file…</span>
              </div>
            )}
            {pendingFiles.map(pf => (
              <div key={pf.id} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm max-w-[200px]">
                {pf.mediaType === 'image'
                  ? <img src={pf.previewUrl} alt={pf.file.name} className="h-7 w-7 rounded object-cover shrink-0" />
                  : pf.mediaType === 'video'
                    ? <div className="h-7 w-7 rounded bg-purple-100 flex items-center justify-center shrink-0"><ImageIcon className="h-4 w-4 text-purple-600" /></div>
                    : pf.mediaType === 'audio'
                      ? <div className="h-7 w-7 rounded bg-orange-100 flex items-center justify-center shrink-0"><Music className="h-4 w-4 text-orange-600" /></div>
                      : <div className="h-7 w-7 rounded bg-blue-100 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-blue-600" /></div>
                }
                <span className="truncate text-xs">{pf.file.name}</span>
                <button type="button" aria-label="Remove file" onClick={() => removePendingFile(pf.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">

          {/* ── Pill - attach + emoji + textarea all inside ── */}
          <div className="flex-1 flex items-center rounded-[24px] py-1 min-h-[44px] gap-1">

            {/* Attach - inside pill */}
            <div ref={attachBtnRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowAttachMenu(v => !v)}
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-zinc-400/10',
                  showAttachMenu ? 'text-[#00a884] rotate-45' : 'text-muted-foreground dark:text-[#8696a0] hover:text-foreground'
                )}
              >
                <Plus className="w-5 h-5" />
              </button>
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-[200px] bg-white dark:bg-zinc-900 border border-transparent dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-40 py-1">
                  {ATTACH_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAttachItem(item.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-colors text-left"
                    >
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', item.bg, item.color)}>
                        <span className="scale-75">{item.icon}</span>
                      </div>
                      <span className="text-[13px] text-foreground dark:text-[#e9edef] font-normal">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emoji - inside pill */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                data-sticker-btn
                aria-label={showStickers ? 'Hide emoji' : 'Show emoji'}
                aria-pressed={showStickers ? 'true' : 'false'}
                onClick={() => setShowStickers(v => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground dark:text-[#8696a0] hover:text-foreground transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              {showStickers && (
                <EmojiPicker
                  onSelect={(emoji: string) => {
                    setText(prev => prev + emoji);
                    setShowStickers(false);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                  onClose={() => setShowStickers(false)}
                />
              )}
            </div>

            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingFiles.length > 0 ? 'Add a caption (optional)…' : 'Type a message'}
              className="flex-1 border-0 dark:bg-transparent text-foreground dark:text-[#e9edef] py-2 px-1 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#8696a0] dark:placeholder:text-[#a2a2a2] resize-none min-h-[24px] max-h-[120px] my-0.5 leading-normal shadow-none"
              rows={1}
            />
          </div>

          {/* Agent toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn('h-9 w-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#00a884]/10 dark:hover:bg-[#00a884]/20 flex-shrink-0', agentType === 'human' && 'text-orange-500')}
                title={agentType === 'human' ? 'Human agent - tap to hand back to Mr LAD' : 'Mr LAD is replying - tap to take over'}
              >
                {agentType === 'human' ? <User className="h-5 w-5" /> : <img src={isDark ? '/logo-white.svg' : '/logo.svg'} alt="Mr LAD" className="h-7 w-7 object-contain" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem onClick={() => handleAgentTypeChange('human')} className={cn('cursor-pointer focus:bg-muted focus:text-foreground dark:focus:text-white', agentType === 'human' && 'bg-muted')}>
                <User className="h-4 w-4 mr-2" /> Human Agent
                {agentType === 'human' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAgentTypeChange('ai')} className={cn('cursor-pointer focus:bg-muted focus:text-foreground dark:focus:text-white', agentType === 'ai' && 'bg-muted')}>
                <MrLadAvatar size={16} className="mr-2" /> Mr LAD
                {agentType === 'ai' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send / Mic */}
          {isSending ? (
            <div className="shrink-0 w-9 h-9 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#00a884] animate-spin" />
            </div>
          ) : (text.trim() || pendingFiles.length > 0) ? (
            <button
              type="button"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors text-[#00a884] hover:text-[#008f6f]"
              onClick={handleSend}
              aria-label="Send message"
            >
              <Send className="w-6 h-6" />
            </button>
          ) : (
            <button
              ref={micBtnRef}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors text-muted-foreground dark:text-[#8696a0] hover:text-[#00a884] dark:hover:text-[#00a884]"
              onClick={startVoiceRecording}
              aria-label="Record voice message"
            >
              <Mic className="w-6 h-6" />
            </button>
          )}

        </div>

        {(sendError || ownershipError) && (
          <div className="mt-1.5 px-3 py-1.5 rounded-md text-xs flex items-center justify-between gap-2 bg-red-50 text-red-700 border border-red-200">
            <span>{sendError || ownershipError}</span>
            <button type="button" onClick={() => { setSendError(null); setOwnershipError(null); }} className="text-red-500 hover:text-red-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {groupActionNote && (
          <div className={cn(
            'mt-1.5 px-3 py-1.5 rounded-md text-xs flex items-center justify-between gap-2 border',
            groupActionNote.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          )}>
            <span>{groupActionNote.text}</span>
            <button type="button" onClick={() => setGroupActionNote(null)} className="hover:opacity-70">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Template send result ── */}
        {templateSendResult && (
          <div className={cn('mt-1.5 px-3 py-1.5 rounded-md text-xs flex items-center gap-2',
            templateSendResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
            {templateSendResult.success ? '✓' : '✕'} {templateSendResult.message}
          </div>
        )}
      </div>
      {/* ── Phase 1: Active recording ── */}
      {isVoiceRecording && (
        <div className="absolute inset-x-0 bottom-0 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-border dark:border-[#2a3942] z-20 h-16 flex items-center px-3 gap-3">
          <button
            onClick={cancelVoiceRecording}
            aria-label="Cancel recording"
            className="shrink-0 w-10 h-10 flex items-center justify-center text-[#54656f] dark:text-[#8696a0] hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            <span className="text-sm font-medium tabular-nums text-[#111b21] dark:text-[#e9edef] min-w-[38px]">
              {fmtDur(voiceElapsed)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <canvas ref={waveCanvasRef} className="w-full h-10" />
          </div>
          <button
            onClick={stopAndPreviewRecording}
            aria-label="Stop recording"
            className="shrink-0 w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center transition-colors"
          >
            <StopCircle className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* ── Phase 2: Preview before sending ── */}
      {!isVoiceRecording && voicePreviewUrl && (
        <div className="absolute inset-x-0 bottom-0 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-border dark:border-[#2a3942] z-20 h-16 flex items-center px-3 gap-3">
          {/* Hidden audio element for preview playback */}
          <audio
            ref={voicePreviewAudioRef}
            src={voicePreviewUrl}
            onTimeUpdate={() => {
              const a = voicePreviewAudioRef.current;
              if (a && a.duration) setVoicePlayProgress((a.currentTime / a.duration) * 100);
            }}
            onEnded={() => { setIsVoicePlaying(false); setVoicePlayProgress(0); }}
          />
          {/* Discard */}
          <button
            onClick={cancelVoiceRecording}
            aria-label="Discard recording"
            className="shrink-0 w-10 h-10 flex items-center justify-center text-[#54656f] dark:text-[#8696a0] hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {/* Play / Pause */}
          <button
            onClick={toggleVoicePlayback}
            aria-label={isVoicePlaying ? 'Pause' : 'Play preview'}
            className="shrink-0 w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center hover:bg-[#008f6f] transition-colors"
          >
            {isVoicePlaying
              ? <Pause className="w-5 h-5 text-white fill-white" />
              : <Play className="w-5 h-5 text-white fill-white" />
            }
          </button>
          {/* Duration */}
          <span className="text-sm font-medium tabular-nums text-[#111b21] dark:text-[#e9edef] min-w-[38px]">
            {fmtDur(voiceElapsed)}
          </span>
          {/* Live progress bar */}
          <div
            className="flex-1 min-w-0 h-1.5 bg-[#d1d7db] dark:bg-[#8696a0]/50 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const a = voicePreviewAudioRef.current;
              if (!a || !a.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              a.currentTime = pct * a.duration;
              setVoicePlayProgress(pct * 100);
            }}
          >
            <div
              className="h-full bg-[#00a884] rounded-full transition-none"
              style={{ width: `${voicePlayProgress}%` }}
            />
          </div>
          {/* Send */}
          <button
            onClick={sendVoiceRecording}
            aria-label="Send voice message"
            className="shrink-0 w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
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
  // ── Sort / filter ──────────────────────────────────────────────────────
  sortBy?: 'date' | 'message_count' | 'name';
  onSortByChange?: (sortBy: 'date' | 'message_count' | 'name') => void;
  hideEmpty?: boolean;
  onHideEmptyChange?: (hide: boolean) => void;
  selectedLabelIds?: string[];
  onLabelFilterChange?: (ids: string[]) => void;
  // ── Context status chips ───────────────────────────────────────────────
  contextStatusFilter?: string;
  onContextStatusFilterChange?: (status: string) => void;
  contextStatuses?: ContextStatusOption[];
  // ── Misc ──────────────────────────────────────────────────────────────
  backendChannel?: 'personal' | 'waba';
  onRefresh?: () => void;
  onOpenStarred?: () => void;
  /** Reports the currently multi-selected broadcast-group ids (empty when none/closed). */
  onSelectedGroupsChange?: (ids: string[]) => void;
  // ── Group management callbacks (passed through to overlay) ─────────────
  onShowCreateGroupModal?: (selectedIds: string[]) => void;
  groupRefreshKey?: number;
  activeLastMsg?: Message | null;
  // ── Infinite scroll (conversation-list pagination) ─────────────────────
  loadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isImportDialogOpen?: boolean;
  onImportDialogOpenChange?: (open: boolean) => void;
}

type FilterTab = 'all' | 'unread' | 'favourites';

function WABASidebar({
  conversations,
  selectedId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  sortBy = 'date',
  onSortByChange,
  hideEmpty = false,
  onHideEmptyChange,
  selectedLabelIds = [],
  onLabelFilterChange,
  contextStatusFilter = 'all',
  onContextStatusFilterChange,
  contextStatuses = [],
  backendChannel,
  onRefresh,
  onOpenStarred,
  onSelectedGroupsChange,
  onShowCreateGroupModal,
  groupRefreshKey,
  activeLastMsg,
  loadMore,
  hasMore,
  isLoadingMore,
  isImportDialogOpen: externalIsImportDialogOpen,
  onImportDialogOpenChange,
}: WABASidebarProps) {
  // Per-viewer phone masking. The list renders a contact number twice - as the
  // title when no name is known, and as the subtitle under every named contact
  // - so without this the sidebar showed raw numbers for essentially every
  // conversation regardless of the setting.
  const { displayPhone, displayNameOrPhone } = usePhoneMasking();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarError, setSidebarError] = useState<SidebarErrorState | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedChatIds(new Set());
  }, []);

  const toggleSelectChat = useCallback((id: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Template picker state ──────────────────────────────────────────────
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templateSending, setTemplateSending] = useState(false);
  const [templateSendProgress, setTemplateSendProgress] = useState<{ sent: number; total: number; running: boolean } | null>(null);
  const [sendSummary, setSendSummary] = useState<{ sent: number; queued: number; scheduledDays: number } | null>(null);
  const [groupTemplateSendTarget, setGroupTemplateSendTarget] = useState<{ groupIds: string[]; count: number } | null>(null);

  // ── Rich New Chat overlay state (mirrors ConversationSidebar) ──────────
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatGroups, setNewChatGroups] = useState<ChatGroup[]>([]);
  const [newChatGroupsLoading, setNewChatGroupsLoading] = useState(false);
  const [selectedNewChatIds, setSelectedNewChatIds] = useState<Set<string>>(new Set());
  const [selectedNewChatGroupIds, setSelectedNewChatGroupIds] = useState<Set<string>>(new Set());
  const [newChatContacts, setNewChatContacts] = useState<Conversation[]>([]);
  const [newChatContactsLoading, setNewChatContactsLoading] = useState(false);
  const [newChatContactsTotal, setNewChatContactsTotal] = useState(0);
  const [groupsSectionExpanded, setGroupsSectionExpanded] = useState(true);
  const [contactsSectionExpanded, setContactsSectionExpanded] = useState(true);
  const [importRefreshTrigger, setImportRefreshTrigger] = useState(0);
  const deferredNewChatSearch = useDeferredValue(newChatSearch.trim());

  const normalizePhone = useCallback((value?: string) => (value || '').replace(/\D/g, ''), []);
  const conversationIdByLead = useMemo(() => {
    const map = new Map<string, string>();
    conversations.forEach((conv) => {
      const lead = getConversationLeadId(conv);
      if (lead) map.set(String(lead), conv.id);
    });
    return map;
  }, [conversations]);
  const conversationIdByPhone = useMemo(() => {
    const map = new Map<string, string>();
    conversations.forEach((conv) => {
      const phone = normalizePhone(conv.contact?.phone);
      if (phone) map.set(phone, conv.id);
    });
    return map;
  }, [conversations, normalizePhone]);

  // ── Import dialog ──────────────────────────────────────────────────────
  const [internalIsImportDialogOpen, setInternalIsImportDialogOpen] = useState(false);
  const isImportDialogOpen = externalIsImportDialogOpen ?? internalIsImportDialogOpen;
  const setIsImportDialogOpen = onImportDialogOpenChange ?? setInternalIsImportDialogOpen;

  // ── Group manager dialog ───────────────────────────────────────────────
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  // ── Message settings dialog (reply delay + inbound debounce) ────────────
  const [showMessageSettings, setShowMessageSettings] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
  const [selectedGroupsPanelIds, setSelectedGroupsPanelIds] = useState<Set<string>>(new Set());
  // Broadcast-groups panel: checkboxes stay hidden until the user double-clicks a
  // group (or taps "Select"), which turns on multi-select mode. A single click
  // outside selection mode opens that group's chat instead.
  const [panelSelectionMode, setPanelSelectionMode] = useState(false);
  const [infoGroup, setInfoGroup] = useState<ChatGroup | null>(null);
  // Scheduled broadcasts (Cloud-Task triggered): groups to schedule for + list-viewer toggle.
  const [scheduleGroupIds, setScheduleGroupIds] = useState<string[] | null>(null);
  const [isScheduledListOpen, setIsScheduledListOpen] = useState(false);
  const [createGroupIds, setCreateGroupIds] = useState<string[]>([]);

  // ── Group-chat broadcast: post one message into each selected WhatsApp group
  //    chat (not its members), throttled server-side (batch 5-10, 2min+, 250/day).
  const [groupBroadcastBatchSize, setGroupBroadcastBatchSize] = useState(5);
  const [groupBroadcastSending, setGroupBroadcastSending] = useState(false);
  const [groupBroadcastResult, setGroupBroadcastResult] = useState<string | null>(null);
  const [isSyncingWaGroups, setIsSyncingWaGroups] = useState(false);
  // Search + type filter for the Broadcast Groups panel (300+ synced WA groups).
  // Type: 'whatsapp' = native WhatsApp chat groups (have wa_group_jid),
  //       'broadcast' = manually-created broadcast lists, 'both' = all.
  const [groupsPanelSearch, setGroupsPanelSearch] = useState('');
  const [groupTypeFilter, setGroupTypeFilter] = useState<'both' | 'whatsapp' | 'broadcast'>('both');
  const filteredPanelGroups = useMemo(() => {
    const q = groupsPanelSearch.trim().toLowerCase();
    return newChatGroups.filter((g) => {
      // Saved broadcast sets (is_broadcast_list) are non-WhatsApp groups, so they
      // surface under the "Broadcast groups" filter alongside the manual groups.
      const isWhatsappGroup = !!g.metadata?.wa_group_jid;
      const matchesType =
        groupTypeFilter === 'both' ||
        (groupTypeFilter === 'whatsapp' ? isWhatsappGroup : !isWhatsappGroup);
      const matchesSearch = !q || (g.name || '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [newChatGroups, groupsPanelSearch, groupTypeFilter]);

  // Leaving the panel resets multi-select mode so it reopens in "single-click opens" mode.
  useEffect(() => {
    if (!isGroupsPanelOpen) setPanelSelectionMode(false);
  }, [isGroupsPanelOpen]);

  // Report the multi-selected groups up so the right pane can show broadcast-group
  // actions (create / add to existing) instead of the default chat splash.
  useEffect(() => {
    onSelectedGroupsChange?.(
      isGroupsPanelOpen && selectedGroupsPanelIds.size > 0 ? Array.from(selectedGroupsPanelIds) : [],
    );
  }, [isGroupsPanelOpen, selectedGroupsPanelIds, onSelectedGroupsChange]);

  // Open a broadcast group's underlying chat. Native WA groups carry wa_group_jid,
  // whose local part is the group conversation's contact phone; fall back to name.
  const openGroupConversation = useCallback(
    async (group: ChatGroup) => {
      const jid = (group.metadata as { wa_group_jid?: string } | undefined)?.wa_group_jid;
      const local = jid ? jid.split('@')[0] : null;
      const nameLc = (group.name || '').trim().toLowerCase();
      const match = conversations.find((c) => {
        const phone = (c.contact?.phone || '').replace(/@.*$/, '');
        if (local && (phone === local || c.contact?.phone === jid)) return true;
        return !!c.contact?.name && c.contact.name.trim().toLowerCase() === nameLc;
      });
      if (match) {
        onSelectConversation(match.id);
        setIsGroupsPanelOpen(false);
        return;
      }
      // Not in the loaded list. For a synced WA group, resolve-or-create its chat so
      // a single click always opens it - even before any messages have arrived.
      //
      // A BROADCAST group has no chat to open, and never will: it is a saved
      // audience that fans out to N separate 1:1 conversations. Telling the user
      // "no chat to open" described our data model rather than answering what
      // they clicked for, so a click now opens the group itself - members, who
      // can be added, and what has been broadcast to them.
      if (!jid) {
        setInfoGroup(group);
        setIsGroupsPanelOpen(false);
        return;
      }
      try {
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/chat-groups/${group.id}/resolve-conversation?channel=${backendChannel || 'personal'}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.conversation_id) {
          onSelectConversation(data.conversation_id);
          setIsGroupsPanelOpen(false);
        } else {
          setGroupBroadcastResult(data?.error || `Couldn't open "${group.name}".`);
        }
      } catch {
        setGroupBroadcastResult(`Couldn't open "${group.name}".`);
      }
    },
    [conversations, onSelectConversation, backendChannel]
  );

  const [savingBroadcastList, setSavingBroadcastList] = useState(false);

  // Import the owner's native WhatsApp groups (with JIDs) so they can receive a
  // group-chat broadcast. Mirrors the Chat Group Manager's "Sync WA Groups".
  const handleSyncWaGroups = useCallback(async () => {
    if (isSyncingWaGroups) return;
    setIsSyncingWaGroups(true);
    setGroupBroadcastResult(null);
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/wa-groups/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setGroupBroadcastResult(data.error || 'Sync failed - is your Personal WhatsApp connected?');
      } else {
        setGroupBroadcastResult(data.message || `Synced ${data.synced ?? 0} WhatsApp group${data.synced === 1 ? '' : 's'}.`);
        // Refresh the panel list so the newly-synced groups appear.
        const gr = await fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${backendChannel || 'personal'}`);
        const gd = await gr.json().catch(() => ({}));
        if (Array.isArray(gd.data)) setNewChatGroups(gd.data);
      }
    } catch (err) {
      setGroupBroadcastResult(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncingWaGroups(false);
    }
  }, [isSyncingWaGroups, backendChannel]);

  // Click a saved broadcast group → select all its member chat groups for broadcast.
  const handleSelectBroadcastList = useCallback((list: ChatGroup) => {
    const ids: string[] = Array.isArray((list.metadata as any)?.member_group_ids)
      ? (list.metadata as any).member_group_ids.map(String)
      : [];
    const known = new Set(newChatGroups.map((g) => g.id));
    const present = ids.filter((id) => known.has(id));
    setSelectedGroupsPanelIds(new Set(present));
    setPanelSelectionMode(true); // show checkboxes so the loaded set is visible/editable
    setGroupBroadcastResult(
      present.length < ids.length
        ? `${present.length}/${ids.length} groups from "${list.name}" available - re-sync if some are missing.`
        : `Loaded "${list.name}" - ${present.length} group${present.length === 1 ? '' : 's'} selected. Compose a message to broadcast.`,
    );
  }, [newChatGroups]);

  // Save the current group selection as a reusable broadcast group.
  const handleSaveBroadcastList = useCallback(async () => {
    const ids = [...selectedGroupsPanelIds];
    if (ids.length === 0) return;
    const name = typeof window !== 'undefined'
      ? window.prompt(`Name this broadcast group (${ids.length} groups):`)
      : null;
    if (!name || !name.trim()) return;
    setSavingBroadcastList(true);
    setGroupBroadcastResult(null);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/broadcast-lists?channel=${backendChannel || 'personal'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), group_ids: ids }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGroupBroadcastResult(data.error || `Save failed (${res.status})`); return; }
      setGroupBroadcastResult(`Saved broadcast group "${name.trim()}" (${ids.length} groups).`);
      // Refresh so the new saved set appears.
      const gr = await fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${backendChannel || 'personal'}`);
      const gd = await gr.json().catch(() => ({}));
      if (Array.isArray(gd.data)) setNewChatGroups(gd.data);
    } catch (e) {
      setGroupBroadcastResult(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingBroadcastList(false);
    }
  }, [selectedGroupsPanelIds, backendChannel]);

  // Dispatch a composed rich payload (text / media / poll / contact / location…)
  // to every currently-selected group, throttled server-side.
  const handleGroupRichBroadcast = useCallback(async (payload: ComposerRichPayload) => {
    if (groupBroadcastSending) return;
    const selectedGroups = newChatGroups.filter((g) => selectedGroupsPanelIds.has(g.id));
    if (selectedGroups.length === 0) {
      setGroupBroadcastResult('Select at least one group first.');
      return;
    }
    setGroupBroadcastSending(true);
    setGroupBroadcastResult(null);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/broadcast-to-groups?channel=${backendChannel || 'personal'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_ids: selectedGroups.map((g) => g.id),
            payload,
            batch_size: groupBroadcastBatchSize,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupBroadcastResult(data.error || `Failed (${res.status})`);
        return;
      }
      let note = `Broadcasting (${payload.type}) to ${data.queued} group${data.queued === 1 ? '' : 's'}…`;
      if (data.skipped_non_whatsapp) note += ` · ${data.skipped_non_whatsapp} skipped (not synced WA groups)`;
      if (data.capped_by_daily_limit) note += ' · daily 250 cap hit, rest deferred';
      setGroupBroadcastResult(note);
      setSelectedGroupsPanelIds(new Set());
    } catch (err) {
      setGroupBroadcastResult(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setGroupBroadcastSending(false);
    }
  }, [groupBroadcastSending, newChatGroups, selectedGroupsPanelIds, groupBroadcastBatchSize, backendChannel]);

  // Broadcast a saved template to the selected groups (the backend renders it
  // into text/media, substituting {{n}} params, then fans it out throttled).
  const handleGroupTemplateBroadcast = useCallback(async (
    templateName: string,
    languageCode: string,
    parameters: string[],
  ) => {
    if (groupBroadcastSending) return;
    const selectedGroups = newChatGroups.filter((g) => selectedGroupsPanelIds.has(g.id));
    if (selectedGroups.length === 0) {
      setGroupBroadcastResult('Select at least one group first.');
      throw new Error('Select at least one group first.');
    }
    setGroupBroadcastSending(true);
    setGroupBroadcastResult(null);
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/chat-groups/broadcast-to-groups?channel=${backendChannel || 'personal'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_ids: selectedGroups.map((g) => g.id),
            payload: { type: 'template', templateName, languageCode, parameters: parameters || [] },
            batch_size: groupBroadcastBatchSize,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupBroadcastResult(data.error || `Failed (${res.status})`);
        throw new Error(data.error || `Failed (${res.status})`);
      }
      let note = `Broadcasting template "${templateName}" to ${data.queued} group${data.queued === 1 ? '' : 's'}…`;
      if (data.skipped_non_whatsapp) note += ` · ${data.skipped_non_whatsapp} skipped (not synced WA groups)`;
      if (data.capped_by_daily_limit) note += ' · daily 250 cap hit, rest deferred';
      setGroupBroadcastResult(note);
      setSelectedGroupsPanelIds(new Set());
    } finally {
      setGroupBroadcastSending(false);
    }
  }, [groupBroadcastSending, newChatGroups, selectedGroupsPanelIds, groupBroadcastBatchSize, backendChannel]);

  // ── Label library (fetched once if parent opts in) ─────────────────────
  const [allLabels, setAllLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectMode) exitSelectMode();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSelectMode, exitSelectMode]);

  useEffect(() => {
    if (!onLabelFilterChange) return;
    let cancelled = false;
    fetchWithTenant(`/api/whatsapp-conversations/labels?channel=${backendChannel || 'waba'}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.labels) ? data.labels : [];
        const safeRows = rows as Array<{ id?: string | number; name?: string; color?: string }>;
        setAllLabels(
          safeRows
            .filter((l) => l.id != null && typeof l.name === 'string')
            .map((l) => ({ id: String(l.id), name: l.name as string, color: l.color || '#808080' }))
        );
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [onLabelFilterChange]);

  // ── Load groups whenever New Chat panel is open or group manager closes ─
  useEffect(() => {
    const groupsChannel = backendChannel || 'waba';
    setNewChatGroupsLoading(true);
    fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${groupsChannel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.data)) setNewChatGroups(data.data); })
      .catch(() => { })
      .finally(() => setNewChatGroupsLoading(false));
  }, [isNewChatOpen, isGroupManagerOpen, backendChannel, groupRefreshKey]);

  // ── Load contacts when New Chat panel opens ────────────────────────────
  useEffect(() => {
    if (!isNewChatOpen) return;
    let cancelled = false;
    setNewChatContacts([]);
    setNewChatContactsTotal(0);
    setNewChatContactsLoading(true);

    const PAGE_SIZE = 200;
    const ch = backendChannel || 'waba';
    const searchParam = deferredNewChatSearch ? `&search=${encodeURIComponent(deferredNewChatSearch)}` : '';

    const mapContact = (rawRecord: Record<string, unknown>): Conversation => {
      const raw = rawRecord as Record<string, unknown> & { contact?: Conversation['contact'] };
      if (raw.contact) return raw as unknown as Conversation;
      const leadId = raw.lead_id || raw.leadId || raw.id;
      const phone = String(raw.lead_phone || raw.phone || '');
      const normalizedPhone = normalizePhone(phone);
      const existingConversationId =
        raw.conversation_id ||
        raw.conversationId ||
        (leadId ? conversationIdByLead.get(String(leadId)) : undefined) ||
        (normalizedPhone ? conversationIdByPhone.get(normalizedPhone) : undefined);

      return {
        id: existingConversationId || String(raw.id || leadId || phone),
        contact: {
          name: raw.lead_name || raw.name || raw.contact_name || '',
          phone,
        },
      } as unknown as Conversation;
    };

    if (ch === 'personal') {
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      const fetchPage = async (offset: number, retries = 1): Promise<{ raw: Array<Record<string, unknown>>; total: number } | null> => {
        try {
          const r = await fetchWithTenant(
            `/api/whatsapp-conversations/contacts?channel=personal&limit=${PAGE_SIZE}&offset=${offset}${searchParam}`
          );
          if (!r.ok) return null;
          const data = await r.json();
          const raw = (Array.isArray(data.contacts) ? data.contacts : (Array.isArray(data.data) ? data.data : [])) as Array<Record<string, unknown>>;
          return { raw, total: Number(data.total || 0) };
        } catch {
          if (retries > 0) { await sleep(500); return fetchPage(offset, retries - 1); }
          return null;
        }
      };

      const loadPage = async (offset: number, accumulated: Conversation[]) => {
        const result = await fetchPage(offset);
        if (!result) return;
        const { raw, total } = result;
        const mapped = raw.map(mapContact);
        if (cancelled) return;
        const all = [...accumulated, ...mapped];
        setNewChatContacts(all);
        setNewChatContactsTotal(total);
        if (all.length < total && raw.length === PAGE_SIZE) {
          await sleep(150);
          await loadPage(offset + PAGE_SIZE, all);
        }
      };

      loadPage(0, []).finally(() => {
        if (!cancelled) setNewChatContactsLoading(false);
      });
    } else {
      fetchWithTenant(`/api/whatsapp-conversations/conversations?channel=waba&limit=500${searchParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const raw = (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])) as Array<Record<string, unknown>>;
          const list: Conversation[] = raw.map(mapContact);
          setNewChatContacts(list);
          setNewChatContactsTotal(data.total || list.length);
        })
        .catch(() => { })
        .finally(() => {
          if (!cancelled) setNewChatContactsLoading(false);
        });
    }
    return () => { cancelled = true; };
  }, [
    isNewChatOpen,
    backendChannel,
    importRefreshTrigger,
    deferredNewChatSearch,
    conversationIdByLead,
    conversationIdByPhone,
    normalizePhone,
  ]);

  const openChatFromNewContact = useCallback((conv: Conversation) => {
    const leadId = getConversationLeadId(conv);
    const normalizedPhone = normalizePhone(conv.contact?.phone);
    const resolvedConversationId =
      (conversations.some((c) => c.id === conv.id) ? conv.id : undefined) ||
      (leadId ? conversationIdByLead.get(String(leadId)) : undefined) ||
      (normalizedPhone ? conversationIdByPhone.get(normalizedPhone) : undefined) ||
      conv.id;

    setIsNewChatOpen(false);
    setNewChatSearch('');
    setSelectedNewChatIds(new Set());
    setSelectedNewChatGroupIds(new Set());
    onSelectConversation(resolvedConversationId);
  }, [
    conversations,
    conversationIdByLead,
    conversationIdByPhone,
    normalizePhone,
    onSelectConversation,
  ]);

  // ── Refresh handler ────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    setSidebarError(null);
    const channelParam = backendChannel ? `?channel=${backendChannel}` : '';
    fetchWithTenant(`/api/whatsapp-conversations/accounts/sync${channelParam}`, { method: 'POST' })
      .catch((err: unknown) => {
        setSidebarError({ message: getErrorMessage(err, 'Failed to refresh conversations') });
      })
      .finally(() => {
        setTimeout(() => {
          onRefresh();
          setIsRefreshing(false);
        }, 15000);
      });
  }, [onRefresh, isRefreshing, backendChannel]);

  // ── Group template send handlers ───────────────────────────────────────
  const handleGroupTemplateSend = useCallback((groupId: string, conversationCount: number) => {
    setGroupTemplateSendTarget({ groupIds: [groupId], count: conversationCount });
    setIsTemplatePickerOpen(true);
  }, []);

  const handleGroupsTemplateSend = useCallback((selectedGroups: ChatGroup[]) => {
    const groupIds = selectedGroups.map(g => g.id);
    const totalCount = selectedGroups.reduce((acc, g) =>
      acc + (g.metadata?.wa_group && g.metadata.participant_count
        ? g.metadata.participant_count
        : (g.member_count ?? g.conversation_count ?? 0)), 0);
    setGroupTemplateSendTarget({ groupIds, count: totalCount });
    setIsTemplatePickerOpen(true);
  }, []);

  // ── Template send handler (mirrors ConversationSidebar.handleTemplateSend) ─
  const handleTemplateSend = useCallback(
    async (
      templateName: string,
      languageCode: string,
      parameters: string[],
      nameFormat: 'first' | 'full' = 'first',
      batch = { batchSize: 5, delayMin: 120, delayRandom: 30, dailyLimit: 250 },
      headerParamCount = 0,
      headerType = '',
      headerUrl = '',
      // The number the template lives on. A template exists on one WABA, so the
      // blast has to leave from that number or Meta cannot find it.
      accountId = '',
    ) => {
      setTemplateSending(true);
      const totalCount = groupTemplateSendTarget?.count ?? 0;
      setTemplateSendProgress({ sent: 0, total: totalCount, running: true });

      try {
        if (groupTemplateSendTarget) {
          const channelParam = backendChannel === 'personal' ? '?channel=personal' : '';
          const { batchSize, delayMin, delayRandom, dailyLimit } = batch;
          const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
          let sentTotal = 0;

          for (let i = 0; i < groupTemplateSendTarget.groupIds.length; i++) {
            const groupId = groupTemplateSendTarget.groupIds[i];
            try {
              const res = await fetchWithTenant(
                `/api/whatsapp-conversations/chat-groups/${groupId}/send-template${channelParam}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    account_id: accountId || '',
                    template_name: templateName,
                    language_code: languageCode,
                    parameters,
                    name_format: nameFormat,
                    batch_size: batchSize,
                    delay_min: delayMin,
                    delay_random: delayRandom,
                    daily_limit: dailyLimit,
                    header_param_count: headerParamCount,
                    header_type: headerType,
                    header_url: headerUrl,
                  }),
                }
              );
              const data = await res.json();
              if (data.success) {
                sentTotal += data.sent || 0;
                setTemplateSendProgress(prev => prev ? { ...prev, sent: sentTotal } : null);
                if (data.queued > 0) {
                  setSendSummary(prev => ({
                    sent: (prev?.sent ?? 0) + (data.sent ?? 0),
                    queued: (prev?.queued ?? 0) + (data.queued ?? 0),
                    scheduledDays: Math.max(prev?.scheduledDays ?? 0, data.scheduled_days ?? 0),
                  }));
                }
              }
              if (!data.success) {
                setSidebarError({ message: data.error || `Failed to send template to group ${groupId}` });
              }
            } catch (err) {
              setSidebarError({ message: getErrorMessage(err, `Failed to send template to group ${groupId}`) });
            }

            const isLastGroup = i === groupTemplateSendTarget.groupIds.length - 1;
            const batchBoundary = (i + 1) % batchSize === 0;
            if (!isLastGroup && batchBoundary) {
              await sleep((delayMin + Math.random() * delayRandom) * 1000);
            }
          }
        } else if (selectedChatIds.size > 0) {
          const channelParam = backendChannel ? `?channel=${backendChannel}` : '?channel=waba';
          const bulkEndpoint = backendChannel === 'personal'
            ? `/api/whatsapp-conversations/conversations/bulk/send-template${channelParam}`
            : `/api/whatsapp-conversations/conversations/bulk${channelParam}`;
          const res = await fetchWithTenant(bulkEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send-template',
              conversation_ids: Array.from(selectedChatIds),
              account_id: accountId || '',
              template_name: templateName,
              language_code: languageCode,
              parameters,
              name_format: nameFormat,
              batch_size: batch.batchSize,
              delay_min: batch.delayMin,
              delay_random: batch.delayRandom,
              daily_limit: batch.dailyLimit ?? 250,
              header_param_count: headerParamCount,
              header_type: headerType,
              header_url: headerUrl,
            }),
          });
          const data = await res.json();
          if (!data.success) {
            setSidebarError({ message: data.error || 'Bulk template send failed' });
          } else {
            setTemplateSendProgress(prev => prev ? { ...prev, sent: data.sent || 0, running: false } : null);
          }
        }
      } catch (err) {
        setSidebarError({ message: getErrorMessage(err, 'Template send failed') });
        setTemplateSendProgress(null);
      } finally {
        setTemplateSending(false);
        setIsTemplatePickerOpen(false);
        setGroupTemplateSendTarget(null);
      }
    },
    [groupTemplateSendTarget, backendChannel]
  );

  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((conv) => {
      // Search is delegated to the backend (name + phone ILIKE via the `search`
      // query param in useConversations → getConversationsPage), so it finds chats
      // beyond the loaded page. Re-filtering here would hide backend matches whose
      // display name differs, so we intentionally skip client-side search filtering.
      if (filterTab === 'unread') return Boolean(conv.unreadCount && conv.unreadCount > 0);
      const extendedConv = conv as Conversation & { isFavorite?: boolean; favorite?: boolean; is_group?: boolean; isGroup?: boolean; groupId?: string };
      if (filterTab === 'favourites') return Boolean(extendedConv.is_favorite || extendedConv.isFavorite || extendedConv.favorite);
      if (hideEmpty && !conv.lastMessage && !conv.messageCount && !conv.messages?.length) return false;
      if (contextStatusFilter !== 'all' && getConversationContextStatus(conv) !== contextStatusFilter) return false;
      if (selectedLabelIds.length > 0) {
        const labelIds = getConversationLabelIds(conv);
        if (!selectedLabelIds.every((id) => labelIds.includes(id))) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        // Sorts on the RAW value deliberately - this comparator renders
        // nothing, so it leaks nothing, and masked numbers all share the same
        // leading bullets, which would collapse the ordering into "grouped by
        // last 4 digits". Sorting stays stable and meaningful while the
        // rendered labels above are masked.
        return (a.contact?.name || a.contact?.phone || '').localeCompare(b.contact?.name || b.contact?.phone || '');
      }
      if (sortBy === 'message_count') {
        return (b.messageCount || b.messages?.length || 0) - (a.messageCount || a.messages?.length || 0);
      }
      const aTime = new Date(getConversationLastMessageTimestamp(a) || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(getConversationLastMessageTimestamp(b) || b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [conversations, contextStatusFilter, filterTab, hideEmpty, selectedLabelIds, sortBy]);

  const unreadCount = conversations.filter((c) => c.unreadCount && c.unreadCount > 0).length;

  // ── Label toggle helper ────────────────────────────────────────────────
  const toggleLabel = useCallback(
    (id: string) => {
      if (!onLabelFilterChange) return;
      onLabelFilterChange(
        selectedLabelIds.includes(id)
          ? selectedLabelIds.filter((x) => x !== id)
          : [...selectedLabelIds, id]
      );
    },
    [selectedLabelIds, onLabelFilterChange]
  );

  const templatePickerCount = groupTemplateSendTarget?.count ?? selectedChatIds.size;

  return (
    // IMPORTANT: `relative` here is what allows the absolute overlay to cover this column only
    <div className="h-full flex flex-col overflow-visible bg-background text-foreground dark:bg-[#161717] relative">
      {sidebarError && (
        <div className="mx-4 mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
          <div className="flex items-center justify-between gap-3">
            <span>{sidebarError.message}</span>
            <button type="button" className="underline underline-offset-2" onClick={() => setSidebarError(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h1 className="text-[22px] font-bold dark:text-white">WhatsApp</h1>
        <TooltipProvider delayDuration={100}>
          <div className="flex items-center gap-2 text-muted-foreground dark:text-white">

            {/* ── Broadcast Groups ── */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => {
                    setIsGroupsPanelOpen(true);
                    setSelectedGroupsPanelIds(new Set());
                  }}
                  aria-label="Broadcast groups"
                  title="Broadcast groups"
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[9999] bg-zinc-800 text-white border-0 text-[10px]">
                <p>Broadcast groups</p>
              </TooltipContent>
            </Tooltip>

            {/* ── Refresh ── onClick: handleRefresh (same as file 1) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-zinc-800 transition-colors"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh conversations"
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[9999] bg-zinc-800 text-white border-0 text-[10px]">
                <p>Refresh conversations</p>
              </TooltipContent>
            </Tooltip>

            {/* ── New Chat ── onClick: open rich overlay (same as file 1's setIsNewChatOpen) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => setIsNewChatOpen(true)}
                  aria-label="New Chat"
                >
                  <MessageSquarePlus className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[9999] bg-zinc-800 text-white border-0 text-[10px]">
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>

            {/* ── More Options ── */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-zinc-800 transition-colors"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[9999] bg-zinc-800 text-white border-0 text-[10px]">
                  <p>More options</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-white dark:bg-[#161717] border border-border dark:border-zinc-800 text-foreground dark:text-[#d1d7db] py-2 shadow-lg"
              >
                <DropdownMenuItem
                  className="hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4 focus:outline-none"
                  onClick={() => setIsGroupManagerOpen(true)}
                >
                  <Users className="w-4 h-4" /><span>Broadcast group</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4 focus:outline-none"
                  onClick={() => onOpenStarred?.()}
                >
                  <Star className="w-4 h-4" /><span>Starred messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4 focus:outline-none"
                  onClick={() => setIsSelectMode(true)}
                >
                  <CheckSquare className="w-4 h-4" /><span>Select chats</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4 focus:outline-none">
                  <ListChecks className="w-4 h-4" /><span>Mark all as read</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border dark:bg-zinc-800" />
                <DropdownMenuItem
                  className="hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white cursor-pointer py-2.5 px-4 flex items-center gap-4 focus:outline-none"
                  onClick={() => setShowMessageSettings(true)}
                >
                  <Clock className="w-4 h-4" /><span>Message settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </TooltipProvider>
      </div>

      {/* Search */}
      {!isGroupsPanelOpen && (
        <div className="px-4 pb-3 pt-1 relative z-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-[#a2a2a2]" />
            <Input
              placeholder="Search or start a new chat"
              className="pl-10 bg-[#f0f2f5] dark:bg-[#2e2f2f] border-0 rounded-full h-9 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-[#a2a2a2] focus-visible:ring-1 focus-visible:ring-transparent"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {/* Search results render inline in the main conversation list below
                (backend-filtered by name + phone). The old floating dropdown was
                removed: it duplicated the list, capped results at max-h-60, and
                overlapped the list because it only closed on select/clear. */}
          </div>
        </div>
      )}

      {/* Filter Chips (All / Unread) + Sort/Filter */}
      <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border dark:border-[#222d34]/80">
        {(['all', 'unread'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border',
              filterTab === tab
                ? 'bg-[#d9fdd3] text-[#008069] border-border dark:bg-[#1a342a] dark:text-[#00a884] dark:border-[#00a884]/40'
                : 'bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-zinc-800'
            )}
          >
            {tab === 'unread' ? `Unread${unreadCount > 0 ? ` ${unreadCount}` : ''}` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}

        {/* ── Hide Empty button - same pill style ── */}
        {onHideEmptyChange && (
          <button
            type="button"
            onClick={() => onHideEmptyChange(!hideEmpty)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border flex items-center gap-1',
              hideEmpty
                ? 'bg-[#d9fdd3] text-[#008069] border-border dark:bg-[#1a342a] dark:text-[#00a884] dark:border-[#00a884]/40'
                : 'bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-zinc-800'
            )}
          >
            {hideEmpty ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {hideEmpty ? 'Hiding empty' : 'Hide empty'}
          </button>
        )}

        {/* ── Labels filter - hidden for now (code kept, gated off for easy re-enable) ── */}
        {false && onLabelFilterChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border flex items-center gap-1',
                selectedLabelIds.length > 0
                  ? 'bg-[#d9fdd3] text-[#008069] border-border dark:bg-[#1a342a] dark:text-[#00a884] dark:border-[#00a884]/40'
                  : 'bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-zinc-800'
              )}>
                <Tag className="h-3.5 w-3.5" />
                {selectedLabelIds.length > 0 ? `${selectedLabelIds.length} label${selectedLabelIds.length === 1 ? '' : 's'}` : 'Labels'}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto bg-white dark:bg-[#161717] border border-border dark:border-zinc-800 shadow-lg">
              <DropdownMenuLabel className="flex items-center justify-between text-xs text-muted-foreground dark:text-[#a2a2a2]">
                <span>Filter by label</span>
                {selectedLabelIds.length > 0 && onLabelFilterChange && (
                  <button onClick={() => onLabelFilterChange?.([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border dark:bg-zinc-800" />
              {allLabels.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground focus:outline-none">No labels yet</DropdownMenuItem>
              ) : (
                allLabels.map((l) => (
                  <DropdownMenuCheckboxItem
                    key={l.id}
                    checked={selectedLabelIds.includes(l.id)}
                    onCheckedChange={() => toggleLabel(l.id)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer"
                  >
                    <Tag className="h-3.5 w-3.5 mr-2 shrink-0" fill={l.color} style={{ color: l.color }} />
                    <span className="truncate">{l.name}</span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* ── Stage (context status) dropdown ── */}
        {onContextStatusFilterChange && contextStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border flex items-center gap-1',
                contextStatusFilter && contextStatusFilter !== 'all'
                  ? 'bg-[#00a884] text-white border-transparent'
                  : 'bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-zinc-800'
              )}>
                <Filter className="h-3.5 w-3.5" />
                {contextStatusFilter && contextStatusFilter !== 'all' ? formatContextStatus(contextStatusFilter) : 'Stage'}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto bg-white dark:bg-[#161717] border border-border dark:border-zinc-800 shadow-lg text-foreground dark:text-[#d1d7db]">
              <DropdownMenuLabel className="flex items-center justify-between text-xs text-muted-foreground dark:text-[#a2a2a2]">
                <span>Filter by stage</span>
                {contextStatusFilter && contextStatusFilter !== 'all' && (
                  <button onClick={() => onContextStatusFilterChange('all')} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border dark:bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => onContextStatusFilterChange('all')}
                className={cn(
                  'text-xs cursor-pointer py-2 px-3 focus:outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white transition-colors',
                  (!contextStatusFilter || contextStatusFilter === 'all') && 'bg-[#e7fce3] text-[#008069] dark:bg-[#1a342a] dark:text-[#00a884] font-medium'
                )}
              >
                All stages
              </DropdownMenuItem>
              {contextStatuses.map(({ value, label, count }) => {
                const tagColor = WABA_STAGE_TAG_HEX[value.toLowerCase()] || WABA_STAGE_TAG_DEFAULT;
                return (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => onContextStatusFilterChange(value)}
                    className={cn(
                      'text-xs cursor-pointer flex items-center gap-2 py-2 px-3 focus:outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white transition-colors',
                      contextStatusFilter === value && 'bg-[#e7fce3] text-[#008069] dark:bg-[#1a342a] dark:text-[#00a884] font-medium'
                    )}
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0" fill={tagColor} style={{ color: tagColor }} />
                    <span className="truncate flex-1">{label}</span>
                    {count > 0 && <span className="text-[10px] opacity-70">{count}</span>}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* ── Sort button - at the end ── */}
        {onSortByChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'px-3 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors border flex items-center gap-1',
                'bg-muted/50 dark:bg-[#161717] dark:border-[#2e2f2f] text-muted-foreground dark:text-[#a2a2a2] hover:bg-muted dark:hover:bg-zinc-800'
              )}>
                <ArrowDownUp className="h-3.5 w-3.5" />
                {sortBy === 'message_count' ? 'Size' : sortBy === 'name' ? 'Name' : 'Date'}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-[#161717] border border-border dark:border-zinc-800 shadow-lg text-foreground dark:text-[#d1d7db]">
              <DropdownMenuLabel className="text-xs text-muted-foreground dark:text-[#a2a2a2]">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border dark:bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => onSortByChange('date')}
                className={cn(
                  'text-xs cursor-pointer py-2 px-3 focus:outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white transition-colors',
                  sortBy === 'date' && 'bg-[#e7fce3] text-[#008069] dark:bg-[#1a342a] dark:text-[#00a884] font-medium'
                )}
              >
                <Calendar className="h-3.5 w-3.5 mr-2" /> Date (most recent)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSortByChange('message_count')}
                className={cn(
                  'text-xs cursor-pointer py-2 px-3 focus:outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white transition-colors',
                  sortBy === 'message_count' && 'bg-[#e7fce3] text-[#008069] dark:bg-[#1a342a] dark:text-[#00a884] font-medium'
                )}
              >
                <Hash className="h-3.5 w-3.5 mr-2" /> Size (most messages)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSortByChange('name')}
                className={cn(
                  'text-xs cursor-pointer py-2 px-3 focus:outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 focus:text-foreground dark:focus:text-white transition-colors',
                  sortBy === 'name' && 'bg-[#e7fce3] text-[#008069] dark:bg-[#1a342a] dark:text-[#00a884] font-medium'
                )}
              >
                <ArrowDownUp className="h-3.5 w-3.5 mr-2" /> Name (A → Z)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* ── New List + button (keep at the end) ── */}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="px-3 py-1.5 rounded-full bg-muted/50 dark:bg-[#161717] text-muted-foreground dark:text-[#a2a2a2] text-[14px] font-normal flex items-center justify-center hover:bg-muted dark:hover:bg-zinc-800 shrink-0 border dark:border-[#2e2f2f]" aria-label="Create list">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-800 text-white border-0 text-[10px]"><p>New List</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ── Active context status filter indicator ────────────────────────── */}
      {contextStatusFilter && contextStatusFilter !== 'all' && (
        <div className="px-3 py-1.5 border-b border-border dark:border-[#222d34]/80 bg-[#0a332c]/20 dark:bg-[#1a342a]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-[#00a884]" />
            <span className="text-muted-foreground dark:text-[#a2a2a2]">Filtered:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00a884] text-white">
              {formatContextStatus(contextStatusFilter)}
            </span>
          </div>
          <button
            onClick={() => onContextStatusFilterChange?.('all')}
            className="text-[#00a884] hover:text-[#008f6f] text-xs flex items-center gap-0.5 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}

      {/* ── Chat List ─────────────────────────────────────────────────────── */}
      {/* ── Select mode bar ── */}
      {isSelectMode && (
        <div className="px-3 py-2 border-b border-border dark:border-[#222d34]/80 bg-[#0a332c]/10 dark:bg-[#1a342a]/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#00a884]">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedChatIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allIds = filteredConversations.map(c => c.id);
                const allSelected = allIds.every(id => selectedChatIds.has(id));
                if (allSelected) {
                  setSelectedChatIds(new Set());
                } else {
                  setSelectedChatIds(new Set(allIds));
                }
              }}
              className="text-[10px] text-[#00a884] hover:text-[#008f6f] font-medium transition-colors"
            >
              {filteredConversations.every(c => selectedChatIds.has(c.id)) ? 'Deselect all' : 'Select all'}
            </button>
            <button
              onClick={exitSelectMode}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {isSelectMode && (
        <TooltipProvider>
          <div className="p-2 border-b border-border dark:border-[#222d34]/80 bg-[#0a332c]/5 dark:bg-[#1a342a]/10 flex items-center gap-2">
            <button
              onClick={() =>
                selectedChatIds.size === filteredConversations.length
                  ? setSelectedChatIds(new Set())
                  : setSelectedChatIds(new Set(filteredConversations.map((c) => c.id)))
              }
              className="flex items-center gap-1.5 px-1"
            >
              {selectedChatIds.size === filteredConversations.length && selectedChatIds.size > 0 ? (
                <CheckSquare className="h-4 w-4 text-[#00a884]" />
              ) : selectedChatIds.size > 0 ? (
                <MinusCircle className="h-4 w-4 text-[#00a884]" />
              ) : (
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <span className="text-xs text-muted-foreground dark:text-[#a2a2a2] flex-1">
              {selectedChatIds.size} selected
            </span>

            <AddToGroupDropdown
              selectedIds={selectedChatIds}
              onDone={exitSelectMode}
              channel={backendChannel}
              variant="whatsapp"
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Send Template"
                  onClick={() => {
                    setGroupTemplateSendTarget(null);
                    setIsTemplatePickerOpen(true);
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider bg-zinc-800 text-white border-0">
                Send Template
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Resolve"
                  onClick={async () => {
                    const channelParam = backendChannel ? `?channel=${backendChannel}` : '?channel=waba';
                    try {
                      const res = await fetchWithTenant(
                        `/api/whatsapp-conversations/conversations/bulk${channelParam}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'resolve', conversation_ids: Array.from(selectedChatIds) }),
                        }
                      );
                      if (!res.ok) {
                        throw new Error(await getApiErrorMessage(res, 'Failed to resolve selected conversations'));
                      }
                      onRefresh?.();
                    } catch (err: unknown) {
                      setSidebarError({ message: getErrorMessage(err, 'Bulk resolve failed') });
                    }
                    exitSelectMode();
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider bg-zinc-800 text-white border-0">
                Resolve
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    const channelParam = backendChannel ? `?channel=${backendChannel}` : '?channel=waba';
                    try {
                      const res = await fetchWithTenant(
                        `/api/whatsapp-conversations/conversations/bulk${channelParam}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'delete', conversation_ids: Array.from(selectedChatIds) }),
                        }
                      );
                      if (!res.ok) {
                        throw new Error(await getApiErrorMessage(res, 'Failed to delete selected conversations'));
                      }
                      onRefresh?.();
                    } catch (err: unknown) {
                      setSidebarError({ message: getErrorMessage(err, 'Bulk delete failed') });
                    }
                    exitSelectMode();
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider bg-zinc-800 text-white border-0">
                Delete
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
      <div
        className="flex-1 overflow-y-auto mt-0 relative z-0"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (hasMore && !isLoadingMore && el.scrollHeight - el.scrollTop - el.clientHeight < 320) {
            loadMore?.();
          }
        }}
      >
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
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold">Add to Favourites</h2>
            <p className="text-[15px] text-muted-foreground dark:text-[#8696a0] mt-2">
              Make it easy to find the people and groups that matter most across WhatsApp.
            </p>
            <button className="mt-4 text-[#00a884] text-[15px] font-medium hover:underline">Add to Favourites</button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground dark:text-[#8696a0]">
            No chats found for this filter.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            const initials = conv.contact?.name?.substring(0, 2).toUpperCase();
            const convLastMessage = (conv as Conversation & { lastMessage?: Message }).lastMessage;
            let lastMsg = convLastMessage || conv.messages?.[conv.messages.length - 1];
            if (isSelected && activeLastMsg) {
              lastMsg = activeLastMsg;
            }
            const rawTimestamp = lastMsg?.timestamp || (lastMsg as Message & { created_at?: string })?.created_at;
            const time = formatWhatsAppSidebarTimestamp(rawTimestamp);

            const avatarColor = getAvatarColor(conv.contact?.phone || conv.contact?.name || conv.id);

            return (
              <div
                key={conv.id}
                onClick={() => isSelectMode ? toggleSelectChat(conv.id) : onSelectConversation(conv.id)}
                className={cn(
                  'flex items-center gap-4 py-2 px-4 mx-2 cursor-pointer transition-colors rounded-xl',
                  isSelectMode && selectedChatIds.has(conv.id)
                    ? 'bg-emerald-50 dark:bg-emerald-950/20'
                    : isSelected ? 'bg-[#d9fdd3] dark:bg-[#2e2f2f]' : 'hover:bg-zinc-100 dark:hover:bg-[#2e2f2f]/50'
                )}
              >
                {isSelectMode && (
                  <div className={cn(
                    'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    selectedChatIds.has(conv.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                  )}>
                    {selectedChatIds.has(conv.id) && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={conv.contact?.avatar} />
                  <AvatarFallback 
                    style={{
                      '--av-bg-light': `color-mix(in srgb, ${avatarColor} 20%, white)`,
                      '--av-text-light': `color-mix(in srgb, ${avatarColor} 70%, black)`,
                      '--av-bg-dark': `color-mix(in srgb, ${avatarColor} 30%, black)`,
                      '--av-text-dark': `color-mix(in srgb, ${avatarColor} 80%, white)`,
                    } as React.CSSProperties}
                    className="bg-[var(--av-bg-light)] text-[var(--av-text-light)] dark:bg-[var(--av-bg-dark)] dark:text-[var(--av-text-dark)]"
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex justify-between items-center mb-0.5 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-[16px] truncate text-foreground dark:text-white">{conv.contact?.name}</span>
                      {/* Conversation stage (context_status) as a small WhatsApp-style colour
                          tag - colour only; the stage name shows on hover, not as repeated text. */}
                      {(() => {
                        const stage = getConversationContextStatus(conv);
                        if (!stage) return null;
                        const tagColor = WABA_STAGE_TAG_HEX[stage.toLowerCase()] || WABA_STAGE_TAG_DEFAULT;
                        return (
                          <span title={formatContextStatus(stage)} aria-label={formatContextStatus(stage)} className="inline-flex shrink-0">
                            <Tag className="h-3.5 w-3.5" fill={tagColor} style={{ color: tagColor }} />
                          </span>
                        );
                      })()}
                    </div>
                    <span className={cn('text-xs shrink-0', conv.unreadCount ? 'text-[#25D366] dark:text-[#00a884] font-medium' : 'text-muted-foreground dark:text-[#a2a2a2]')}>
                      {time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                      {(lastMsg?.isOutgoing || lastMsg?.role === 'assistant' || lastMsg?.role === 'human_agent') && !conv.unreadCount && (
                        <MessageTicks status={lastMsg?.status || (lastMsg as (Message & { message_status?: string }) | undefined)?.message_status} />
                      )}
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
            );
          })
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Rich New Chat Overlay - mirrors ConversationSidebar's isNewChatOpen panel
          absolute inset-0 z-30 so it covers only this sidebar column
      ════════════════════════════════════════════════════════════════════ */}
      {isNewChatOpen && (
        <div className="absolute inset-0 z-30 bg-card dark:bg-[#111b21] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-[#222d34] bg-card dark:bg-[#161717]">
            <button
              className="h-8 w-8 rounded-full hover:bg-muted flex-shrink-0 flex items-center justify-center transition-colors"
              onClick={() => {
                setIsNewChatOpen(false);
                setNewChatSearch('');
                setSelectedNewChatIds(new Set());
                setSelectedNewChatGroupIds(new Set());
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold flex-1">New chat</span>
            {(selectedNewChatIds.size > 0 || selectedNewChatGroupIds.size > 0) && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                {selectedNewChatIds.size + selectedNewChatGroupIds.size} selected
              </span>
            )}
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border dark:border-[#222d34]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or number"
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                className="pl-9 h-9 bg-secondary/50 dark:bg-[#2e2f2f] rounded-full border-0"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col border-b border-border dark:border-[#222d34]">
            {/* Import Leads */}
            <button
              onClick={() => {
                setIsNewChatOpen(false);
                setNewChatSearch('');
                setIsImportDialogOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted dark:hover:bg-[#202c33] transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium">Import Leads</span>
            </button>

            {/* New Broadcast */}
            <button
              onClick={() => {
                setIsNewChatOpen(false);
                setNewChatSearch('');
                setIsGroupManagerOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted dark:hover:bg-[#202c33] transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium">New Broadcast</span>
            </button>
          </div>

          {/* Scrollable Groups & Contacts list */}
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const searchLower = newChatSearch.toLowerCase();

              const filteredGroups = searchLower
                ? newChatGroups.filter((g) => g.name.toLowerCase().includes(searchLower))
                : newChatGroups;

              const contactSource = newChatContacts;
              const filteredContacts = searchLower
                ? contactSource.filter((c) =>
                  (c.contact?.name || '').toLowerCase().includes(searchLower) ||
                  (c.contact?.phone || '').includes(searchLower)
                )
                : contactSource;
              const contactsLoadedAll = newChatContactsTotal > 0 && newChatContacts.length >= newChatContactsTotal;
              const noResults = filteredGroups.length === 0 && filteredContacts.length === 0 && !newChatContactsLoading;

              return (
                <>
                  {/* ── Groups Section ── */}
                  {filteredGroups.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <button
                          onClick={() => setGroupsSectionExpanded(v => !v)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          {groupsSectionExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          Groups
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const allGroupIds = filteredGroups.map(g => g.id);
                              const allSelected = allGroupIds.every(id => selectedNewChatGroupIds.has(id));
                              if (allSelected) {
                                setSelectedNewChatGroupIds(prev => {
                                  const next = new Set(prev);
                                  allGroupIds.forEach(id => next.delete(id));
                                  return next;
                                });
                              } else {
                                setSelectedNewChatGroupIds(prev => new Set([...prev, ...allGroupIds]));
                              }
                            }}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          >
                            {filteredGroups.every(g => selectedNewChatGroupIds.has(g.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedNewChatGroupIds.size}/{filteredGroups.length}
                          </span>
                        </div>
                      </div>

                      {groupsSectionExpanded && filteredGroups.map((group) => {
                        const isChecked = selectedNewChatGroupIds.has(group.id);
                        return (
                          <div
                            key={group.id}
                            className="group/item relative px-4 py-3 hover:bg-muted/60 dark:hover:bg-[#202c33]/60 transition-colors rounded-lg mx-2 my-1"
                          >
                            <div className="flex items-center gap-3 w-full">
                              {/* Checkbox */}
                              <button
                                onClick={() => {
                                  setSelectedNewChatGroupIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(group.id)) next.delete(group.id);
                                    else next.add(group.id);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  isChecked
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                                )}
                              >
                                {isChecked && (
                                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </button>
                              {/* Group avatar */}
                              <div
                                className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: group.color || '#64748b' }}
                              >
                                <Users className="h-6 w-6 text-white" />
                              </div>
                              {/* Group info */}
                              <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                                <span className="text-sm font-semibold truncate w-full text-left">{group.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {group.member_count ?? group.conversation_count ?? 0} member{(group.member_count ?? group.conversation_count ?? 0) !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {/* Hover action buttons */}
                              <TooltipProvider>
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => {
                                          handleGroupTemplateSend(group.id, group.member_count ?? group.conversation_count ?? 0);
                                          setIsNewChatOpen(false);
                                          setNewChatSearch('');
                                          setSelectedNewChatIds(new Set());
                                          setSelectedNewChatGroupIds(new Set());
                                        }}
                                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-all hover:shadow-sm"
                                      >
                                        <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">Send template</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Delete "${group.name}"?`)) return;
                                          try {
                                            const channelParam = backendChannel === 'personal' ? '?channel=personal' : '';
                                            const res = await fetchWithTenant(
                                              `/api/whatsapp-conversations/chat-groups/${group.id}${channelParam}`,
                                              { method: 'DELETE' }
                                            );
                                            if (res.ok) {
                                              setNewChatGroupsLoading(true);
                                              fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${backendChannel || 'waba'}`)
                                                .then((r) => r.json())
                                                .then((data) => { if (Array.isArray(data.data)) setNewChatGroups(data.data); })
                                                .catch(() => { })
                                                .finally(() => setNewChatGroupsLoading(false));
                                            } else {
                                              setSidebarError({ message: await getApiErrorMessage(res, 'Failed to delete group') });
                                            }
                                          } catch (err: unknown) {
                                            setSidebarError({ message: getErrorMessage(err, 'Error deleting group') });
                                          }
                                        }}
                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all hover:shadow-sm"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">Delete group</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* ── Contacts Section ── */}
                  {filteredContacts.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <button
                          onClick={() => setContactsSectionExpanded(v => !v)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          {contactsSectionExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          Contacts
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {newChatContactsTotal > 0 ? newChatContactsTotal : filteredContacts.length}
                          {!contactsLoadedAll && newChatContactsTotal > 0 && (
                            <span className="text-amber-500 ml-1">({newChatContacts.length} loaded…)</span>
                          )}
                        </span>
                      </div>

                      {contactsSectionExpanded && filteredContacts.map((conv) => {
                        const contactAvatarColor = getAvatarColor(conv.contact?.phone || conv.contact?.name || conv.id);
                        return (
                          <button
                            key={conv.id}
                            onClick={() => openChatFromNewContact(conv)}
                            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-muted dark:hover:bg-[#202c33] transition-colors"
                          >
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={conv.contact?.avatar} />
                              <AvatarFallback 
                                style={{
                                  '--av-bg-light': `color-mix(in srgb, ${contactAvatarColor} 20%, white)`,
                                  '--av-text-light': `color-mix(in srgb, ${contactAvatarColor} 70%, black)`,
                                  '--av-bg-dark': `color-mix(in srgb, ${contactAvatarColor} 30%, black)`,
                                  '--av-text-dark': `color-mix(in srgb, ${contactAvatarColor} 80%, white)`,
                                } as React.CSSProperties}
                                className="bg-[var(--av-bg-light)] text-[var(--av-text-light)] dark:bg-[var(--av-bg-dark)] dark:text-[var(--av-text-dark)]"
                              >
                                {(conv.contact?.name || '?')[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start overflow-hidden">
                              <span className="text-sm font-medium truncate w-full text-left">
                                {displayNameOrPhone(conv.contact?.name, conv.contact?.phone)}
                              </span>
                              {conv.contact?.phone && conv.contact?.name && (
                                <span className="text-xs text-muted-foreground truncate w-full text-left">
                                  {displayPhone(conv.contact.phone)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* No results */}
                  {noResults && newChatSearch && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No contacts or groups found</p>
                    </div>
                  )}

                  {newChatGroupsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {newChatContactsLoading && (
                    <p className="text-[10px] text-center text-muted-foreground py-2">Loading all contacts…</p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Bottom action bar - visible when items are selected */}
          {(selectedNewChatIds.size > 0 || selectedNewChatGroupIds.size > 0) && (
            <div className="px-4 py-3 border-t border-border dark:border-[#222d34] bg-card dark:bg-[#161717] flex items-center gap-2">
              <button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9 rounded-md font-medium transition-colors"
                onClick={() => {
                  if (selectedNewChatGroupIds.size > 0) {
                    const selectedGroups = newChatGroups.filter(g => selectedNewChatGroupIds.has(g.id));
                    setIsNewChatOpen(false);
                    setNewChatSearch('');
                    setSelectedNewChatIds(new Set());
                    setSelectedNewChatGroupIds(new Set());
                    handleGroupsTemplateSend(selectedGroups);
                    return;
                  }
                  if (selectedNewChatIds.size === 1) {
                    const id = Array.from(selectedNewChatIds)[0];
                    setIsNewChatOpen(false);
                    setNewChatSearch('');
                    setSelectedNewChatIds(new Set());
                    setSelectedNewChatGroupIds(new Set());
                    onSelectConversation(id);
                    return;
                  }
                  const ids = Array.from(selectedNewChatIds);
                  setIsNewChatOpen(false);
                  setNewChatSearch('');
                  setSelectedNewChatIds(new Set());
                  setSelectedNewChatGroupIds(new Set());
                  setCreateGroupIds(ids);
                  setIsCreateGroupOpen(true);
                  onShowCreateGroupModal?.(ids);
                }}
              >
                {selectedNewChatGroupIds.size > 0 ? 'Send Broadcast' : selectedNewChatIds.size > 1 ? 'Create Group' : 'Open Chat'}
              </button>
              <button
                className="border border-border text-xs h-9 px-3 rounded-md hover:bg-muted transition-colors"
                onClick={() => {
                  setSelectedNewChatIds(new Set());
                  setSelectedNewChatGroupIds(new Set());
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

            {/* ════════════════════════════════════════════════════════════════════
          Broadcast Groups Panel
          Opens when the Users icon in the header is clicked.
          Same absolute overlay pattern as the New Chat panel.
      ════════════════════════════════════════════════════════════════════ */}
      {isGroupsPanelOpen && (
        <div className="absolute inset-0 z-30 bg-white dark:bg-zinc-900 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <button
              type="button"
              aria-label="Back"
              title="Back"
              className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex-shrink-0 flex items-center justify-center transition-colors"
              onClick={() => {
                setIsGroupsPanelOpen(false);
                setSelectedGroupsPanelIds(new Set());
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-1">Broadcast Groups</span>
            {backendChannel === 'personal' && (
              <button
                type="button"
                onClick={() => setIsScheduledListOpen(true)}
                title="View scheduled broadcasts"
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                Scheduled
              </button>
            )}
            {backendChannel === 'personal' && (
              <button
                type="button"
                onClick={handleSyncWaGroups}
                disabled={isSyncingWaGroups}
                title="Import your WhatsApp groups from the connected number"
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isSyncingWaGroups && 'animate-spin')} />
                {isSyncingWaGroups ? 'Syncing…' : 'Sync WA Groups'}
              </button>
            )}
            {selectedGroupsPanelIds.size > 0 && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                {selectedGroupsPanelIds.size} selected
              </span>
            )}
            {selectedGroupsPanelIds.size > 0 && (
              <button
                type="button"
                onClick={handleSaveBroadcastList}
                disabled={savingBroadcastList}
                title="Save the selected groups as a reusable broadcast group"
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
              >
                {savingBroadcastList ? 'Saving…' : 'Save as group'}
              </button>
            )}
          </div>
          {groupBroadcastResult && (
            <p className="px-4 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              {groupBroadcastResult}
            </p>
          )}

          {/* Group list */}
          <div className="flex-1 overflow-y-auto">
            {newChatGroupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
              </div>
            ) : newChatGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
                <Users className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No broadcast groups yet</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsGroupsPanelOpen(false);
                    setIsGroupManagerOpen(true);
                  }}
                  className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                >
                  Create a group
                </button>
              </div>
            ) : (
              <>
                {/* Search + type filter */}
                <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-zinc-900">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <input
                      value={groupsPanelSearch}
                      onChange={(e) => setGroupsPanelSearch(e.target.value)}
                      placeholder="Search groups…"
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                    />
                  </div>
                  <select
                    value={groupTypeFilter}
                    onChange={(e) => setGroupTypeFilter(e.target.value as 'both' | 'whatsapp' | 'broadcast')}
                    title="Filter by group type"
                    className="text-xs rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="both">All groups</option>
                    <option value="whatsapp">Chat groups</option>
                    <option value="broadcast">Broadcast groups</option>
                  </select>
                </div>
                {/* Select-all row - operates on the currently-filtered groups */}
                <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Groups
                  </span>
                  <div className="flex items-center gap-2">
                    {panelSelectionMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredPanelGroups.map(g => g.id);
                            const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedGroupsPanelIds.has(id));
                            setSelectedGroupsPanelIds(prev => {
                              const next = new Set(prev);
                              if (allFilteredSelected) filteredIds.forEach(id => next.delete(id));
                              else filteredIds.forEach(id => next.add(id));
                              return next;
                            });
                          }}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                        >
                          {filteredPanelGroups.length > 0 && filteredPanelGroups.every(g => selectedGroupsPanelIds.has(g.id)) ? 'Deselect all' : 'Select all'}
                        </button>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {selectedGroupsPanelIds.size} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => { setPanelSelectionMode(false); setSelectedGroupsPanelIds(new Set()); }}
                          className="text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors"
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPanelSelectionMode(true)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
 
                {/* Group rows */}
                {filteredPanelGroups.map((group) => {
                  const isChecked = selectedGroupsPanelIds.has(group.id);
                  const isBroadcastList = !!(group.metadata as { is_broadcast_list?: boolean } | undefined)?.is_broadcast_list;
                  const memberGroupCount = Array.isArray((group.metadata as { member_group_ids?: unknown[] } | undefined)?.member_group_ids)
                    ? (group.metadata as { member_group_ids?: unknown[] }).member_group_ids!.length
                    : 0;
                  // WA groups carry the real participant count in metadata; manual groups
                  // expose member_count from the backend. (conversation_count is unset.)
                  const memberCount = (group.metadata as { participant_count?: number } | undefined)?.participant_count
                    ?? group.member_count
                    ?? group.conversation_count
                    ?? 0;
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        // A saved set: tapping loads its member groups for broadcast.
                        if (isBroadcastList) { handleSelectBroadcastList(group); return; }
                        if (panelSelectionMode) {
                          setSelectedGroupsPanelIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(group.id)) next.delete(group.id);
                            else next.add(group.id);
                            return next;
                          });
                        } else {
                          openGroupConversation(group);
                        }
                      }}
                      onDoubleClick={() => {
                        if (isBroadcastList) return;
                        setPanelSelectionMode(true);
                        setSelectedGroupsPanelIds((prev) => new Set(prev).add(group.id));
                      }}
                      title={
                        isBroadcastList
                          ? `Load ${memberGroupCount} group${memberGroupCount !== 1 ? 's' : ''} from "${group.name}"`
                          : panelSelectionMode ? undefined : `Open ${group.name} - double-click to multi-select`
                      }
                      className="group/item relative px-4 py-3 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer select-none border-b border-zinc-100 dark:border-zinc-800/40"
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* Checkbox - only in multi-select mode, and not for saved sets */}
                        {panelSelectionMode && !isBroadcastList && (
                        <button
                          type="button"
                          aria-label={isChecked ? `Deselect ${group.name}` : `Select ${group.name}`}
                          title={isChecked ? `Deselect ${group.name}` : `Select ${group.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroupsPanelIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(group.id)) next.delete(group.id);
                              else next.add(group.id);
                              return next;
                            });
                          }}
                          className={cn(
                            'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
                          )}
                        >
                          {isChecked && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        )}

                        {/* Group avatar */}
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: group.color || '#64748b' }}
                        >
                          <Users className="h-6 w-6 text-white" aria-hidden="true" />
                        </div>
 
                        {/* Group info */}
                        <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate w-full">{group.name}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {isBroadcastList
                              ? `${memberGroupCount} group${memberGroupCount !== 1 ? 's' : ''}`
                              : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
 
                        {/* Hover actions */}
                        <TooltipProvider>
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Group info for ${group.name}`}
                                  title={`Group info for ${group.name}`}
                                  onClick={(e) => { e.stopPropagation(); setInfoGroup(group); }}
                                  className="p-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 rounded-md transition-all hover:shadow-sm"
                                >
                                  <Info className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs bg-zinc-800 text-white border-0">Group info</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Send template to ${group.name}`}
                                  title={`Send template to ${group.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGroupTemplateSend(group.id, group.conversation_count);
                                    setIsGroupsPanelOpen(false);
                                    setSelectedGroupsPanelIds(new Set());
                                  }}
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-all hover:shadow-sm"
                                >
                                  <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs bg-zinc-800 text-white border-0">Send template</TooltipContent>
                            </Tooltip>
 
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Delete ${group.name}`}
                                  title={`Delete ${group.name}`}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`Delete "${group.name}"?`)) return;
                                    try {
                                      const channelParam = backendChannel === 'personal' ? '?channel=personal' : '';
                                      const res = await fetchWithTenant(
                                        `/api/whatsapp-conversations/chat-groups/${group.id}${channelParam}`,
                                        { method: 'DELETE' }
                                      );
                                      if (res.ok) {
                                        setNewChatGroupsLoading(true);
                                        fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${backendChannel || 'waba'}`)
                                          .then((r) => r.json())
                                          .then((data) => { if (Array.isArray(data.data)) setNewChatGroups(data.data); })
                                          .catch(() => {})
                                          .finally(() => setNewChatGroupsLoading(false));
                                      } else {
                                        setSidebarError({ message: await getApiErrorMessage(res, 'Failed to delete group') });
                                      }
                                    } catch (err: unknown) {
                                      setSidebarError({ message: getErrorMessage(err, 'Error deleting group') });
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-all hover:shadow-sm"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs bg-zinc-800 text-white border-0">Delete group</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
 
          {/* Bottom action bar - compose a rich message + post into the selected group chats */}
          {selectedGroupsPanelIds.size > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
              <div className="px-4 pt-2 flex items-center gap-2">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex-1">
                  {selectedGroupsPanelIds.size} group{selectedGroupsPanelIds.size === 1 ? '' : 's'} selected
                </span>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shrink-0">
                  Batch
                  <input
                    type="number"
                    min={5}
                    max={10}
                    value={groupBroadcastBatchSize}
                    onChange={(e) => setGroupBroadcastBatchSize(Math.max(5, Math.min(10, parseInt(e.target.value) || 5)))}
                    className="w-12 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                  />
                </label>
                <button
                  type="button"
                  className="flex items-center gap-1 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[11px] h-7 px-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  onClick={() => setScheduleGroupIds(Array.from(selectedGroupsPanelIds))}
                  title="Schedule this broadcast for a later time"
                >
                  <Clock className="h-3 w-3" /> Schedule
                </button>
                <button
                  type="button"
                  className="border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] h-7 px-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => setSelectedGroupsPanelIds(new Set())}
                >
                  Clear
                </button>
              </div>
              <p className="px-4 pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                {groupBroadcastSending
                  ? 'Sending…'
                  : 'Compose below (text, photo, document, poll…) - posts into each selected group chat · throttled · max 250/day'}
              </p>
              {groupBroadcastResult && (
                <p className="px-4 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400">{groupBroadcastResult}</p>
              )}
              {/* Full rich composer - its attachment menu / modals produce a payload sent to every selected group */}
              <MessageComposer
                channel={'whatsapp' as Channel}
                backendChannel="personal"
                disabled={groupBroadcastSending}
                onSendMessage={handleGroupRichBroadcast}
                onSendTemplate={handleGroupTemplateBroadcast}
                broadcastTargetCount={selectedGroupsPanelIds.size}
              />
            </div>
          )}
        </div>
      )}

      {/* Schedule a broadcast (message or template) for the selected groups */}
      {scheduleGroupIds && (
        <ScheduleBroadcastModal
          open={!!scheduleGroupIds}
          onClose={() => setScheduleGroupIds(null)}
          groupIds={scheduleGroupIds}
          channel={(backendChannel as 'personal' | 'waba') || 'personal'}
        />
      )}
      <ScheduledBroadcastsModal
        open={isScheduledListOpen}
        onClose={() => setIsScheduledListOpen(false)}
        channel={(backendChannel as 'personal' | 'waba') || 'personal'}
      />

      <GroupInfoModal
        open={!!infoGroup}
        onClose={() => setInfoGroup(null)}
        group={infoGroup}
        allGroups={newChatGroups}
        channel={(backendChannel as 'personal' | 'waba') || 'personal'}
        onChanged={() => {
          // Refresh the group list so counts reflect removals.
          fetchWithTenant(`/api/whatsapp-conversations/chat-groups?channel=${backendChannel || 'personal'}`)
            .then((r) => r.json())
            .then((data) => { if (Array.isArray(data.data)) setNewChatGroups(data.data); })
            .catch(() => {});
        }}
      />

      {/* ── Chat Group Manager Dialog ───────────────────────────────────── */}
      <ChatGroupManager
        open={isGroupManagerOpen}
        onOpenChange={setIsGroupManagerOpen}
        onSendTemplateToGroup={handleGroupTemplateSend}
        onSendTemplateToGroups={handleGroupsTemplateSend}
        onSelectGroup={(group) => {
          setIsGroupManagerOpen(false);
          handleGroupTemplateSend(group.id, group.conversation_count);
        }}
        channel={backendChannel}
        variant="whatsapp"
      />

      {/* ── Message Settings Dialog (reply delay + inbound debounce) ─────── */}
      <MessageSettings
        open={showMessageSettings}
        onOpenChange={setShowMessageSettings}
        showTrigger={false}
      />

     {/* ── Template Picker Dialog ──────────────────────────────────────── */}
      <TemplatePicker
        open={isTemplatePickerOpen}
        onOpenChange={(open) => {
          setIsTemplatePickerOpen(open);
          if (!open) setGroupTemplateSendTarget(null);
        }}
        selectedCount={templatePickerCount}
        onSend={handleTemplateSend}
        sending={templateSending}
        sendProgress={templateSendProgress}
        channel={backendChannel ?? 'waba'}
        isBulkSend={!!groupTemplateSendTarget}
        variant="whatsapp"
      />

      {/* ── Import Leads Dialog ─────────────────────────────────────────── */}
      <ImportLeadsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        channel={backendChannel}
        onImportComplete={() => {
          onRefresh?.();
          setImportRefreshTrigger((prev) => prev + 1);
        }}
        variant="whatsapp"
      />

      <CreateBroadcastGroupModal
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        selectedIds={createGroupIds}
        channel={backendChannel}
        onSuccess={() => {
          onRefresh?.();
          setCreateGroupIds([]);
        }}
      />

      {/* ── Broadcast schedule summary toast ───────────────────────────── */}
      {sendSummary && sendSummary.queued > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-card border border-border shadow-xl rounded-xl px-4 py-3 max-w-sm w-full">
          <div className="text-green-500 mt-0.5">✓</div>
          <div className="flex-1 text-sm">
            <p className="font-semibold">Broadcast started</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Sent <strong>{sendSummary.sent}</strong> today.{' '}
              <strong>{sendSummary.queued}</strong> remaining scheduled across{' '}
              <strong>{sendSummary.scheduledDays}</strong> day{sendSummary.scheduledDays !== 1 ? 's' : ''} - continues at 9:00 AM daily.
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground text-xs mt-0.5" onClick={() => setSendSummary(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

const DEFAULT_CONTEXT_STATUSES: ContextStatusOption[] = [
  { value: 'greeting', label: 'Greeting', count: 0 },
  { value: 'info_gathering', label: 'Info Gathering', count: 0 },
  { value: 'booking_in_progress', label: 'Booking In Progress', count: 0 },
  { value: 'booking_completed', label: 'Booking Completed', count: 0 },
  { value: 'cancelled', label: 'Cancelled', count: 0 },
  { value: 'human', label: 'Human', count: 0 },
  { value: 'onboarding_greeting', label: 'Onboarding Greeting', count: 0 },
  { value: 'onboarding_profile', label: 'Onboarding Profile', count: 0 },
  { value: 'icp_discovery', label: 'ICP Discovery', count: 0 },
  { value: 'onboarding_complete', label: 'Onboarding Complete', count: 0 },
  { value: 'match_suggested', label: 'Match Suggested', count: 0 },
  { value: 'coordination_a_availability', label: 'Coordination Availability', count: 0 },
  { value: 'idle', label: 'Idle', count: 0 },
];

export function WABusinessView({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  backendChannel = 'waba',
}: {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  /** Which WhatsApp backend this rich view drives. Defaults to 'waba' so the
   *  WhatsApp Business tab is byte-for-byte unchanged; the Personal WA tab
   *  passes 'personal' to reuse this UI against LAD-WAPA-Comms. */
  backendChannel?: 'personal' | 'waba';
}) {
  // Drive every request (conversation list, actions, and all children) through
  // the selected channel. 'waba' → LAD-WABA-Comms, 'personal' → LAD-WAPA-Comms.
  // Do NOT hardcode this - doing so sends one tab's requests to the wrong service.
  const channel = backendChannel;
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const dividerDragRef = useRef<{ isDragging: boolean; startX: number; startWidth: number }>({ isDragging: false, startX: 0, startWidth: 380 });

  const {
    conversations,
    selectedConversation,
    selectedId,
    selectConversation,
    searchQuery,
    setSearchQuery,
    sendMessage,
    muteConversation,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useConversations({ channel });

  const [mockSelectedId, setMockSelectedId] = useState<string | null>(null);
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  // Groups currently multi-selected in the Broadcast Groups panel - when non-empty,
  // the right pane shows broadcast-group actions instead of the chat splash.
  const [multiSelectGroupIds, setMultiSelectGroupIds] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Lazily resolve WhatsApp DPs (avatars) for visible personal-WhatsApp conversations.
  // We POST the ids of any conversation still missing an avatar; the backend fetches
  // the DP from Baileys, caches the URL in wa_contacts.metadata (24h TTL) and returns
  // a { convId: url } map, which we merge straight into the cached conversation list so
  // every AvatarImage render site picks it up without prop-threading.
  const requestedAvatarsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (channel !== 'personal') return;
    const batch = conversations
      .filter((c) => !c.contact?.avatar && !requestedAvatarsRef.current.has(c.id))
      .map((c) => c.id)
      .slice(0, 50);
    if (batch.length === 0) return;
    batch.forEach((id) => requestedAvatarsRef.current.add(id));

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/avatars?channel=${channel}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_ids: batch }),
          }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        const avatars: Record<string, string | null> = data?.avatars || {};
        const resolved = Object.entries(avatars).filter(([, url]) => !!url);
        if (cancelled || resolved.length === 0) return;
        const urlById = new Map(resolved as Array<[string, string]>);
        queryClient.setQueriesData<{ pages?: Array<{ conversations: Conversation[] }> }>(
          { queryKey: ['conversations', 'list'] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                conversations: page.conversations.map((c) =>
                  urlById.has(c.id)
                    ? { ...c, contact: { ...c.contact, avatar: urlById.get(c.id) } }
                    : c
                ),
              })),
            };
          }
        );
      } catch {
        /* avatar fetch is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversations, channel, queryClient]);

  useEffect(() => {
    const syncViewport = () => setIsMobileViewport(window.innerWidth < 1024);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dividerDragRef.current.isDragging) return;
      const dx = e.clientX - dividerDragRef.current.startX;
      const next = Math.min(600, Math.max(260, dividerDragRef.current.startWidth + dx));
      setSidebarWidth(next);
    };
    const onMouseUp = () => { dividerDragRef.current.isDragging = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    setSearchQuery(localSearchQuery.trim());
  }, [localSearchQuery, setSearchQuery]);

  const withChannel = useCallback(
    (url: string) => `${url}${url.includes('?') ? '&' : '?'}channel=${channel}`,
    [channel]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
  }, [queryClient]);

const handleFavorite = useCallback(
  async (id?: string) => {
    if (!id) return;
    setActionError(null);
    try {
      const res = await fetchWithTenant(
        withChannel(`/api/whatsapp-conversations/conversations/${id}/favorite`),
        { method: 'PATCH' }
      );
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'Failed to update favorite status'));
      }
      // Optimistically flip is_favorite in the infinite-list cache (the key the
      // hook actually reads) so the heart icon and the Favourites filter update
      // immediately. The backend persists to conversations.metadata.is_favorite,
      // which getConversations now returns, so the subsequent refetch is consistent.
      let nextFav = false;
      queryClient.setQueriesData<{ pages?: Array<{ conversations: Conversation[] }> }>(
        { queryKey: ['conversations', 'list'] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              conversations: page.conversations.map((c) => {
                if (c.id !== id) return c;
                nextFav = !(c.is_favorite ?? c.isFavorite);
                return { ...c, is_favorite: nextFav, isFavorite: nextFav };
              }),
            })),
          };
        }
      );
      // Mirror onto the selected-conversation snapshot (which comes from
      // useConversations' own state and doesn't update from cache patches).
      setFavOverrides(prev => ({ ...prev, [id]: nextFav }));
      invalidate();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update favorite status'));
    }
  },
  [withChannel, invalidate, queryClient]
);

  const handleDelete = useCallback(
    async (id?: string) => {
      if (!id) return;
      setActionError(null);
      try {
        const res = await fetchWithTenant(withChannel(`/api/whatsapp-conversations/conversations/${id}`), { method: 'DELETE' });
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, 'Failed to delete conversation'));
        }
        invalidate();
        if (selectedId === id) selectConversation('');
      } catch (err) {
        setActionError(getErrorMessage(err, 'Failed to delete conversation'));
      }
    },
    [withChannel, invalidate, selectedId, selectConversation]
  );

  const handleBlock = useCallback(
    async (id?: string) => {
      if (!id) return;
      setActionError(null);
      try {
        const res = await fetchWithTenant(withChannel(`/api/whatsapp-conversations/conversations/${id}/status`), {
          method: 'PATCH',
          body: JSON.stringify({ status: 'resolved' }),
        });
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, 'Failed to update conversation status'));
        }
        invalidate();
      } catch (err) {
        setActionError(getErrorMessage(err, 'Failed to update conversation status'));
      }
    },
    [withChannel, invalidate]
  );

  const handleClear = useCallback(async (id: string) => { await handleDelete(id); }, [handleDelete]);

  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const toggleContextPanel = useCallback(() => setIsContextPanelOpen((p) => !p), []);
  const openContextPanel = useCallback(() => setIsContextPanelOpen(true), []);

  // ── Sort / filter state ────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<'date' | 'message_count' | 'name'>('date');
  // Personal WA has many empty campaign/greeting shells - default to hiding
  // empties so the inbox shows real chats first. WABA keeps showing everything.
  const [hideEmpty, setHideEmpty] = useState(channel === 'personal');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [contextStatusFilter, setContextStatusFilter] = useState('all');
  const [contextStatuses, setContextStatuses] = useState<ContextStatusOption[]>([]);

  useEffect(() => {
    fetchWithTenant(`/api/whatsapp-conversations/conversations/context-statuses?channel=${channel}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const statuses = (data.data as Array<{ value?: string; count?: number }>)
            .filter((s) => typeof s.value === 'string')
            .map((s) => ({
              value: s.value as string,
              label: formatContextStatus(s.value as string),
              count: Number(s.count || 0),
            }));
          setContextStatuses(statuses);
        } else {
          setContextStatuses(DEFAULT_CONTEXT_STATUSES);
        }
      })
      .catch(() => {
        setContextStatuses(DEFAULT_CONTEXT_STATUSES);
      });
  }, [channel]);

 const typedConversations = useMemo(
    () => {
      const list = (conversations?.length ? conversations : []) as Conversation[];
      // Apply locally-tracked favourite overrides so a just-toggled chat stays in
      // the Favourites filter even if a refetch returns stale data (e.g. before the
      // backend round-trip persists is_favorite). Overrides win over server state.
      if (!Object.keys(favOverrides).length) return list;
      return list.map((conv) =>
        conv.id in favOverrides
          ? ({ ...conv, is_favorite: favOverrides[conv.id], isFavorite: favOverrides[conv.id] } as Conversation)
          : conv
      );
    },
    [conversations, favOverrides]
  );

  const typedSelectedConversation = useMemo(
  () => {
    if (isMobileViewport && !isMobileChatOpen) return null;
    if (selectedConversation?.id) {
      const conv = selectedConversation as Conversation;
      // Merge any locally-tracked favourite override so the heart icon
      // reflects the toggle immediately (selectedConversation is a snapshot
      // from useConversations and doesn't update from cache patches).
      if (conv.id in favOverrides) {
        return { ...conv, is_favorite: favOverrides[conv.id] } as Conversation;
      }
      return conv;
    }
    return null;
  },
  [isMobileChatOpen, isMobileViewport, selectedConversation, favOverrides]
);
  useEffect(() => {
    if (!typedSelectedConversation && isContextPanelOpen) {
      setIsContextPanelOpen(false);
    }
  }, [typedSelectedConversation, isContextPanelOpen]);

  const { messages: polledMessages } = useConversationMessages(
    typedSelectedConversation?.id || null,
    { limit: 50 },
    channel || 'waba'
  );

  const activeLastMsg = polledMessages && polledMessages.length > 0
    ? polledMessages[polledMessages.length - 1]
    : null;

  if (!isMounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-background min-w-0">
      {actionError && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/70 dark:text-red-200 max-w-[calc(100%-1rem)]">
          <div className="flex items-center gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              className="text-xs font-medium underline underline-offset-2"
              onClick={() => setActionError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Sidebar - desktop: controlled by isSidebarCollapsed; mobile: shown when no chat is selected */}
      <AnimatePresence mode="wait">
        {(!isSidebarCollapsed || (isMobileViewport && !typedSelectedConversation)) && (
          <motion.div
            key="wa-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobileViewport ? '100%' : sidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={isMobileViewport ? undefined : { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
            className={cn(
              "h-full flex-shrink-0 overflow-hidden z-10 relative min-w-0",
              typedSelectedConversation ? "hidden lg:block" : "block lg:block"
            )}
          >
            <WABASidebar
              conversations={typedConversations}
              selectedId={mockSelectedId ?? selectedId}
              onSelectConversation={(id) => {
                if (id.startsWith('mock-')) {
                  setMockSelectedId(id);
                  setIsMobileChatOpen(true);
                  setIsSidebarCollapsed(false);
                } else {
                  setMockSelectedId(null);
                  selectConversation(id);
                  setIsMobileChatOpen(true);
                  setIsSidebarCollapsed(false);
                }
              }}
              searchQuery={localSearchQuery}
              onSearchChange={setLocalSearchQuery}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              hideEmpty={hideEmpty}
              onHideEmptyChange={setHideEmpty}
              selectedLabelIds={selectedLabelIds}
              onLabelFilterChange={setSelectedLabelIds}
              contextStatusFilter={contextStatusFilter}
              onContextStatusFilterChange={setContextStatusFilter}
              contextStatuses={contextStatuses}
              backendChannel={channel}
              onRefresh={invalidate}
              onOpenStarred={() => setIsStarredOpen(true)}
              onSelectedGroupsChange={setMultiSelectGroupIds}
              activeLastMsg={activeLastMsg}
              loadMore={loadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              isImportDialogOpen={isImportDialogOpen}
              onImportDialogOpenChange={setIsImportDialogOpen}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable divider - desktop only, visible when sidebar is open */}
      {!isMobileViewport && !isSidebarCollapsed && (
        <div
          className="hidden lg:flex w-1 h-full shrink-0 cursor-col-resize z-20 group relative select-none items-center justify-center bg-background dark:bg-[#161717]"
          onMouseDown={(e) => {
            dividerDragRef.current = { isDragging: true, startX: e.clientX, startWidth: sidebarWidth };
            e.preventDefault();
          }}
        >
          <div className="w-[1px] h-full bg-border dark:bg-[#222d34] group-hover:bg-[#00a884] dark:group-hover:bg-[#00a884] group-active:bg-[#00a884] transition-colors" />
        </div>
      )}

      {/* Main Chat Area - hidden on mobile when no conversation selected */}
      <div className={cn(
        "flex-1 overflow-hidden min-w-0 dark:bg-[#161717]",
        (!typedSelectedConversation && multiSelectGroupIds.length === 0) ? "hidden lg:flex" : "flex"
      )}>
        {multiSelectGroupIds.length > 0 ? (
          <BroadcastGroupActionsPanel
            groupIds={multiSelectGroupIds}
            channel={(channel as 'personal' | 'waba') || 'personal'}
          />
        ) : (
        <WABAChatWindow
          conversation={typedSelectedConversation}
          onSendMessage={async (payload) => { await sendMessage(payload); return; }}
          onTogglePanel={openContextPanel}
          isPanelOpen={isContextPanelOpen}
          onBack={() => {
            setIsContextPanelOpen(false);
            selectConversation('');
            setIsMobileChatOpen(false);
            setIsSidebarCollapsed(false);
          }}
          onDeleteChat={(id) => handleDelete(id)}
          onBlockChat={(id) => handleBlock(id)}
          onFavoriteChat={(id) => handleFavorite(id)}
          onMuteChat={muteConversation}
          onClearChat={(id) => handleClear(id)}
          onCloseChat={() => { selectConversation(''); }}
          onOpenImportLeads={() => setIsImportDialogOpen(true)}
          channel={channel}
          conversationId={typedSelectedConversation?.id}
          owner={typedSelectedConversation?.owner}
          backendChannel={channel}
        />
        )}
      </div>

      {/* Context Panel (Contact Info) */}
      <AnimatePresence mode="wait">
        {isContextPanelOpen && typedSelectedConversation && (
          <>
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex-shrink-0 overflow-hidden hidden xl:block border-l border-border dark:border-[#222d34] z-10 relative shadow-sm"
            >
              <ConversationContextPanel
                conversation={typedSelectedConversation}
                onClose={toggleContextPanel}
                backendChannel={channel}
                onFavoriteChat={handleFavorite}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 bottom-0 top-14 z-40 xl:hidden"
            >
              <button
                type="button"
                aria-label="Close contact info panel"
                className="absolute inset-0 bg-black/40"
                onClick={toggleContextPanel}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-card dark:bg-[#161717] border-l border-border dark:border-[#222d34] shadow-xl"
              >
                <ConversationContextPanel
                  conversation={typedSelectedConversation}
                  onClose={toggleContextPanel}
                  backendChannel={channel}
                  onFavoriteChat={handleFavorite}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global "Starred messages" viewer (opened from the sidebar kebab menu) */}
      <StarredMessagesDialog
        open={isStarredOpen}
        onClose={() => setIsStarredOpen(false)}
        channel={channel}
        onSelectConversation={(id) => {
          selectConversation(id);
          setIsMobileChatOpen(true);
          setIsSidebarCollapsed(false);
        }}
      />
    </div>
  );
}

