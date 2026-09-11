'use client';

import {
  useState, useEffect, useCallback, useRef, memo, useMemo,
} from 'react';
import {
  Mail, Users, Plus, Search, UserPlus, Loader2, X, Archive,
  Trash2, Send, ChevronRight, ChevronLeft, RefreshCw, ArrowLeft,
  FileText, Check, Paperclip, ChevronDown,
  Tag, Clock, Building2, AtSign,
  AlertCircle, MoreVertical, Bold, Italic, Link2,
  Smile, Star,
  PanelRightClose, PanelRightOpen, Hash,
  Inbox, Pencil, Menu, Settings, HelpCircle, SlidersHorizontal,
  Reply, ReplyAll, Forward, Printer, ExternalLink, MoreHorizontal,
  Undo, Redo, AlignLeft, List,
  LogOut, Camera, User,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ImportLeadsDialog } from './ImportLeadsDialog';
import { EmailTemplatePicker } from './EmailTemplatePicker';
import { EmailBroadcastsSentList } from './EmailBroadcastsSentList';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DOMPurify from 'dompurify';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EmailContact {
  id: string;
  contact_name: string | null;
  email: string | null;
  company: string | null;
  channel: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

interface EmailGroup {
  id: string;
  name: string;
  color: string;
  description: string | null;
  channel: string;
  member_count: number;
}

interface EmailLabels {
  id: string;
  name: string;
  color: string;
  description: string | null;
  channel: string;
}

interface EmailGroupDetail extends EmailGroup {
  members: EmailContact[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
  category: string;
}

interface EmailMessage {
  id: string;
  contact_id: string;
  direction: 'outbound' | 'inbound';
  provider: string;
  subject: string;
  body_html: string | null;
  preview_text: string | null;
  status: string;
  sent_at: string;
}

// Defined at module level - not inside the component - to avoid redefining on
// every render and to allow usage in ComposeWindow props.
type ComposeInstance = {
  id: string;
  minimized: boolean;
  maximized: boolean;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
};

type EmailProvider = 'gmail' | 'outlook' | 'custom';
type FolderType = 'inbox' | 'starred' | 'sent' | 'important' | 'drafts' | 'spam' | 'trash' | 'snoozed';
type CategoryTab = 'primary';

interface EmailChannelViewProps {
  provider: EmailProvider;
  connectedEmail?: string;
  userImage?: string;
  /** Called when the user clicks "Sign out of all accounts" */
  onSignOut?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API = '/api/email-conversations';
const TEMPLATES_API = '/api/campaigns/email-templates';

const PROVIDER_COLOR: Record<EmailProvider, string> = {
  gmail: '#EA4335',
  outlook: '#0078D4',
  custom: '#059669',
};

const PROVIDER_LABEL: Record<EmailProvider, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  custom: 'Custom SMTP',
};

function toBackendProvider(p: EmailProvider): string {
  if (p === 'outlook') return 'microsoft';
  if (p === 'custom') return 'custom_smtp';
  return 'google';
}

const AVATAR_GRADIENTS = [
  'from-indigo-400 to-purple-500',
  'from-blue-400 to-cyan-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-red-500',
  'from-pink-400 to-rose-500',
  'from-violet-400 to-indigo-500',
];

// ─────────────────────────────────────────────────────────────────────────────
// Security: HTML Sanitizer
//
// Basic HTML sanitization to prevent XSS attacks.
// For production, consider using DOMPurify for comprehensive sanitization:
//   npm install dompurify @types/dompurify
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeHtml(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'br', 'hr', 'img', 'a', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
      ],
      ALLOWED_ATTR: ['src', 'alt', 'href', 'title', 'class', 'style', 'width', 'height'],
      KEEP_CONTENT: true,
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
  }
  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Replies
// ─────────────────────────────────────────────────────────────────────────────

const SMART_REPLIES: Record<string, string[]> = {
  default: ['Looking forward to it!', 'We will be there!', 'Thanks for the update!'],
  inquiry: ['Thanks for reaching out!', "I'll review and get back to you", 'Can we schedule a call?'],
  approval: ['Sounds great!', 'Approved - please proceed', 'Let me check with the team'],
  meeting: ['Works for me!', 'Can we reschedule?', "I'll send a calendar invite"],
  proposal: ['Looks good to me!', 'I have a few questions', "Let's discuss further"],
};

function getSmartReplies(subject: string): string[] {
  const l = subject.toLowerCase();
  if (l.includes('inquiry') || l.includes('request')) return SMART_REPLIES.inquiry;
  if (l.includes('approved') || l.includes('confirm')) return SMART_REPLIES.approval;
  if (l.includes('meeting') || l.includes('schedule')) return SMART_REPLIES.meeting;
  if (l.includes('proposal') || l.includes('quote')) return SMART_REPLIES.proposal;
  return SMART_REPLIES.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Data (used when API endpoints are unavailable)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CONTACTS: EmailContact[] = [];

const MOCK_GROUPS: EmailGroup[] = [];

const MOCK_LABELS: EmailLabels[] = [];

const MOCK_EMAIL_DETAILS: Record<string, {
  subject: string; snippet: string; date: string;
  unread: boolean; category: CategoryTab; labels?: string[];
}> = {};

// ─────────────────────────────────────────────────────────────────────────────
// Emoji categories (module-level constant-created once, never re-allocated)
// ─────────────────────────────────────────────────────────────────────────────
const EMOJI_CATS = [
  { id: 'smileys', icon: '😊', label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { id: 'hands', icon: '👋', label: 'Hands', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '👀', '👁️', '👅', '👄', '💋', '🩸'] },
  { id: 'hearts', icon: '❤️', label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❣️', '💌', '💤', '💢', '💣', '💥', '💦', '💨', '💫', '💬', '💭', '🗯️', '💯'] },
  { id: 'animals', icon: '🐶', label: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🦂', '🐢', '🐍', '🦎', '🦕', '🦖', '🦏', '🦛', '🐘', '🦒', '🦘', '🦬', '🐃', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐾', '🐉', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻'] },
  { id: 'food', icon: '🍔', label: 'Food', emojis: ['🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🫒', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫔', '🌮', '🌯', '🥙', '🧆', '🥚', '🍿', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸'] },
  { id: 'travel', icon: '🚗', label: 'Travel', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚨', '🚥', '🚦', '🛑', '🚧', '⛽', '🚢', '✈️', '🛩️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚃', '🚋', '🚆', '🚇', '🚊', '🚉', '🌍', '🌎', '🌏', '🗺️', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🕍'] },
  { id: 'activities', icon: '⚽', label: 'Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🏇', '🧘', '🏄', '🏊', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎰', '🎮', '🕹️'] },
  { id: 'symbols', icon: '❤️', label: 'Symbols', emojis: ['❤️', '✅', '❌', '⭕', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔲', '🔳', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔉', '🔊', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🀄', '🎴', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '🎦', '🔅', '🔆', '📶', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈹', '🈵', '🉐', '㊙️', '㊗️', '🈴', '🈺', '🈷️', '✴️', '🆚', '💮', '🉑', '🈶', '🈚', '🈸', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘'] },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) h['Authorization'] = `Bearer ${token}`;
    const tenant = typeof window !== 'undefined' ? localStorage.getItem('selectedTenantId') : null;
    if (tenant && tenant !== 'default') h['X-Tenant-ID'] = tenant;
  } catch {
    // Silently handle auth header errors - localStorage may be unavailable in some contexts
  }
  return h;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarGradient(id: string): string {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length];
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function getEmailDetails(contact: EmailContact) {
  const meta = contact.metadata ?? {};
  const mockDetails = MOCK_EMAIL_DETAILS[contact.id];
  return {
    subject: (meta.subject as string) ?? mockDetails?.subject ?? `Email from ${contact.contact_name ?? 'Unknown'}`,
    snippet: (meta.snippet as string) ?? mockDetails?.snippet ?? `Message from ${contact.email ?? 'unknown'}...`,
    date: (meta.date as string) ?? mockDetails?.date ?? new Date(contact.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unread: (meta.unread as boolean) ?? mockDetails?.unread ?? false,
    category: (meta.category as CategoryTab) ?? mockDetails?.category ?? ('primary' as CategoryTab),
    labels: (meta.labels as string[]) ?? mockDetails?.labels ?? [],
  };
}

/** Wraps the current textarea selection with a prefix/suffix. */
function wrapSelection(
  el: HTMLTextAreaElement,
  body: string,
  setBody: (v: string) => void,
  wrap: string,
  defaultText = 'text',
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = body.slice(start, end) || defaultText;
  const newBody = body.slice(0, start) + wrap + selected + wrap + body.slice(end);
  setBody(newBody);
  setTimeout(() => {
    el.focus();
    el.selectionStart = start + wrap.length;
    el.selectionEnd = start + wrap.length + selected.length;
  }, 0);
}

/** Inserts a snippet at the current cursor position. */
function insertAtCursor(
  el: HTMLTextAreaElement,
  body: string,
  setBody: (v: string) => void,
  snippet: string,
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const newBody = body.slice(0, start) + snippet + body.slice(end);
  setBody(newBody);
  setTimeout(() => {
    el.focus();
    el.selectionStart = start + snippet.length;
    el.selectionEnd = start + snippet.length;
  }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({ name, id, size = 'md' }: { name?: string | null; id: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs';
  return (
    <div className={cn('rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0', sz, avatarGradient(id))}>
      {getInitials(name)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TBtn - reusable icon toolbar button
// ─────────────────────────────────────────────────────────────────────────────

function TBtn({ icon: Icon, label, onClick, active }: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded-full transition-colors',
        active
          ? 'bg-[#c2dbff] dark:bg-[#004a77] text-[#001D35] dark:text-[#c2e7ff]'
          : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ComposeWindow - floating Gmail-style compose
// ─────────────────────────────────────────────────────────────────────────────

interface ComposeWindowProps {
  provider: EmailProvider;
  contacts: EmailContact[];
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSent?: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  maximized?: boolean;
}

function ComposeWindow({
  provider, contacts, initialTo = '', initialSubject = '', initialBody = '',
  onClose, onSent, minimized = false, onMinimize, onMaximize, maximized = false,
}: ComposeWindowProps) {
  const { toast } = useToast();
  const { isDark } = useTheme();
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [agentType, setAgentType] = useState<'ai' | 'human'>('ai');
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiScrollRef = useRef<HTMLDivElement>(null);
  const emojiCategoryRefs = useRef<Record<string, HTMLDivElement | null>>({});



  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const templateBtnRef = useRef<HTMLButtonElement>(null);


  const suggestedContacts = useMemo(() => {
    if (!to.trim()) return [];
    const t = to.toLowerCase();
    return contacts.filter(c =>
      (c.contact_name ?? '').toLowerCase().includes(t) || (c.email ?? '').toLowerCase().includes(t),
    ).slice(0, 5);
  }, [contacts, to]);

  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node))
        setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  const handleEmojiScroll = useCallback(() => {
    if (!emojiScrollRef.current) return;
    const scrollTop = emojiScrollRef.current.scrollTop;
    let current = EMOJI_CATS[0].id;
    for (const cat of EMOJI_CATS) {
      const el = emojiCategoryRefs.current[cat.id];
      if (el && el.offsetTop <= scrollTop + 20) {
        current = cat.id;
      }
    }
    setActiveEmojiCategory(current);
  }, []);

  const scrollToEmojiCategory = useCallback((catId: string) => {
    const el = emojiCategoryRefs.current[catId];
    if (el && emojiScrollRef.current) {
      emojiScrollRef.current.scrollTo({ top: el.offsetTop - 2, behavior: 'smooth' });
    }
    setActiveEmojiCategory(catId);
  }, []);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Recipient, subject, and body are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const recipients = [{ email: to.trim() }];
      if (cc.trim()) {
        cc.split(',').forEach(e => {
          if (e.trim()) recipients.push({ email: e.trim() });
        });
      }
      const res = await fetch(`${API}/send-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider: toBackendProvider(provider),
          recipients,
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: subject.trim(),
          body_html: body.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error ?? 'Send failed');
      }

      setSent(true);
      toast({
        title: 'Success',
        description: 'Email sent successfully.',
      });
      onSent?.();
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Email send failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      toast({
        title: 'Error sending email',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleBold = () => bodyRef.current && wrapSelection(bodyRef.current, body, setBody, '**', 'bold text');
  const handleItalic = () => bodyRef.current && wrapSelection(bodyRef.current, body, setBody, '_', 'italic text');
  const handleLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url && bodyRef.current) insertAtCursor(bodyRef.current, body, setBody, `[link text](${url})`);
  };
  const handleUndo = () => { document.execCommand('undo'); };
  const handleRedo = () => { document.execCommand('redo'); };
  const handleBulletList = () => bodyRef.current && insertAtCursor(bodyRef.current, body, setBody, '\n• ');
  const handleNumberedList = () => bodyRef.current && insertAtCursor(bodyRef.current, body, setBody, '\n1. ');

  // Minimized - just the header tab
  if (minimized) {
    return (
      <div
        className="w-[216px] h-10 bg-[#404040] text-white rounded-t-xl flex items-center justify-between px-4 cursor-pointer hover:bg-[#3a3a3a] transition-colors shadow-lg"
        onClick={onMaximize}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onMaximize?.()}
        aria-label={`Restore compose window: ${subject.trim() || 'New Message'}`}
      >
        <span className="text-sm font-medium truncate">{subject.trim() || 'New Message'}</span>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            title="Restore"
            aria-label="Restore compose window"
            onClick={onMaximize}
            className="h-5 w-5 flex items-center justify-center hover:bg-white/20 rounded"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
              <path d="M4 15H2v7h9v-2H4v-5zM2 9h2V4h5V2H2v7zm15 11h-5v2h7v-7h-2v5zM15 2v2h5v5h2V2h-7z" fill="currentColor" />
            </svg>
          </button>
          <button
            title="Close"
            aria-label="Close compose window"
            onClick={onClose}
            className="h-5 w-5 flex items-center justify-center hover:bg-white/20 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3c4043] rounded-t-xl flex flex-col overflow-hidden',
        'shadow-[0_8px_10px_1px_rgba(60,64,67,.15),0_3px_14px_2px_rgba(60,64,67,.12),0_5px_5px_-3px_rgba(60,64,67,.2)]',
        maximized
          ? 'fixed inset-2 sm:inset-4 z-50 rounded-xl'
          : 'fixed bottom-0 right-0 z-50 w-full sm:right-[72px] sm:w-[500px] max-h-[560px]',
      )}
      role="dialog"
      aria-label="Compose new email"
      aria-modal="true"
    >
      {/* Header */}
      <div className="h-10 px-4 bg-[#404040] text-white flex items-center justify-between flex-shrink-0 rounded-t-xl select-none">
        <span className="text-sm font-medium">New Message</span>
        <div className="flex items-center gap-0.5">
          <button title="Minimize" aria-label="Minimize compose window" onClick={onMinimize}
            className="h-7 w-7 flex items-center justify-center hover:bg-white/20 rounded transition-colors">
            <span className="text-white text-base leading-none pb-1" aria-hidden="true">-</span>
          </button>
          <button title={maximized ? 'Restore' : 'Maximize'} aria-label={maximized ? 'Restore compose window' : 'Maximize compose window'} onClick={onMaximize}
            className="h-7 w-7 flex items-center justify-center hover:bg-white/20 rounded transition-colors">
            <svg viewBox="0 0 18 18" className="h-3.5 w-3.5"
              fill="none" stroke="currentColor"
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              {maximized ? (
                <>
                  <polyline points="6,1 6,6 1,6" />
                  <polyline points="12,1 12,6 17,6" />
                  <polyline points="17,12 12,12 12,17" />
                  <polyline points="1,12 6,12 6,17" />
                </>
              ) : (
                <>
                  <polyline points="1,6 1,1 6,1" />
                  <polyline points="12,1 17,1 17,6" />
                  <polyline points="17,12 17,17 12,17" />
                  <polyline points="6,17 1,17 1,12" />
                </>
              )}
            </svg>
          </button>
          <button title="Close" aria-label="Close compose window" onClick={onClose}
            className="h-7 w-7 flex items-center justify-center hover:bg-white/20 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 flex flex-col overflow-y-auto text-sm min-h-0">

        {/* To */}
        <div className="relative border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <div className="flex items-center px-4 h-10">
            <label htmlFor="compose-to" className="text-[#5f6368] dark:text-[#9aa0a6] w-16 flex-shrink-0 text-sm">To</label>
            <input
              id="compose-to"
              type="email"
              value={to}
              onChange={e => { setTo(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              aria-label="Recipients"
              placeholder=""
              className="flex-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-[#202124] dark:text-[#e8eaed] bg-transparent"
            />
            <div className="flex items-center gap-3 text-sm text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0">
              <button
                type="button"
                title="Add Cc recipients"
                aria-label="Add Cc"
                onClick={() => setShowCc(v => !v)}
                className={cn('hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors', showCc && 'text-[#0b57d0] dark:text-[#7cacf8]')}
              >Cc</button>
              <button
                type="button"
                title="Add Bcc recipients"
                aria-label="Add Bcc"
                onClick={() => setShowBcc(v => !v)}
                className={cn('hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors', showBcc && 'text-[#0b57d0] dark:text-[#7cacf8]')}
              >Bcc</button>
            </div>
          </div>
          {showSuggestions && suggestedContacts.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 bg-white dark:bg-[#2d2d2d] border border-[#dadce0] dark:border-[#3c4043] shadow-lg z-50 overflow-hidden"
              role="listbox"
              aria-label="Suggested contacts"
            >
              {suggestedContacts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => { setTo(c.email ?? ''); setShowSuggestions(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] flex items-center gap-3 text-sm"
                >
                  <Avatar name={c.contact_name} id={c.id} size="sm" />
                  <div>
                    <p className="font-medium text-[#202124] dark:text-[#e8eaed]">{c.contact_name}</p>
                    <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">{c.email}</p>
                  </div>
                  {c.company && <span className="ml-auto text-xs text-[#5f6368] dark:text-[#9aa0a6] bg-[#f1f3f4] dark:bg-[#3c4043] px-2 py-0.5 rounded">{c.company}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cc */}
        {showCc && (
          <div className="border-b border-[#e0e0e0] dark:border-[#3c4043]">
            <div className="flex items-center px-4 h-10">
              <label htmlFor="compose-cc" className="text-[#5f6368] dark:text-[#9aa0a6] w-16 flex-shrink-0 text-sm">Cc</label>
              <input
                id="compose-cc"
                type="text"
                value={cc}
                onChange={e => setCc(e.target.value)}
                placeholder="Add Cc recipients, comma-separated"
                aria-label="Cc recipients"
                className="flex-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-[#202124] dark:text-[#e8eaed] bg-transparent placeholder:text-[#5f6368]"
              />
              <button type="button" aria-label="Remove Cc" onClick={() => { setShowCc(false); setCc(''); }}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                <X className="h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" />
              </button>
            </div>
          </div>
        )}

        {/* Bcc */}
        {showBcc && (
          <div className="border-b border-[#e0e0e0] dark:border-[#3c4043]">
            <div className="flex items-center px-4 h-10">
              <label htmlFor="compose-bcc" className="text-[#5f6368] dark:text-[#9aa0a6] w-16 flex-shrink-0 text-sm">Bcc</label>
              <input
                id="compose-bcc"
                type="text"
                value={bcc}
                onChange={e => setBcc(e.target.value)}
                placeholder="Add Bcc recipients, comma-separated"
                aria-label="Bcc recipients"
                className="flex-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-[#202124] dark:text-[#e8eaed] bg-transparent placeholder:text-[#5f6368]"
              />
              <button type="button" aria-label="Remove Bcc" onClick={() => { setShowBcc(false); setBcc(''); }}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                <X className="h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" />
              </button>
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="border-b border-[#e0e0e0] dark:border-[#3c4043]">
          <div className="flex items-center px-4 h-10">
            <label htmlFor="compose-subject" className="sr-only">Subject</label>
            <input
              id="compose-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              aria-label="Email subject"
              className="flex-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] bg-transparent"
            />
          </div>
        </div>

        {/* Body */}
        <div className={cn('flex-1 flex flex-col px-4 py-3 relative', maximized ? 'min-h-[400px]' : 'min-h-[200px]')}>
          <label htmlFor="compose-body" className="sr-only">Email body</label>
          <textarea
            id="compose-body"
            ref={bodyRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Body Text"
            aria-label="Email body"
            className="w-full flex-1 bg-transparent resize-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6]/60"
            style={{ minHeight: maximized ? '400px' : '200px' }}
          />
          {showTemplate && (
            <InlineTemplatePicker
              anchorRef={templateBtnRef}
              onSelect={t => { setSubject(t.subject); setBody(t.body_html ?? t.body ?? ''); setShowTemplate(false); }}
              onClose={() => setShowTemplate(false)}
            />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-1 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="px-4 py-1 border-t border-[#e0e0e0] dark:border-[#3c4043]/60 flex items-center gap-0.5 flex-wrap">
        <button type="button" title="Undo" aria-label="Undo" onClick={handleUndo}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Redo" aria-label="Redo" onClick={handleRedo}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
          <Redo className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-[#e0e0e0] dark:bg-[#3c4043] mx-1" aria-hidden="true" />
        <button type="button" title="Bold" aria-label="Bold" onClick={handleBold}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors font-bold text-xs">B</button>
        <button type="button" title="Italic" aria-label="Italic" onClick={handleItalic}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors italic text-xs">I</button>
        <button type="button" title="Insert link" aria-label="Insert link" onClick={handleLink}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Numbered list" aria-label="Numbered list" onClick={handleNumberedList}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Bullet list" aria-label="Bullet list" onClick={handleBulletList}
          className="h-7 w-7 flex items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors">
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom toolbar */}
      <div className="h-14 px-4 border-t border-[#e0e0e0] dark:border-[#3c4043] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Send button */}
          <div className="flex items-center">
            <button
              onClick={handleSend}
              disabled={sending || sent}
              aria-label={sent ? 'Email sent' : sending ? 'Sending email' : 'Send email'}
              className="h-9 px-5 rounded-l-full text-white text-sm font-medium transition-all disabled:opacity-60 flex items-center gap-1.5"
              style={{ backgroundColor: sent ? '#188038' : '#0b57d0' }}
            >
              {sent
                ? <><Check className="h-4 w-4" /> Sent</>
                : sending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : 'Send'}
            </button>
            <button
              title="More send options"
              aria-label="More send options"
              className="h-9 w-8 rounded-r-full flex items-center justify-center border-l border-white/20 text-white transition-all"
              style={{ backgroundColor: sent ? '#188038' : '#0b57d0' }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Agent Toggle - mirrors WABAChatWindow composer */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={agentType === 'human' ? 'Human agent - tap to hand back to Mr LAD' : 'Mr LAD is replying - tap to take over'}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] flex-shrink-0',
                  agentType === 'human' && 'text-orange-500'
                )}
              >
                {agentType === 'human'
                  ? <User className="h-5 w-5" />
                  : <Image src={isDark ? '/logo-white.svg' : '/logo.svg'} alt="Mr LAD" width={28} height={28} className="object-contain" />
                }
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover z-50">
              <DropdownMenuItem
                onClick={() => setAgentType('human')}
                className={cn('cursor-pointer', agentType === 'human' && 'bg-muted')}
              >
                <User className="h-4 w-4 mr-2" /> Human Agent
                {agentType === 'human' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAgentType('ai')}
                className={cn('cursor-pointer', agentType === 'ai' && 'bg-muted')}
              >
                <Image src={isDark ? '/logo-white.svg' : '/logo.svg'} alt="Mr LAD" width={16} height={16} className="mr-2" /> Mr LAD
                {agentType === 'ai' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Toolbar icons */}
          <div className="flex items-center gap-0.5">
            <button
              ref={templateBtnRef}
              type="button"
              title="Insert template"
              aria-label="Insert template"
              onClick={() => setShowTemplate(v => !v)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-full transition-colors',
                showTemplate
                  ? 'bg-[#c2dbff] dark:bg-[#004a77] text-[#001D35] dark:text-[#c2e7ff]'
                  : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]',
              )}
            >
              <FileText className="h-4 w-4" />
            </button>
            <TBtn icon={Paperclip} label="Attach file" onClick={() => fileRef.current?.click()} />
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              aria-label="Attach files"
              onChange={e => setAttachments(p => [...p, ...Array.from(e.target.files ?? [])])}
            />
            <div className="relative" ref={emojiPickerRef}>
              <TBtn
                icon={Smile}
                label="Insert emoji"
                active={showEmoji}
                onClick={() => setShowEmoji(v => !v)}
              />
              {showEmoji && (
                <div
                  className="absolute z-[9999] bg-white dark:bg-[#2d2d2d] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                  style={{
                    width: 320,
                    height: 360,
                    // Smart positioning: open upward, align left but clamp to viewport
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Search bar */}
                  <div className="px-3 pt-2.5 pb-2 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" />
                      <input
                        placeholder="Search emoji"
                        className="w-full pl-8 pr-3 py-1.5 bg-[#f1f3f4] dark:bg-[#3c4043] rounded-full text-[13px] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6] focus:outline-none border-0"
                      />
                    </div>
                  </div>

                  {/* Category tabs - auto-highlights on scroll */}
                  <div className="flex items-center gap-0 px-2 pb-1.5 border-b border-[#f1f3f4] dark:border-[#3c4043] flex-shrink-0 overflow-x-auto no-scrollbar">
                    {EMOJI_CATS.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        title={cat.label}
                        onClick={() => scrollToEmojiCategory(cat.id)}
                        className={cn(
                          'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors relative',
                          activeEmojiCategory === cat.id
                            ? 'text-[#0b57d0] dark:text-[#7cacf8]'
                            : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]'
                        )}
                      >
                        {cat.icon}
                        {activeEmojiCategory === cat.id && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#0b57d0] dark:bg-[#7cacf8] rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Emoji grid - scrollable, updates category tabs */}
                  <div
                    ref={emojiScrollRef}
                    onScroll={handleEmojiScroll}
                    className="flex-1 overflow-y-auto px-2 py-1"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {EMOJI_CATS.map(cat => (
                      <div key={cat.id} ref={el => { emojiCategoryRefs.current[cat.id] = el; }}>
                        <p className="text-[10px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider px-1 pt-2 pb-1 sticky top-0 bg-white dark:bg-[#2d2d2d] z-10">
                          {cat.label}
                        </p>
                        <div className="grid grid-cols-8 gap-0">
                          {cat.emojis.map((emoji, i) => (
                            <button
                              key={i}
                              type="button"
                              onMouseDown={e => {
                                e.preventDefault(); // keep textarea focused so cursor pos is preserved
                                const el = bodyRef.current;
                                if (el) {
                                  const start = el.selectionStart;
                                  const end = el.selectionEnd;
                                  const newBody = body.slice(0, start) + emoji + body.slice(end);
                                  setBody(newBody);
                                  setTimeout(() => {
                                    el.focus();
                                    el.selectionStart = start + emoji.length;
                                    el.selectionEnd = start + emoji.length;
                                  }, 0);
                                } else {
                                  setBody(prev => prev + emoji);
                                }
                              }}
                              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" title="Toggle confidential mode" aria-label="Toggle confidential mode"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor" />
              </svg>
            </button>
            <button type="button" title="More options" aria-label="More options"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {attachments.length > 0 && (
            <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1" aria-label={`${attachments.length} files attached`}>
              <Paperclip className="h-3 w-3" />{attachments.length}
            </span>
          )}
          <button
            title="Discard draft"
            aria-label="Discard this draft"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#fce8e6] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#d93025] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InlineTemplatePicker
// ─────────────────────────────────────────────────────────────────────────────

function InlineTemplatePicker({ onSelect, onClose, anchorRef }: { onSelect: (tpl: EmailTemplate) => void; onClose: () => void; anchorRef?: React.RefObject<HTMLButtonElement> }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${TEMPLATES_API}?isActive=true`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setTemplates(data.templates ?? data.data ?? []);
      } catch {
        if (!cancelled) {
          setError(true);
          setTemplates([
            { id: 't1', name: 'Follow Up', subject: 'Following up on our conversation', body: 'Hi {name},\n\nI wanted to follow up on our recent discussion...', body_html: null, category: 'sales' },
            { id: 't2', name: 'Introduction', subject: 'Introduction from {company}', body: "Hi {name},\n\nI'd like to introduce myself and our services...", body_html: null, category: 'cold' },
            { id: 't3', name: 'Meeting Request', subject: 'Quick 15-min call?', body: 'Hi {name},\n\nWould you be available for a quick call this week?', body_html: null, category: 'outreach' },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const filtered = templates.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()),
  );

  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    }
  }, [anchorRef]);

  return (
    <div
      ref={ref}
      className="w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#2d2d2d] border border-[#dadce0] dark:border-[#3c4043] rounded-xl shadow-xl overflow-hidden max-sm:!fixed max-sm:!left-1/2 max-sm:!-translate-x-1/2"
      style={
        pos
          ? { position: 'fixed', bottom: pos.bottom, left: pos.left, zIndex: 9999 }
          : { position: 'fixed', bottom: 80, right: 80, zIndex: 9999 }
      }
    >
      <div className="px-3 pt-3 pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
        <p className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider mb-2">
          Email Templates
          {error && <span className="ml-2 normal-case text-amber-500">(using defaults)</span>}
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" aria-hidden="true" />
          <input
            autoFocus
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search templates"
            className="h-8 text-xs pl-8 w-full border border-[#dadce0] dark:border-[#3c4043] rounded-full px-3 focus:outline-none focus:border-[#4285f4] bg-transparent text-[#202124] dark:text-[#e8eaed]"
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {loading
          ? <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" /></div>
          : filtered.length === 0
            ? <div className="text-center py-6 text-xs text-[#5f6368] dark:text-[#9aa0a6]">{templates.length === 0 ? 'No templates yet' : 'No matches'}</div>
            : filtered.map(tpl => (
              <button key={tpl.id} onClick={() => onSelect(tpl)}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] transition-colors text-left border-b border-[#f0f0f0] dark:border-[#3c4043]/50 last:border-0">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[#202124] dark:text-[#e8eaed]">{tpl.name}</p>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate">{tpl.subject}</p>
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddToGroupModal
// ─────────────────────────────────────────────────────────────────────────────

function AddToGroupModal({ groups, provider, contactIds, onDone, onClose }: {
  groups: EmailGroup[];
  provider: EmailProvider;
  contactIds: string[];
  onDone: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Hosted providers route through LAD-Email-Comms; custom SMTP still uses
  // the legacy WABA-Comms email surface.
  const isHosted = provider === 'gmail' || provider === 'outlook';

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    setError('');
    try {
      const url = isHosted
        ? `/api/email-comms/groups/${selected}/contacts`
        : `${API}/groups/${selected}/contacts`;
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contact_ids: contactIds }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || errBody.error || `HTTP ${res.status}`);
      }
      setDone(true);
      toast({
        title: 'Success',
        description: 'Contacts added to group.',
      });
      setTimeout(() => onDone(), 1200);
    } catch (_err) {
      console.error('Failed to add contacts to group:', _err);
      const errMsg = _err instanceof Error ? _err.message : 'Failed to add contacts to group.';
      setError(errMsg);
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Add to broadcast group">
      <div className="bg-white dark:bg-[#2d2d2d] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-[#202124] dark:text-[#e8eaed]">Add to Broadcast Group</h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">{contactIds.length} contact{contactIds.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} title="Close" aria-label="Close dialog"
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
            <X className="h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6]" />
          </button>
        </div>
        {done
          ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><Check className="h-6 w-6 text-green-600" /></div>
              <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">Added successfully!</p>
            </div>
          )
          : (
            <>
              <div className="max-h-60 overflow-y-auto p-3 space-y-1">
                {groups.filter(g => g.channel === provider).map(g => (
                  <button key={g.id} onClick={() => setSelected(g.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                      selected === g.id
                        ? 'border-[#4285f4] bg-[#e8f0fe] dark:bg-[#004a77]/30'
                        : 'border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043]',
                    )}>
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: g.color }}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[#202124] dark:text-[#e8eaed]">{g.name}</p>
                      <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">{g.member_count} members</p>
                    </div>
                    {selected === g.id && <Check className="h-4 w-4 text-[#4285f4] flex-shrink-0" />}
                  </button>
                ))}
                {groups.filter(g => g.channel === provider).length === 0 && (
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] text-center py-4">No broadcast groups yet</p>
                )}
              </div>
              {error && (
                <p className="mx-4 mb-2 text-xs text-red-600 flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3.5 w-3.5" />{error}
                </p>
              )}
              <div className="px-4 py-3 border-t border-[#dadce0] dark:border-[#3c4043] flex gap-2">
                <button onClick={onClose}
                  className="flex-1 h-9 rounded-full border border-[#dadce0] dark:border-[#3c4043] text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={!selected || adding}
                  className="flex-1 h-9 rounded-full bg-[#0b57d0] text-white text-sm hover:bg-[#0842a0] disabled:opacity-40 flex items-center justify-center gap-1">
                  {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Add to Group
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactDetailsPanel
// ─────────────────────────────────────────────────────────────────────────────

function ContactDetailsPanel({ contact, provider, groups, onClose, onAddToGroup }: {
  contact: EmailContact;
  provider: EmailProvider;
  groups: EmailGroup[];
  onClose: () => void;
  onAddToGroup: () => void;
}) {
  const providerColor = PROVIDER_COLOR[provider];
  const providerLabel = PROVIDER_LABEL[provider];
  const contactGroups = groups.filter(g => g.channel === provider);

  return (
    <div className="absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto w-full sm:w-72 flex-shrink-0 flex flex-col border-l border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#2d2d2d] overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">Contact Details</span>
        <button onClick={onClose} title="Close" aria-label="Close contact details"
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
          <X className="h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" />
        </button>
      </div>

      <div className="flex flex-col items-center px-4 py-6 border-b border-[#dadce0] dark:border-[#3c4043]">
        <div className={cn('h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold mb-3', avatarGradient(contact.id))}>
          {getInitials(contact.contact_name)}
        </div>
        <h2 className="font-semibold text-sm text-center text-[#202124] dark:text-[#e8eaed]">{contact.contact_name ?? 'Unknown'}</h2>
        {contact.company && <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 text-center">{contact.company}</p>}
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: providerColor }}>
          <Mail className="h-3 w-3" aria-hidden="true" />{providerLabel}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 border-b border-[#dadce0] dark:border-[#3c4043]">
        {[
          { icon: AtSign, label: 'Email', value: contact.email ?? '-' },
          ...(contact.company ? [{ icon: Building2, label: 'Company', value: contact.company }] : []),
          ...(contact.created_at ? [{ icon: Clock, label: 'Added', value: formatDate(contact.created_at) }] : []),
          { icon: Hash, label: 'Channel', value: providerLabel },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#f1f3f4] dark:bg-[#3c4043] flex items-center justify-center flex-shrink-0">
              <Icon className="h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">{label}</p>
              <p className="text-xs font-medium truncate text-[#202124] dark:text-[#e8eaed]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-b border-[#dadce0] dark:border-[#3c4043]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">Labels</span>
          <button title="Add label" aria-label="Add label" className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
            <Plus className="h-3 w-3 text-[#5f6368] dark:text-[#9aa0a6]" />
          </button>
        </div>
        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">No labels assigned</p>
      </div>

      <div className="px-4 py-4 border-b border-[#dadce0] dark:border-[#3c4043]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">Broadcast Groups</span>
        </div>
        {contactGroups.length === 0
          ? <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">No groups yet</p>
          : (
            <div className="space-y-1.5">
              {contactGroups.slice(0, 3).map(g => (
                <div key={g.id} className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: g.color }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs truncate text-[#202124] dark:text-[#e8eaed]">{g.name}</span>
                </div>
              ))}
            </div>
          )}
        <button onClick={onAddToGroup}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[#4285f4]/40 text-[#0b57d0] dark:text-[#7cacf8] hover:bg-[#e8f0fe] dark:hover:bg-[#004a77]/40 text-xs font-medium transition-colors">
          <Plus className="h-3 w-3" />Add to Group
        </button>
      </div>

      <div className="px-4 py-4">
        <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">Metadata</span>
        <div className="mt-2 space-y-1.5">
          {[['Status', 'Active'], ['Channel', providerLabel], ['Owner', '-']].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">{label}</span>
              <span className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmailComposePanel - email thread + reply box
// ─────────────────────────────────────────────────────────────────────────────

function EmailComposePanel({ contact, provider, onShowDetails, showDetails, onBack, onSentSuccess, onForward }: {
  contact: EmailContact;
  provider: EmailProvider;
  onShowDetails: () => void;
  showDetails: boolean;
  onBack: () => void;
  onSentSuccess?: (id: string) => void;
  onForward?: (opts: { to?: string; subject?: string; body?: string }) => void;
}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['original']));
  const [showReplyBox, setShowReplyBox] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const replyTemplateBtnRef = useRef<HTMLButtonElement>(null);
  const providerColor = PROVIDER_COLOR[provider];
  const providerLabel = PROVIDER_LABEL[provider];
  const emailDetails = getEmailDetails(contact);
  const smartReplies = getSmartReplies(emailDetails.subject);

  const loadThread = useCallback(async () => {
    if (!contact.id) return;
    setLoadingThread(true);
    setThreadError(false);
    try {
      const res = await fetch(`${API}/messages?contact_id=${contact.id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : (data.messages ?? []));
    } catch (_err) {
      console.error('Failed to load thread messages:', _err);
      setThreadError(true);
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, [contact.id]);

  useEffect(() => {
    setSubject('');
    setBody('');
    setError('');
    setSent(false);
    setAttachments([]);
    setMessages([]);
    setExpandedIds(new Set(['original']));
    setShowReplyBox(false);
    setThreadError(false);
    loadThread();
  }, [contact.id, loadThread]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/send-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider: toBackendProvider(provider),
          recipients: [{ email: contact.email!, name: contact.contact_name ?? '', company: contact.company ?? '' }],
          subject: subject.trim(),
          body_html: body.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error ?? 'Send failed');
      }

      const optimistic: EmailMessage = {
        id: `opt-${Date.now()}`,
        contact_id: contact.id,
        direction: 'outbound',
        provider,
        subject: subject.trim(),
        body_html: body.trim(),
        preview_text: body.trim().slice(0, 200),
        status: 'sent',
        sent_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
      setSent(true);
      toast({
        title: 'Success',
        description: 'Reply sent successfully.',
      });
      onSentSuccess?.(contact.id);
      setTimeout(() => {
        setSent(false);
        setSubject('');
        setBody('');
        setAttachments([]);
        setShowReplyBox(false);
      }, 2000);
    } catch (err) {
      console.error('Email reply send failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      toast({
        title: 'Error sending reply',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSmartReply = (text: string) => {
    setSubject(`Re: ${emailDetails.subject}`);
    setBody(text);
    setShowReplyBox(true);
    setTimeout(() => bodyRef.current?.focus(), 50);
  };

  const insertVar = (v: string) => {
    const el = bodyRef.current;
    if (!el) { setBody(p => p + v); return; }
    insertAtCursor(el, body, setBody, v);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  };

  const handleForward = () => {
    onForward?.({
      subject: `Fwd: ${emailDetails.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${contact.contact_name ?? contact.email}\nSubject: ${emailDetails.subject}\n\n${emailDetails.snippet}`,
    });
  };

  const handleBold = () => bodyRef.current && wrapSelection(bodyRef.current, body, setBody, '**', 'bold text');
  const handleItalic = () => bodyRef.current && wrapSelection(bodyRef.current, body, setBody, '_', 'italic text');
  const handleLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url && bodyRef.current) insertAtCursor(bodyRef.current, body, setBody, `[link text](${url})`);
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    return d.toDateString() === today.toDateString()
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-[#2d2d2d]">
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3 border-b border-[#e0e0e0] dark:border-[#3c4043] flex-shrink-0">
        <button onClick={onBack} title="Back to inbox" aria-label="Back to inbox"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6] flex-shrink-0 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg sm:text-xl text-[#202124] dark:text-[#e8eaed] leading-tight">{emailDetails.subject}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {emailDetails.labels?.map(l => (
              <span key={l} className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: l === 'Social' ? '#34A853' : l === 'Promotions' ? '#F9AB00' : l === 'Updates' ? '#F9AB00' : '#5f6368' }}>
                {l}
              </span>
            ))}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#f1f3f4] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">Inbox</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button title="Print" aria-label="Print email"
            onClick={() => window.print()}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]">
            <Printer className="h-4 w-4" />
          </button>
          <button title="Open in new window" aria-label="Open in new window"
            onClick={() => window.open(window.location.href, '_blank')}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]">
            <ExternalLink className="h-4 w-4" />
          </button>
          <button onClick={loadThread} title="Refresh" aria-label="Refresh thread"
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]">
            <RefreshCw className={cn('h-4 w-4', loadingThread && 'animate-spin')} />
          </button>
          <button onClick={onShowDetails} title={showDetails ? 'Hide details' : 'Show details'} aria-label={showDetails ? 'Hide contact details' : 'Show contact details'}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-full transition-colors',
              showDetails ? 'bg-[#c2dbff] dark:bg-[#004a77] text-[#001D35] dark:text-[#c2e7ff]' : 'hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]',
            )}>
            {showDetails ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Thread area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-[#2d2d2d]">
        <div className="px-4 sm:px-8 py-6">
          {/* Sender row */}
          <div className="flex items-start gap-3">
            <Avatar name={contact.contact_name} id={contact.id} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-[#202124] dark:text-[#e8eaed]">{contact.contact_name ?? 'Unknown'}</span>
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">&lt;{contact.email}&gt;</span>
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] ml-auto whitespace-nowrap flex-shrink-0">{emailDetails.date}</span>
              </div>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">to me ▾</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button title="Star" aria-label="Star this email"
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                <Star className="h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6]" />
              </button>
              <button title="Reply" aria-label="Reply"
                onClick={() => { setSubject(`Re: ${emailDetails.subject}`); setShowReplyBox(true); }}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                <Reply className="h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6]" />
              </button>
              <button title="More options" aria-label="More options"
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                <MoreHorizontal className="h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6]" />
              </button>
            </div>
          </div>

          {/* Email body */}
          <div className="mt-5 ml-12 text-sm text-[#202124] dark:text-[#e8eaed] leading-relaxed whitespace-pre-wrap">
            {emailDetails.snippet}
          </div>

          {/* Smart reply chips */}
          <div className="flex flex-wrap gap-2 mt-6 ml-12">
            {smartReplies.map(reply => (
              <button key={reply} onClick={() => handleSmartReply(reply)}
                title={`Quick reply: ${reply}`} aria-label={`Quick reply: ${reply}`}
                className="px-4 py-1.5 rounded-full border border-[#c2c2c2] dark:border-[#5f6368] text-sm text-[#0b57d0] dark:text-[#7cacf8] hover:bg-[#e8f0fe] dark:hover:bg-[#004a77]/40 hover:border-[#4285f4] transition-colors font-medium">
                {reply}
              </button>
            ))}
          </div>

          {/* Reply / Forward */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-[#e0e0e0] dark:border-[#3c4043]/60">
            <button onClick={() => { setSubject(`Re: ${emailDetails.subject}`); setShowReplyBox(true); }}
              title="Reply" aria-label="Reply to this email"
              className="flex items-center gap-2 px-5 py-2 border border-[#dadce0] dark:border-[#3c4043] rounded-full text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] transition-colors">
              <Reply className="h-4 w-4" />Reply
            </button>
            <button onClick={() => { setSubject(`Re: ${emailDetails.subject}`); setShowReplyBox(true); }}
              title="Reply all" aria-label="Reply all"
              className="flex items-center gap-2 px-5 py-2 border border-[#dadce0] dark:border-[#3c4043] rounded-full text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] transition-colors">
              <ReplyAll className="h-4 w-4" />Reply all
            </button>
            <button onClick={handleForward} title="Forward" aria-label="Forward this email"
              className="flex items-center gap-2 px-5 py-2 border border-[#dadce0] dark:border-[#3c4043] rounded-full text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] transition-colors">
              <Forward className="h-4 w-4" />Forward
            </button>
          </div>
        </div>

        {/* Thread error */}
        {threadError && (
          <div className="mx-4 sm:mx-8 mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-2" role="alert">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Could not load thread history.
            <button onClick={loadThread} className="ml-auto text-amber-700 dark:text-amber-400 underline">Retry</button>
          </div>
        )}

        {/* Thread messages */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-3 px-3 sm:px-6 pb-4">
            {messages.map(msg => {
              const isOut = msg.direction === 'outbound';
              const exp = expandedIds.has(msg.id);
              return (
                <div key={msg.id} className={cn('border border-[#e0e0e0] dark:border-[#3c4043] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow', isOut ? 'ml-3 sm:ml-8' : '')}>
                  <button type="button" className="w-full flex items-start gap-4 px-3 sm:px-6 py-4 text-left hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043]"
                    onClick={() => toggleExpand(msg.id)} aria-expanded={exp}
                    aria-label={`${isOut ? 'Sent' : 'Received'}: ${msg.subject || '(no subject)'}`}>
                    <span className="h-2 w-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: isOut ? providerColor : '#9ca3af' }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">{isOut ? 'You' : (contact.contact_name ?? contact.email)}</span>
                        {isOut && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: providerColor }}>{providerLabel}</span>}
                        <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] ml-auto">{fmtDate(msg.sent_at)}</span>
                      </div>
                      <p className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]/80 truncate mt-0.5">{msg.subject || '(no subject)'}</p>
                      {!exp && <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate mt-0.5">{msg.preview_text || msg.body_html?.replace(/<[^>]+>/g, '').slice(0, 120) || ''}</p>}
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0 mt-0.5 transition-transform', exp && 'rotate-180')} />
                  </button>
                  {exp && (
                    <div className="px-3 sm:px-6 pb-5 pt-3 border-t border-[#e0e0e0] dark:border-[#3c4043]/60">
                      {msg.body_html
                        ? <div
                          className="prose prose-sm max-w-none text-sm dark:prose-invert"
                          // sanitizeHtml strips dangerous content - replace with DOMPurify.sanitize() in production
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.body_html) }}
                        />
                        : <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] italic">No content</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={threadEndRef} className="h-4" />
      </div>

      {/* Inline reply box */}
      {showReplyBox && (
        <div className="mx-2 sm:mx-6 mb-2 sm:mb-4 border border-[#e0e0e0] dark:border-[#3c4043] rounded-2xl shadow-[0_1px_3px_rgba(60,64,67,.15)] overflow-hidden flex-shrink-0">
          <div className="px-5 py-2.5 border-b border-[#e0e0e0] dark:border-[#3c4043] flex items-center gap-3 text-sm">
            <span className="text-[#5f6368] dark:text-[#9aa0a6]">Reply to</span>
            <span className="font-medium text-[#202124] dark:text-[#e8eaed]">{contact.contact_name ?? contact.email}</span>
            <button title="Close reply" aria-label="Close reply composer"
              onClick={() => { setShowReplyBox(false); setSubject(''); setBody(''); setError(''); }}
              className="ml-auto h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-5 py-2 border-b border-[#e0e0e0] dark:border-[#3c4043]/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] w-14">Subject</span>
              <input
                className="flex-1 bg-transparent text-sm focus:outline-none text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6]/60"
                placeholder="Email subject..." value={subject} onChange={e => setSubject(e.target.value)} aria-label="Reply subject"
              />
            </div>
          </div>
          <div className="px-5 pt-2 pb-1 relative">
            <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
              placeholder={`Hi ${contact.contact_name?.split(' ')[0] ?? '{name}'},\n\nWrite your reply here...`}
              aria-label="Reply body"
              className="w-full h-24 bg-transparent text-sm resize-none focus:outline-none text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6]/50"
            />
            {showTemplate && (
              <InlineTemplatePicker
                anchorRef={replyTemplateBtnRef}
                onSelect={t => { setSubject(t.subject); setBody(t.body_html ?? t.body ?? ''); setShowTemplate(false); }}
                onClose={() => setShowTemplate(false)}
              />
            )}
          </div>
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {['{name}', '{first_name}', '{company}', '{email}'].map(v => (
              <button key={v} onClick={() => insertVar(v)} aria-label={`Insert variable ${v}`}
                className="px-2 py-0.5 rounded bg-[#f1f3f4] dark:bg-[#3c4043] border border-[#dadce0] dark:border-[#3c4043] text-[10px] font-mono text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#0b57d0] dark:hover:text-[#7cacf8] hover:border-[#4285f4]/40 transition-colors">
                {v}
              </button>
            ))}
          </div>
          {error && (
            <div className="mx-5 mb-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              <AlertCircle className="h-3.5 w-3.5" />{error}
            </div>
          )}
          <div className="px-4 py-2.5 border-t border-[#e0e0e0] dark:border-[#3c4043]/60 flex items-center gap-2">
            <button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim() || !contact.email}
              aria-label={sent ? 'Sent' : sending ? 'Sending' : 'Send reply'}
              className="flex items-center gap-2 h-9 px-5 rounded-full text-white text-sm font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: sent ? '#188038' : providerColor }}>
              {sent ? <><Check className="h-4 w-4" />Sent!</> : sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><Send className="h-4 w-4" />Send</>}
            </button>
            <div className="flex items-center gap-0.5">
              <button
                ref={replyTemplateBtnRef}
                type="button"
                title="Insert template"
                aria-label="Insert template"
                onClick={() => setShowTemplate(v => !v)}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-full transition-colors',
                  showTemplate
                    ? 'bg-[#c2dbff] dark:bg-[#004a77] text-[#001D35] dark:text-[#c2e7ff]'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]',
                )}
              >
                <FileText className="h-4 w-4" />
              </button>
              <TBtn icon={Paperclip} label="Attach file" onClick={() => fileRef.current?.click()} />
              <input ref={fileRef} type="file" multiple className="hidden" onChange={e => setAttachments(p => [...p, ...Array.from(e.target.files ?? [])])} aria-label="Attach files" />
              <TBtn icon={Bold} label="Bold" onClick={handleBold} />
              <TBtn icon={Italic} label="Italic" onClick={handleItalic} />
              <TBtn icon={Link2} label="Insert link" onClick={handleLink} />
            </div>
            {attachments.length > 0 && (
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1 ml-auto">
                <Paperclip className="h-3 w-3" />{attachments.length}
              </span>
            )}
            <button title="Discard draft" aria-label="Discard draft"
              className="h-8 w-8 rounded-full hover:bg-[#fce8e6] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#d93025] flex items-center justify-center ml-auto transition-colors"
              onClick={() => { setShowReplyBox(false); setSubject(''); setBody(''); setError(''); }}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmailGroupWindow
// ─────────────────────────────────────────────────────────────────────────────

const EmailGroupWindow = memo(function EmailGroupWindow({ group, provider, onBack, onGroupDeleted, onGroupUpdated }: {
  group: EmailGroup;
  provider: EmailProvider;
  onBack: () => void;
  onGroupDeleted: () => void;
  onGroupUpdated?: () => void;
}) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<EmailGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const providerColor = PROVIDER_COLOR[provider];

  // Hosted providers (Gmail / Outlook) route through LAD-Email-Comms;
  // custom SMTP still uses the legacy WABA-Comms email surface.
  const isHosted = provider === 'gmail' || provider === 'outlook';

  const loadGroupDetails = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const url = isHosted
        ? `/api/email-comms/groups/${group.id}`
        : `${API}/groups/${group.id}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (isHosted) {
        // LAD-Email-Comms returns the group with `members: [{contact_id,
        // email, contact_name, company, ...}]`. Map to the local
        // EmailContact shape (which uses `id` for the contact PK).
        const mapped: EmailGroupDetail = {
          ...(data as EmailGroup),
          members: (data.members ?? []).map((m: {
            contact_id: string;
            email: string;
            contact_name: string | null;
            company: string | null;
          }) => ({
            id: m.contact_id,
            email: m.email,
            contact_name: m.contact_name,
            company: m.company,
            channel: group.channel,
          })),
        };
        setDetail(mapped);
      } else if (data.success) {
        setDetail(data.data);
      } else {
        throw new Error(data.error ?? 'Unknown error');
      }
    } catch (_err) {
      console.error('Failed to load group details:', _err);
      setLoadError(true);
      // Legacy fallback keeps the mock member preview so the UI doesn't
      // look broken even when the backend is unreachable.
      if (!isHosted) {
        setDetail({ ...group, members: MOCK_CONTACTS.slice(0, Math.min(group.member_count || 3, 5)) });
      } else {
        setDetail({ ...group, members: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [group.id, group, isHosted]);

  useEffect(() => {
    loadGroupDetails();
  }, [loadGroupDetails]);

  const handleRemoveMember = async (contactId: string) => {
    setRemovingId(contactId);
    try {
      const url = isHosted
        ? `/api/email-comms/groups/${group.id}/contacts/${contactId}`
        : `${API}/groups/${group.id}/contacts/${contactId}`;
      const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
      // LAD-Email-Comms returns 204 on success; legacy returns 200 + body.
      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP error ${res.status}`);
      }
      toast({
        title: 'Success',
        description: 'Member removed from group.',
      });
      await loadGroupDetails();
      onGroupUpdated?.();
    } catch (err) {
      console.error('Failed to remove group member:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove member from group.',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteGroup = async () => {
    setDeleting(true);
    try {
      const url = isHosted
        ? `/api/email-comms/groups/${group.id}`
        : `${API}/groups/${group.id}`;
      const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP error ${res.status}`);
      }
      toast({
        title: 'Success',
        description: 'Group deleted successfully.',
      });
      setShowDeleteConfirm(false);
      onGroupDeleted();
    } catch (err) {
      console.error('Failed to delete group:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete group.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const visibleMembers = (detail?.members ?? []).filter(m =>
    !search || (m.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) || (m.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-[#2d2d2d]">
      <div className="h-14 px-4 flex items-center gap-3 border-b border-[#e0e0e0] dark:border-[#3c4043] flex-shrink-0">
        <button onClick={onBack} title="Back" aria-label="Back to email list"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
          <ArrowLeft className="h-5 w-5 text-[#444746] dark:text-[#9aa0a6]" />
        </button>
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: group.color }}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate text-[#202124] dark:text-[#e8eaed]">{group.name}</h3>
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            {PROVIDER_LABEL[provider]} broadcast · {detail?.member_count ?? group.member_count} members
            {loadError && <span className="ml-1 text-amber-500">(showing cached data)</span>}
          </p>
        </div>
        <button onClick={() => setShowSend(true)} disabled={!detail || (detail?.member_count ?? 0) === 0}
          title="Send email to group" aria-label="Send email to this group"
          className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full text-white text-sm font-medium disabled:opacity-40"
          style={{ backgroundColor: providerColor }}>
          <Send className="h-3.5 w-3.5" /><span className="hidden sm:inline">Send Email</span>
        </button>
        <button onClick={() => setShowImport(true)} title="Add members" aria-label="Add members"
          className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full border border-[#dadce0] dark:border-[#3c4043] text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043]">
          <UserPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Add Members</span>
        </button>
        <button
          onClick={() => loadGroupDetails()}
          title="Refresh group members"
          aria-label="Refresh group members"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading
        ? <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" /></div>
        : (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4 gap-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Members', value: detail?.member_count ?? 0, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600' },
                { label: 'Channel', value: PROVIDER_LABEL[provider], bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600' },
                { label: 'Status', value: 'Active', bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600' },
              ].map(({ label, value, bg, color }) => (
                <div key={label} className="p-3 rounded-xl border border-[#e0e0e0] dark:border-[#3c4043] bg-white dark:bg-[#2d2d2d]">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', bg, color)}>
                    {label === 'Members' ? <Users className="h-4 w-4" /> : label === 'Channel' ? <Mail className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </div>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">{label}</p>
                  <p className="font-semibold text-sm text-[#202124] dark:text-[#e8eaed]">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#2d2d2d] rounded-xl border border-[#e0e0e0] dark:border-[#3c4043] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e0e0e0] dark:border-[#3c4043] flex items-center justify-between gap-3 flex-shrink-0">
                <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">Members ({visibleMembers.length})</span>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]" />
                  <input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search members"
                    className="h-8 text-xs pl-8 w-full border border-[#dadce0] dark:border-[#3c4043] rounded-full px-3 focus:outline-none focus:border-[#4285f4] bg-transparent text-[#202124] dark:text-[#e8eaed]" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {visibleMembers.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center h-40 text-[#5f6368] dark:text-[#9aa0a6]">
                      <Users className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">{search ? 'No members match your search' : 'No members yet'}</p>
                    </div>
                  )
                  : visibleMembers.map(member => (
                    <div key={member.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043] group/member border-b border-[#f0f0f0] dark:border-white/5 last:border-0">
                      <Avatar name={member.contact_name} id={member.id} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#202124] dark:text-[#e8eaed]">{member.contact_name ?? 'Unknown'}</p>
                        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate">{member.email}{member.company ? ` · ${member.company}` : ''}</p>
                      </div>
                      <button
                        className="opacity-0 group-hover/member:opacity-100 h-7 w-7 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-opacity"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        title={`Remove ${member.contact_name}`}
                        aria-label={`Remove ${member.contact_name} from group`}>
                        {removingId === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <button onClick={() => setShowDeleteConfirm(true)} title="Delete group" aria-label="Delete this group"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors">
              <Trash2 className="h-4 w-4" />Delete group
            </button>
          </div>
        )}

      {showDeleteConfirm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#2d2d2d] border border-[#dadce0] dark:border-[#3c4043] rounded-xl shadow-xl p-5 mx-4 w-full max-w-sm">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-[#202124] dark:text-[#e8eaed]">
              <Trash2 className="h-4 w-4 text-red-500" />Delete &ldquo;{group.name}&rdquo;?
            </h3>
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mb-4">This group and all its members will be permanently deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-9 rounded-full border border-[#dadce0] dark:border-[#3c4043] text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                Cancel
              </button>
              <button onClick={handleDeleteGroup} disabled={deleting}
                className="flex-1 h-9 rounded-full bg-red-500 text-white text-sm hover:bg-red-600 flex items-center justify-center gap-1 disabled:opacity-60">
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportLeadsDialog
          open={showImport}
          onOpenChange={setShowImport}
          onImportComplete={() => {
            loadGroupDetails();
            onGroupUpdated?.();
          }}
          channel={provider}
          emailGroupId={group.id}
        />
      )}
      {showSend && detail && <EmailTemplatePicker open={showSend} onOpenChange={setShowSend} group={detail} provider={provider} />}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main EmailChannelView
// ─────────────────────────────────────────────────────────────────────────────

export function EmailChannelView({ provider, connectedEmail, userImage, onSignOut }: EmailChannelViewProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [groups, setGroups] = useState<EmailGroup[]>([]);
  const [labels, setLabels] = useState<EmailLabels[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactSearch, setContactSearch] = useState('');

  const [activeContact, setActiveContact] = useState<EmailContact | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeGroup, setActiveGroup] = useState<EmailGroup | null>(null);
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');


  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [importantIds, setImportantIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [showImport, setShowImport] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState('');
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [createLabelError, setCreateLabelError] = useState('');
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [composeWindows, setComposeWindows] = useState<ComposeInstance[]>([]);

  const [showSearchFilter, setShowSearchFilter] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterHasWords, setFilterHasWords] = useState('');
  const [filterNoWords, setFilterNoWords] = useState('');
  const [filterHasAttachment, setFilterHasAttachment] = useState(false);
  const [filterNoChatInclude, setFilterNoChatInclude] = useState(false);

  const [activeRightPanel, setActiveRightPanel] = useState<string | null>(null);
  const [contactPanelSearch, setContactPanelSearch] = useState('');

  const createGroupRef = useRef<HTMLDivElement>(null);

  // ── Compose window helpers ─────────────────────────────────────────────────
  const openCompose = useCallback((opts: { to?: string; subject?: string; body?: string } = {}) => {
    const id = `compose-${Date.now()}`;
    setComposeWindows(prev => [...prev, { id, minimized: false, maximized: false, ...opts }]);
  }, []);
  const closeCompose = useCallback((id: string) => setComposeWindows(prev => prev.filter(w => w.id !== id)), []);
  const minimizeCompose = useCallback((id: string) => setComposeWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true, maximized: false } : w)), []);
  const maximizeCompose = useCallback((id: string) => setComposeWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: false, maximized: !w.maximized } : w)), []);
  const restoreCompose = useCallback((id: string) => setComposeWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: false, maximized: false } : w)), []);

  // ── Data loaders ───────────────────────────────────────────────────────────
  //
  // Gmail / Outlook short-circuit:
  // The legacy /api/email-conversations/{contacts,groups,labels} endpoints
  // proxy to LAD-WABA-Comms - those email surfaces don't exist there yet
  // and the calls 502 in the network panel. The Sent folder is now powered
  // by LAD-Email-Comms (EmailBroadcastsSentList), so the legacy fetches buy
  // us nothing for those providers. Skip them and set empty state.
  // For 'custom' SMTP we still fall through to the legacy path so any
  // future / existing WABA-side email-contacts work continues to function.
  const isHostedProvider = provider === 'gmail' || provider === 'outlook';

  const loadContacts = useCallback(async (search = '') => {
    if (isHostedProvider) {
      setContacts([]);
      setLoadingContacts(false);
      return;
    }
    setLoadingContacts(true);
    try {
      const qs = new URLSearchParams({ limit: '500', ...(search ? { search } : {}) });
      const res = await fetch(`${API}/contacts?${qs}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.data?.length) {
        setContacts(data.data);
        setLoadingContacts(false);
        return;
      }
    } catch {
      // Silently fall back to mock data - backend endpoint may not be implemented yet
    }
    const filtered = search
      ? MOCK_CONTACTS.filter(c =>
        (c.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase()),
      )
      : MOCK_CONTACTS;
    setContacts(filtered);
    setLoadingContacts(false);
  }, [isHostedProvider]);

  const loadGroups = useCallback(async () => {
    // Hosted providers (Gmail / Outlook) fetch groups from LAD-Email-Comms
    // via /api/email-comms/groups. The response shape maps 1:1 to the local
    // EmailGroup interface (id, name, color, description, channel,
    // member_count) so no adapter is needed.
    if (isHostedProvider) {
      try {
        const res = await fetch(
          `/api/email-comms/groups?channel=${provider}`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setGroups(data.groups ?? []);
      } catch (err) {
        console.error('[EmailChannelView] failed to load email-comms groups', err);
        setGroups([]);
      }
      return;
    }
    // Custom SMTP still uses the legacy WABA-Comms email-groups endpoint.
    try {
      const res = await fetch(`${API}/groups?channel=${provider}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.data?.length) {
        setGroups(data.data);
        return;
      }
    } catch {
      // Silently fall back to mock data - backend endpoint may not be implemented yet
    }
    setGroups(MOCK_GROUPS.filter(g => g.channel === provider));
  }, [provider, isHostedProvider]);

  const loadLabels = useCallback(async () => {
    if (isHostedProvider) {
      setLabels([]);
      return;
    }
    try {
      const res = await fetch(`${API}/labels?channel=${provider}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.data?.length) {
        setLabels(data.data);
        return;
      }
    } catch {
      // Silently fall back to mock data - backend endpoint may not be implemented yet
    }
    setLabels(MOCK_LABELS.filter(g => g.channel === provider));
  }, [provider, isHostedProvider]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadGroups(); }, [loadGroups, groupRefreshKey]);
  useEffect(() => { loadLabels(); }, [loadLabels, groupRefreshKey]);

  useEffect(() => {
    const t = setTimeout(() => loadContacts(contactSearch), 300);
    return () => clearTimeout(t);
  }, [contactSearch, loadContacts]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node))
        setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);
  useEffect(() => {
    if (!rowMenuId) return;
    const handler = () => setRowMenuId(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [rowMenuId]);

  useEffect(() => {
    if (!showSearchFilter) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-filter]') && !target.closest('[aria-label="Search options"]')) {
        setShowSearchFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearchFilter]);

  // ── Selection / interaction helpers ───────────────────────────────────────
  const toggleStar = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStarredIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }, []);

  const toggleImportant = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImportantIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }, []);

  const handleMarkSent = useCallback((id: string) => setSentIds(prev => new Set([...prev, id])), []);

  const handleDeleteContact = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletedIds(prev => new Set([...prev, id]));
    setActiveContact(prev => prev?.id === id ? null : prev);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }, []);

  const exitSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    let list = contacts.filter(c => !deletedIds.has(c.id));
    if (activeFolder === 'starred') list = list.filter(c => starredIds.has(c.id));
    else if (activeFolder === 'important') list = list.filter(c => importantIds.has(c.id));
    else if (activeFolder === 'sent') list = list.filter(c => sentIds.has(c.id));
    else if (activeFolder === 'inbox') {
      list = list.filter(c => getEmailDetails(c).category === 'primary');
    }
    return list;
  }, [contacts, deletedIds, activeFolder, starredIds, importantIds, sentIds]);

  const paginatedContacts = useMemo(
    () => filteredContacts.slice(page * pageSize, (page + 1) * pageSize),
    [filteredContacts, page],
  );

  const selectedContacts = useMemo(
    () => contacts.filter(c => selectedIds.has(c.id)),
    [contacts, selectedIds],
  );

  const bulkSendGroup = useMemo((): EmailGroupDetail | null => {
    if (!selectedContacts.length) return null;
    return {
      id: 'bulk',
      name: `${selectedContacts.length} contacts`,
      color: PROVIDER_COLOR[provider],
      description: null,
      channel: provider,
      member_count: selectedContacts.length,
      members: selectedContacts,
    };
  }, [selectedContacts, provider]);

  const unreadCount = useMemo(
    () => contacts.filter(c => !deletedIds.has(c.id) && getEmailDetails(c).unread && getEmailDetails(c).category === 'primary').length,
    [contacts, deletedIds],
  );

  // ── Create group ───────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreateGroupError('');
    setCreatingGroup(true);

    // Hosted providers (Gmail / Outlook) → LAD-Email-Comms POST /groups.
    // Response is the created group as { id, name, color, ... } - no
    // { success, data } envelope. Insert it directly into state.
    if (isHostedProvider) {
      try {
        const res = await fetch('/api/email-comms/groups', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            name,
            channel: provider,
            color: PROVIDER_COLOR[provider],
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || err.error || `HTTP ${res.status}`);
        }
        const created = await res.json();
        setGroups(p => [created, ...p]);
        setNewGroupName('');
        setShowCreateGroup(false);
        setActiveGroup(created);
        toast({
          title: 'Success',
          description: `Group "${name}" created successfully.`,
        });
      } catch (err) {
        console.error('[EmailChannelView] failed to create hosted group', err);
        setCreateGroupError(
          err instanceof Error ? err.message : 'Failed to create group.',
        );
      }
      setCreatingGroup(false);
      return;
    }

    // Custom SMTP falls through to the legacy WABA-Comms endpoint.
    try {
      const res = await fetch(`${API}/groups`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, channel: provider, color: PROVIDER_COLOR[provider] }),
      });
      const data = await res.json();
      const created = data.data ?? data.group ?? (data.success ? { id: `g-${Date.now()}`, name, color: PROVIDER_COLOR[provider], description: null, channel: provider, member_count: 0 } : null);
      if (created) {
        setGroups(p => [created, ...p]);
        setNewGroupName('');
        setShowCreateGroup(false);
        setActiveGroup(created);
        toast({
          title: 'Success',
          description: `Group "${name}" created successfully.`,
        });
      } else {
        setCreateGroupError(data.error ?? 'Failed to create group.');
      }
    } catch (_err) {
      console.error('Failed to create group:', _err);
      const mockCreated = { id: `g-${Date.now()}`, name, color: PROVIDER_COLOR[provider], description: null, channel: provider, member_count: 0 };
      setGroups(p => [mockCreated, ...p]);
      setNewGroupName('');
      setShowCreateGroup(false);
      setActiveGroup(mockCreated);
      toast({
        title: 'Info',
        description: `Group "${name}" created in offline mode.`,
      });
    }
    setCreatingGroup(false);
  };

  // ── Create label ──────────────────────────────────────────────────────────
  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    // Same Phase-2 gate as handleCreateGroup - see the comment there.
    if (isHostedProvider) {
      setCreatingLabel(false);
      setCreateLabelError('');
      setShowCreateLabel(false);
      setNewLabelName('');
      toast({
        title: 'Coming soon',
        description: 'Labels for Gmail / Outlook arrive with LAD-Email-Comms Phase 2.',
      });
      return;
    }
    setCreatingLabel(true);
    setCreateLabelError('');
    try {
      const res = await fetch(`${API}/labels`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, channel: provider, color: PROVIDER_COLOR[provider] }),
      });
      const data = await res.json();
      const created = data.data ?? data.label ?? (data.success ? { id: `l-${Date.now()}`, name, color: PROVIDER_COLOR[provider], description: null, channel: provider } : null);
      if (created) {
        setLabels(p => [created, ...p]);
        setNewLabelName('');
        setShowCreateLabel(false);
        toast({
          title: 'Success',
          description: `Label "${name}" created successfully.`,
        });
      } else {
        setCreateLabelError(data.error ?? 'Failed to create label.');
      }
    } catch (_err) {
      console.error('Failed to create label:', _err);
      const mockCreated = { id: `l-${Date.now()}`, name, color: PROVIDER_COLOR[provider], description: null, channel: provider };
      setLabels(p => [mockCreated, ...p]);
      setNewLabelName('');
      setShowCreateLabel(false);
      toast({
        title: 'Info',
        description: `Label "${name}" created in offline mode.`,
      });
    }
    setCreatingLabel(false);
  };

  const providerColor = PROVIDER_COLOR[provider];

  const folderNavItems = [
    { id: 'inbox' as FolderType, label: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'starred' as FolderType, label: 'Starred', icon: Star, count: starredIds.size },
    { id: 'snoozed' as FolderType, label: 'Snoozed', icon: Clock, count: 0 },
    { id: 'important' as FolderType, label: 'Important', icon: Tag, count: importantIds.size },
    { id: 'sent' as FolderType, label: 'Sent', icon: Send, count: sentIds.size },
    { id: 'drafts' as FolderType, label: 'Drafts', icon: FileText, count: 0 },
    { id: 'spam' as FolderType, label: 'Spam', icon: AlertCircle, count: 0 },
    { id: 'trash' as FolderType, label: 'Trash', icon: Trash2, count: 0 },
  ];

  const visibleWindows = composeWindows.filter(w => !w.minimized);
  const minimizedWindows = composeWindows.filter(w => w.minimized);

  // ── Active group view ──────────────────────────────────────────────────────
  if (activeGroup) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F6F8FC] dark:bg-[#1f1f1f] overflow-hidden relative">
        <EmailGroupWindow
          group={activeGroup}
          provider={provider}
          onBack={() => setActiveGroup(null)}
          onGroupDeleted={() => { setActiveGroup(null); setGroupRefreshKey(k => k + 1); loadGroups(); }}
          onGroupUpdated={() => loadGroups()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F6F8FC] dark:bg-[#1f1f1f] overflow-hidden relative">

      {/* ── Top Bar ── */}
      <header className="h-[64px] flex-shrink-0 flex items-center px-3 gap-2 bg-[#F6F8FC] dark:bg-[#1f1f1f]">
        {/* Left: fixed width matching sidebar so search aligns with email list */}
        <div className="flex items-center gap-1 flex-shrink-0 w-auto md:w-[240px]">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            title="Main menu"
            aria-label="Toggle main menu"
            className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]"
          >
            <Menu className="h-4 w-4 md:h-5 md:w-5 text-[#444746] dark:text-[#9aa0a6]" />
          </button>
          <div className="hidden md:flex items-center gap-2 ml-1">
            {provider === 'gmail' ? (
              <>
                <svg viewBox="0 0 24 24" className="h-7 w-auto flex-shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 18V8.4L12 13l6-4.6V18H6z" fill="#EA4335" />
                  <path d="M2 6.5A2.5 2.5 0 014.5 4H6v2L2 8.4V6.5z" fill="#C5221F" />
                  <path d="M22 6.5A2.5 2.5 0 0019.5 4H18v2l4 2.4V6.5z" fill="#C5221F" />
                  <path d="M2 8.4V18a2 2 0 002 2h2V8.4L12 13l6-4.6V20h2a2 2 0 002-2V8.4L12 13 2 8.4z" fill="#4285F4" />
                  <path d="M6 4H4.5A2.5 2.5 0 002 6.5V8.4l4-2.4V4z" fill="#FBBC04" />
                  <path d="M18 4h1.5A2.5 2.5 0 0122 6.5V8.4l-4-2.4V4z" fill="#34A853" />
                </svg>
                <span
                  className="text-[22px] text-[#5f6368] dark:text-[#9aa0a6] font-normal tracking-tight hidden sm:inline select-none"
                  style={{ fontFamily: 'Google Sans, Roboto, sans-serif' }}
                >
                  Gmail
                </span>
              </>
            ) : (
              <span className="text-base font-semibold" style={{ color: providerColor }}>
                {PROVIDER_LABEL[provider]}
              </span>
            )}
          </div>
        </div>
        {/* Search: flex-1 so it starts right after logo, matching Gmail */}
        <div className="flex-1 min-w-0 max-w-[720px]">
          <div className="relative h-10 md:h-[46px] flex items-center bg-[#EAF1FB] dark:bg-[#2d2d2d] hover:bg-[#E0EBF5] focus-within:bg-white dark:focus-within:bg-[#2d2d2d] focus-within:shadow-[0_1px_3px_rgba(60,64,67,.3)] rounded-full transition-all">
            <Search className="absolute left-3 md:left-4 h-4 w-4 md:h-5 md:w-5 text-[#444746] dark:text-[#9aa0a6] pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search in mail"
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              aria-label="Search in mail"
              className="w-full h-full bg-transparent pl-9 pr-9 md:pl-12 md:pr-12 text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6] focus:outline-none focus:ring-0"
            />
            <button
              title="Search options"
              aria-label="Search options"
              onClick={() => setShowSearchFilter(v => !v)}
              className="absolute right-2 md:right-3 h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          </div>
        </div>
        {/* Advanced Search Filter Panel */}
        {showSearchFilter && (
          <div data-search-filter className="absolute top-[64px] left-1/2 -translate-x-1/2 w-full max-w-[660px] z-50 bg-white dark:bg-[#2d2d2d] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-[0_4px_16px_rgba(60,64,67,.3)] overflow-hidden"
            style={{ marginLeft: '120px' }}
          >
            <div className="px-6 py-4 space-y-3 text-sm">
              {[
                { label: 'From', value: filterFrom, set: setFilterFrom, placeholder: '' },
                { label: 'To', value: filterTo, set: setFilterTo, placeholder: '' },
                { label: 'Subject', value: filterSubject, set: setFilterSubject, placeholder: '' },
                { label: 'Has the words', value: filterHasWords, set: setFilterHasWords, placeholder: '' },
                { label: "Doesn't have", value: filterNoWords, set: setFilterNoWords, placeholder: '' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-32 text-right text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0">{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 h-8 border-b border-[#dadce0] dark:border-[#3c4043] bg-transparent text-[#202124] dark:text-[#e8eaed] outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] text-sm px-1"
                  />
                </div>
              ))}

              {/* Size row */}
              <div className="flex items-center gap-3">
                <span className="w-32 text-right text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0">Size</span>
                <select className="h-8 border border-[#dadce0] dark:border-[#3c4043] rounded bg-white dark:bg-[#2d2d2d] text-[#202124] dark:text-[#e8eaed] text-sm px-2 focus:outline-none">
                  <option>greater than</option>
                  <option>less than</option>
                </select>
                <input type="number" placeholder="" className="w-20 h-8 border-b border-[#dadce0] dark:border-[#3c4043] bg-transparent text-[#202124] dark:text-[#e8eaed] focus:outline-none text-sm px-1" />
                <select className="h-8 border border-[#dadce0] dark:border-[#3c4043] rounded bg-white dark:bg-[#2d2d2d] text-[#202124] dark:text-[#e8eaed] text-sm px-2 focus:outline-none">
                  <option>MB</option>
                  <option>KB</option>
                  <option>Bytes</option>
                </select>
              </div>

              {/* Date within row */}
              <div className="flex items-center gap-3">
                <span className="w-32 text-right text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0">Date within</span>
                <select className="h-8 border border-[#dadce0] dark:border-[#3c4043] rounded bg-white dark:bg-[#2d2d2d] text-[#202124] dark:text-[#e8eaed] text-sm px-2 focus:outline-none">
                  <option>1 day</option>
                  <option>3 days</option>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>2 months</option>
                  <option>6 months</option>
                  <option>1 year</option>
                </select>
                <input type="date" className="h-8 border border-[#dadce0] dark:border-[#3c4043] rounded bg-white dark:bg-[#2d2d2d] text-[#202124] dark:text-[#e8eaed] text-sm px-2 focus:outline-none" />
              </div>

              {/* Search in row */}
              <div className="flex items-center gap-3">
                <span className="w-32 text-right text-[#5f6368] dark:text-[#9aa0a6] flex-shrink-0">Search</span>
                <select className="h-8 border border-[#dadce0] dark:border-[#3c4043] rounded bg-white dark:bg-[#2d2d2d] text-[#202124] dark:text-[#e8eaed] text-sm px-2 focus:outline-none flex-1">
                  <option>All Mail</option>
                  <option>Inbox</option>
                  <option>Starred</option>
                  <option>Sent</option>
                  <option>Drafts</option>
                  <option>Spam</option>
                  <option>Trash</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pl-36">
                <label className="flex items-center gap-2 cursor-pointer text-[#202124] dark:text-[#e8eaed]">
                  <input
                    type="checkbox"
                    checked={filterHasAttachment}
                    onChange={e => setFilterHasAttachment(e.target.checked)}
                    className="rounded border-[#dadce0] text-[#1a73e8] h-4 w-4"
                  />
                  Has attachment
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[#202124] dark:text-[#e8eaed]">
                  <input
                    type="checkbox"
                    checked={filterNoChatInclude}
                    onChange={e => setFilterNoChatInclude(e.target.checked)}
                    className="rounded border-[#dadce0] text-[#1a73e8] h-4 w-4"
                  />
                  {"Don't include chats"}
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-3 flex items-center justify-end gap-3 border-t border-[#e0e0e0] dark:border-[#3c4043]">
              <button
                onClick={() => {
                  setShowSearchFilter(false);
                }}
                className="px-4 h-9 rounded-full text-sm text-[#0b57d0] dark:text-[#8ab4f8] hover:bg-[#e8f0fe] dark:hover:bg-[#004a77]/40 font-medium transition-colors"
              >
                Create filter
              </button>
              <button
                onClick={() => {
                  const terms = [
                    filterFrom && `from:${filterFrom}`,
                    filterTo && `to:${filterTo}`,
                    filterSubject && `subject:${filterSubject}`,
                    filterHasWords,
                    filterHasAttachment && 'has:attachment',
                  ].filter(Boolean).join(' ');
                  setContactSearch(terms);
                  setShowSearchFilter(false);
                }}
                className="px-5 h-9 rounded-full bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1557b0] transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        )}
        {/* Right: icons - Gmail order: Help → Settings → Apps → Avatar */}
        <div className="flex items-center gap-0.5 flex-shrink-0 pl-1 md:pl-2 ml-auto">
          <button
            onClick={() => setShowImport(true)}
            title="Import leads"
            aria-label="Import leads"
            className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]"
          >
            <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button
            title="Help"
            aria-label="Help"
            className="hidden sm:flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]"
          >
            <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button
            title="Settings"
            aria-label="Settings"
            className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]"
          >
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button
            title="Profile"
            aria-label="View profile"
            onClick={() => setShowProfileModal(v => !v)}
            className="ml-1 h-7 w-7 md:h-8 md:w-8 flex-shrink-0 rounded-full overflow-hidden hover:ring-2 hover:ring-[#dadce0] dark:hover:ring-[#3c4043] transition-all"
          >
            {userImage
              ? <Image src={userImage} alt={connectedEmail?.charAt(0) ?? 'User'} width={32} height={32} className="h-full w-full object-cover" />
              : (
                <div className="h-full w-full flex items-center justify-center bg-[#1a73e8] text-white text-xs md:text-sm font-medium uppercase select-none">
                  {connectedEmail?.charAt(0) ?? '?'}
                </div>
              )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 gap-0 px-0 pb-0 relative">

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden absolute inset-0 z-30 bg-black/20"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Left Sidebar ── */}
        <aside className={cn(
          'flex flex-col py-2 transition-[width,transform] duration-200 overflow-hidden bg-[#F6F8FC] dark:bg-[#1f1f1f]',
          'absolute inset-y-0 left-0 z-40 md:static md:z-auto md:inset-auto md:flex-shrink-0',
          sidebarOpen
            ? 'w-[255px] pr-3 shadow-xl md:shadow-none'
            : 'w-0 -translate-x-full md:translate-x-0 md:w-[72px] md:pr-0',
        )} aria-label="Mail navigation">

          {/* Compose Button */}
          <div className={cn('pb-4 flex flex-shrink-0', sidebarOpen ? 'px-3 justify-start' : 'px-0 justify-center')}>
            <button
              onClick={() => { openCompose(); if (window.innerWidth < 768) setSidebarOpen(false); }}
              title="Compose new email"
              aria-label="Compose new email"
              className={cn(
                'h-14 flex items-center rounded-2xl shadow-[0_1px_2px_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] hover:shadow-md transition-all font-medium text-sm bg-[#C2E7FF] dark:bg-[#004a77] text-[#001D35] dark:text-[#c2e7ff]',
                sidebarOpen ? 'gap-3 pl-6 pr-3 w-full' : 'justify-center w-14',
              )}
            >
              <Pencil className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {sidebarOpen && <span>Compose</span>}
            </button>
          </div>

          {/* Scrollable nav area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">

            {/* Folder nav */}
            <nav className="flex flex-col gap-0.5 flex-shrink-0" aria-label="Mail folders">
              {folderNavItems.map(f => {
                const isActive = activeFolder === f.id;
                return (
                  <button key={f.id}
                    onClick={() => {
                      setActiveFolder(f.id);
                      setActiveContact(null);
                      setPage(0);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    aria-label={`${f.label}${f.count > 0 ? `, ${f.count} unread` : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center w-full h-8 text-sm transition-colors text-left flex-shrink-0',
                      sidebarOpen
                        ? 'rounded-r-full justify-between pl-6 pr-4'
                        : 'rounded-full justify-center',
                      isActive
                        ? 'bg-[#D3E3FD] dark:bg-[#004a77] text-[#001D35] dark:text-[#c2e7ff] font-semibold'
                        : 'text-[#202124] dark:text-[#e8eaed] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] font-normal',
                    )}>
                    <div className={cn('flex items-center min-w-0', sidebarOpen ? 'gap-4' : '')}>
                      <f.icon
                        className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-[#001D35] dark:text-[#c2e7ff]' : 'text-[#444746] dark:text-[#9aa0a6]')}
                        style={f.id === 'inbox' && isActive ? { color: '#EA4335' } : {}}
                        aria-hidden="true"
                      />
                      {sidebarOpen && <span className="truncate">{f.label}</span>}
                    </div>
                    {sidebarOpen && f.count > 0 && (
                      <span className={cn('text-xs tabular-nums flex-shrink-0', isActive && 'font-semibold')} aria-hidden="true">
                        {f.count > 999 ? '999+' : f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Labels */}
            <div className="mt-1 pt-2 border-t border-[#e0e0e0] dark:border-[#3c4043] flex-shrink-0">
              {sidebarOpen ? (
                <>
                  <div className="px-3 py-2 flex items-center justify-between pl-6">
                    <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">Labels</span>
                    <button onClick={() => { setCreateLabelError(''); setShowCreateLabel(true); }}
                      title="Create new label" aria-label="Create new label"
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]">
                      <Plus className="h-4 w-4 text-[#444746] dark:text-[#9aa0a6]" />
                    </button>
                  </div>
                  {showCreateLabel && (
                    <div ref={createGroupRef} className="px-3 pb-3 space-y-2">
                      <input
                        autoFocus
                        placeholder="Label name..."
                        value={newLabelName}
                        onChange={e => { setNewLabelName(e.target.value); setCreateLabelError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); if (e.key === 'Escape') setShowCreateLabel(false); }}
                        aria-label="New label name"
                        className="h-8 text-sm w-full border border-[#dadce0] dark:border-[#3c4043] rounded-full px-3 focus:outline-none focus:border-[#4285f4] bg-transparent text-[#202124] dark:text-[#e8eaed]"
                      />
                      {/* BUG FIX: was showing createGroupError instead of createLabelError */}
                      {createLabelError && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1" role="alert">
                          <AlertCircle className="h-3 w-3" />{createLabelError}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        <button onClick={handleCreateLabel} disabled={creatingLabel || !newLabelName.trim()} aria-label="Create label"
                          className="flex-1 h-7 text-xs text-white rounded-full flex items-center justify-center disabled:opacity-40" style={{ backgroundColor: providerColor }}>
                          {creatingLabel && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Create
                        </button>
                        <button onClick={() => { setShowCreateLabel(false); setCreateLabelError(''); }} aria-label="Cancel label creation"
                          className="h-7 text-xs px-3 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto">
                    {labels.length === 0
                      ? <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] text-center py-4 px-6">No labels yet. Create one above.</p>
                      : labels.map(g => (
                        <button key={g.id} onClick={() => { setActiveGroup(g as unknown as EmailGroup); if (window.innerWidth < 768) setSidebarOpen(false); }}
                          aria-label={`Open label: ${g.name}`}
                          className="w-full flex items-center gap-3 pl-6 pr-4 py-1.5 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-left rounded-r-full">
                          <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
                          <span className="flex-1 text-sm text-[#202124] dark:text-[#e8eaed] truncate">{g.name}</span>
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {labels.map(g => (
                    <button key={g.id} onClick={() => { setActiveGroup(g as unknown as EmailGroup); if (window.innerWidth < 768) setSidebarOpen(false); }}
                      title={g.name} aria-label={`Open label: ${g.name}`}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]">
                      <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Broadcast Groups */}
            <div className="mt-1 pt-2 border-t border-[#e0e0e0] dark:border-[#3c4043] flex-shrink-0">
              {sidebarOpen ? (
                <>
                  <div className="px-3 py-2 flex items-center justify-between pl-6">
                    <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">Broadcast Groups</span>
                    <button onClick={() => { setCreateGroupError(''); setShowCreateGroup(true); }}
                      title="Create new broadcast group" aria-label="Create new broadcast group"
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]">
                      <Plus className="h-4 w-4 text-[#444746] dark:text-[#9aa0a6]" />
                    </button>
                  </div>
                  {showCreateGroup && (
                    <div className="px-3 pb-3 space-y-2">
                      <input
                        autoFocus
                        placeholder="Group name..."
                        value={newGroupName}
                        onChange={e => { setNewGroupName(e.target.value); setCreateGroupError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setShowCreateGroup(false); }}
                        aria-label="New group name"
                        className="h-8 text-sm w-full border border-[#dadce0] dark:border-[#3c4043] rounded-full px-3 focus:outline-none focus:border-[#4285f4] bg-transparent text-[#202124] dark:text-[#e8eaed]"
                      />
                      {createGroupError && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1" role="alert">
                          <AlertCircle className="h-3 w-3" />{createGroupError}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        <button onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()} aria-label="Create group"
                          className="flex-1 h-7 text-xs text-white rounded-full flex items-center justify-center disabled:opacity-40" style={{ backgroundColor: providerColor }}>
                          {creatingGroup && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Create
                        </button>
                        <button onClick={() => { setShowCreateGroup(false); setCreateGroupError(''); }} aria-label="Cancel group creation"
                          className="h-7 text-xs px-3 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto">
                    {groups.length === 0
                      ? <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] text-center py-4 px-6">No groups yet. Create one above.</p>
                      : groups.map(g => (
                        <button key={g.id} onClick={() => { setActiveGroup(g); if (window.innerWidth < 768) setSidebarOpen(false); }}
                          aria-label={`Open group: ${g.name}, ${g.member_count} members`}
                          className="w-full flex items-center gap-3 pl-6 pr-4 py-1.5 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-left rounded-r-full">
                          <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
                          <span className="flex-1 text-sm text-[#202124] dark:text-[#e8eaed] truncate">{g.name}</span>
                          <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]" aria-hidden="true">{g.member_count}</span>
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {groups.map(g => (
                    <button key={g.id} onClick={() => { setActiveGroup(g); if (window.innerWidth < 768) setSidebarOpen(false); }}
                      title={g.name} aria-label={`Open group: ${g.name}`}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]">
                      <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>{/* end scrollable area */}

          {/* Meet - pinned to bottom */}
          <div className="mt-auto pt-2 border-t border-[#e0e0e0] dark:border-[#3c4043] flex-shrink-0">
            {sidebarOpen ? (
              <>
                <p className="text-xs font-semibold text-[#202124] dark:text-[#e8eaed] pl-6 py-1">Meet</p>
                <button title="New meeting" aria-label="New meeting"
                  className="flex items-center gap-4 w-full pl-6 py-1.5 text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-r-full">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" aria-hidden="true">
                    <rect width="24" height="24" fill="none" />
                    <path d="M20 5h-3V3.5a1.5 1.5 0 00-3 0V5h-4V3.5a1.5 1.5 0 00-3 0V5H4C2.9 5 2 5.9 2 7v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" fill="#34A853" />
                  </svg>
                  New meeting
                </button>
                <button title="Join a meeting" aria-label="Join a meeting"
                  className="flex items-center gap-4 w-full pl-6 py-1.5 text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-r-full">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" aria-hidden="true">
                    <rect width="24" height="24" fill="none" />
                    <path d="M15 8v8H5V8h10m1-2H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4V7a1 1 0 00-1-1z" fill="#1E88E5" />
                  </svg>
                  Join a meeting
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 py-1">
                <button title="New meeting" aria-label="New meeting"
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <rect width="24" height="24" fill="none" />
                    <path d="M20 5h-3V3.5a1.5 1.5 0 00-3 0V5h-4V3.5a1.5 1.5 0 00-3 0V5H4C2.9 5 2 5.9 2 7v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" fill="#34A853" />
                  </svg>
                </button>
                <button title="Join a meeting" aria-label="Join a meeting"
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <rect width="24" height="24" fill="none" />
                    <path d="M15 8v8H5V8h10m1-2H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4V7a1 1 0 00-1-1z" fill="#1E88E5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main
          className={cn(
            'flex-1 flex min-w-0 min-h-0 overflow-hidden bg-white dark:bg-[#2d2d2d] rounded-2xl border border-[#dadce0] dark:border-[#3c4043]/80 shadow-sm mr-2 mb-2',
            activeContact ? 'flex-row' : 'flex-col',
          )}
          aria-label="Email content"
        >
          {activeContact ? (
            <>
              <EmailComposePanel
                contact={activeContact}
                provider={provider}
                showDetails={showDetails}
                onShowDetails={() => setShowDetails(v => !v)}
                onBack={() => setActiveContact(null)}
                onSentSuccess={handleMarkSent}
                onForward={openCompose}
              />
              {showDetails && (
                <ContactDetailsPanel
                  contact={activeContact}
                  provider={provider}
                  groups={groups}
                  onClose={() => setShowDetails(false)}
                  onAddToGroup={() => setShowAddToGroup(true)}
                />
              )}
            </>
          ) : (
            <>
              {/* Toolbar */}
              <div className="h-12 px-3 flex items-center justify-between border-b border-[#e0e0e0] dark:border-[#3c4043] flex-shrink-0" role="toolbar" aria-label="Email list toolbar">
                <div className="flex items-center gap-1">
                  {/* Removed checkbox but can be put if needed */}
                  {/* <input
                    type="checkbox"
                    checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id))}
                    onChange={() => {
                      const allSel = paginatedContacts.every(c => selectedIds.has(c.id));
                      setSelectedIds(prev => {
                        const n = new Set(prev);
                        if (allSel) { paginatedContacts.forEach(c => n.delete(c.id)); } else { paginatedContacts.forEach(c => n.add(c.id)); }
                        return n;
                      });
                    }}
                    aria-label="Select all emails on this page"
                    className="appearance-none h-4 w-4 rounded border border-[#747775] dark:border-[#3b82f6] dark:bg-transparent checked:bg-[#0b57d0] dark:checked:bg-[#3b82f6] checked:border-[#0b57d0] dark:checked:border-[#3b82f6] cursor-pointer ml-1 relative transition-colors bg-no-repeat bg-center bg-[length:10px_10px] checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%20%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><polyline%20points=%2220%206%209%2017%204%2012%22/></svg>')]"
                  /> */}
                  <button onClick={() => { loadContacts(contactSearch); loadGroups(); }}
                    title="Refresh" aria-label="Refresh email list"
                    className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]">
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  {selectedIds.size > 0 ? (
                    <div className="flex items-center gap-1 border-l border-[#dadce0] dark:border-[#3c4043] pl-2 ml-1">
                      <button onClick={() => setShowBulkSend(true)} title="Send to selected" aria-label="Send email to selected contacts"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
                        <Send className="h-3.5 w-3.5" />Send
                      </button>
                      <button onClick={() => setShowAddToGroup(true)} title="Add to group" aria-label="Add selected to group"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
                        <Tag className="h-3.5 w-3.5" />Label
                      </button>
                      <button
                        onClick={() => {
                          setDeletedIds(p => { const n = new Set(p); selectedIds.forEach(id => n.add(id)); return n; });
                          exitSelection();
                        }}
                        title="Delete selected" aria-label="Delete selected emails"
                        className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#fce8e6] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6] hover:text-[#d93025]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { selectedIds.forEach(id => toggleStar(id)); setActiveFolder('starred'); exitSelection(); }}
                        title="Star selected" aria-label="Star selected emails"
                        className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]">
                        <Star className="h-4 w-4" />
                      </button>
                      <button onClick={exitSelection} aria-label="Cancel selection"
                        className="text-xs text-[#0b57d0] dark:text-[#7cacf8] font-medium px-2 hover:underline">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu(v => !v)}
                        title="More options"
                        aria-label="More options"
                        aria-haspopup="true"
                        aria-expanded={showMoreMenu}
                        className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#9aa0a6]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {showMoreMenu && (
                        <div
                          className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-[#2d2d2d] rounded-lg shadow-[0_2px_10px_rgba(60,64,67,.3),0_6px_28px_rgba(60,64,67,.15)] py-1 border border-[#e0e0e0] dark:border-[#3c4043]"
                          role="menu"
                          aria-label="More options menu"
                        >
                          <button
                            role="menuitem"
                            onClick={() => setShowMoreMenu(false)}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                          >
                            Mark all as read
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => {
                              paginatedContacts.forEach(c => handleToggleSelect(c.id));
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                          >
                            Select messages to see more actions
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {filteredContacts.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] pr-1">
                    <span className="hidden sm:inline" aria-live="polite">
                      {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredContacts.length)} of {filteredContacts.length}
                    </span>
                    <div className="flex">
                      <button disabled={page === 0} onClick={() => setPage(p => p - 1)} title="Previous page" aria-label="Previous page"
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] disabled:opacity-30">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button disabled={(page + 1) * pageSize >= filteredContacts.length} onClick={() => setPage(p => p + 1)} title="Next page" aria-label="Next page"
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] disabled:opacity-30">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>



              {/* Email list */}
              <div className="flex-1 overflow-y-auto" role="list" aria-label="Email list">
                {/*
                  Sent folder on Gmail / Outlook is powered by LAD-Email-Comms broadcasts.
                  The contacts list above is a legacy WhatsApp-derived view; for these
                  providers we swap in the broadcast panel so users see their actual
                  sent emails (subject, status, sent_count/recipient_count, live polling).
                  Compose lives inside the panel - uses useSendBroadcast hook.
                  For 'custom' provider or other folders, fall through to the existing
                  contacts-list path.
                */}
                {activeFolder === 'sent' && (provider === 'gmail' || provider === 'outlook') ? (
                  <EmailBroadcastsSentList />
                ) : loadingContacts ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-[#5f6368] dark:text-[#9aa0a6]" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="h-24 w-24 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: providerColor + '15' }}>
                      <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: providerColor + '25' }}>
                        <Inbox className="h-8 w-8" style={{ color: providerColor }} />
                      </div>
                    </div>
                    <h3 className="font-semibold text-base text-[#202124] dark:text-[#e8eaed] mb-1">
                      {activeFolder === 'inbox' ? 'Your inbox is empty' : `No ${activeFolder} emails yet`}
                    </h3>
                    <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-xs mb-6">Import your leads or compose a new email.</p>
                    <div className="flex gap-2">
                      <button onClick={() => openCompose()} aria-label="Compose new email"
                        className="flex items-center gap-2 px-4 h-9 rounded-full text-white text-sm" style={{ backgroundColor: providerColor }}>
                        <Pencil className="h-3.5 w-3.5" />Compose
                      </button>
                      <button onClick={() => setShowImport(true)} aria-label="Import leads"
                        className="flex items-center gap-2 px-4 h-9 rounded-full border border-[#dadce0] dark:border-[#3c4043] text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f6f8fc] dark:hover:bg-[#3c4043]">
                        <UserPlus className="h-3.5 w-3.5" />Import Leads
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {paginatedContacts.map(c => {
                      const details = getEmailDetails(c);
                      const isStarred = starredIds.has(c.id);
                      const isImportant = importantIds.has(c.id);
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <div
                          key={c.id}
                          role="listitem"
                          onClick={() => setActiveContact(c)}
                          className={cn(
                            'group flex items-center gap-1 px-4 py-2 border-b border-[#f0f0f0] dark:border-white/5 cursor-pointer select-none text-sm transition-shadow',
                            'hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)]',
                            'dark:hover:shadow-[inset_1px_0_0_rgba(255,255,255,0.06),inset_-1px_0_0_rgba(255,255,255,0.06),0_1px_2px_0_rgba(0,0,0,.4)]',
                            isSelected
                              ? 'bg-[#c2dbff] dark:bg-[#004a77]/50'
                              : details.unread
                                ? 'bg-white dark:bg-[#3c4043]'
                                : 'bg-[#f2f6fc] dark:bg-[#202124]',
                          )}
                        >
                          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(c.id)}
                              aria-label={`Select email from ${c.contact_name ?? c.email}`}
                              className="appearance-none h-3.5 w-3.5 rounded border border-[#747775] dark:border-[#3b82f6] dark:bg-transparent checked:bg-[#0b57d0] dark:checked:bg-[#3b82f6] checked:border-[#0b57d0] dark:checked:border-[#3b82f6] cursor-pointer relative transition-colors bg-no-repeat bg-center bg-[length:9px_9px] checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%20%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><polyline%20points=%2220%206%209%2017%204%2012%22/></svg>')]"
                            />
                            <button onClick={e => toggleStar(c.id, e)}
                              title={isStarred ? 'Unstar' : 'Star'}
                              aria-label={isStarred ? `Unstar ${c.contact_name}` : `Star ${c.contact_name}`}
                              aria-pressed={isStarred}
                              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                              <Star className={cn('h-4 w-4', isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-[#5f6368] dark:text-[#9aa0a6]/40')} />
                            </button>
                            <button onClick={e => toggleImportant(c.id, e)}
                              title={isImportant ? 'Not important' : 'Mark important'}
                              aria-label={isImportant ? `Mark ${c.contact_name} not important` : `Mark ${c.contact_name} important`}
                              aria-pressed={isImportant}
                              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                              <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('h-4 w-4', isImportant ? 'fill-yellow-400 text-yellow-400' : 'text-[#5f6368] dark:text-[#9aa0a6]/40')}>
                                <path d="M12 2L4 7l2 13h12l2-13z" />
                              </svg>
                            </button>
                          </div>

                          <div className={cn('w-28 sm:w-44 flex-shrink-0 truncate pr-2', details.unread ? 'font-bold text-[#202124] dark:text-[#e8eaed]' : 'font-normal text-[#202124] dark:text-[#e8eaed]')}>
                            {c.contact_name ?? 'Unknown'}
                          </div>

                          <div className="flex-1 min-w-0 pr-4 flex items-baseline gap-2 overflow-hidden">
                            {details.labels?.map(l => (
                              <span key={l} className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded text-white leading-none"
                                style={{ backgroundColor: l === 'Social' ? '#34A853' : l === 'Promotions' ? '#34A853' : l === 'Updates' ? '#F9AB00' : '#5f6368' }}>
                                {l}
                              </span>
                            ))}
                            <span className={cn('truncate', details.unread ? 'font-bold text-[#202124] dark:text-[#e8eaed]' : 'font-normal text-[#202124] dark:text-[#e8eaed]')}>
                              {details.subject}
                            </span>
                            <span className="text-[#5f6368] dark:text-[#9aa0a6] font-normal truncate max-w-xl hidden md:inline">
                              - {details.snippet.split('\n')[0]}
                            </span>
                          </div>

                          <div className="w-36 flex justify-end flex-shrink-0 relative">
                            <span className="group-hover:hidden text-[11px] text-[#5f6368] dark:text-[#9aa0a6] whitespace-nowrap font-medium">
                              {details.date}
                            </span>
                            <div className="hidden group-hover:flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteContact(c.id)}
                                title="Archive"
                                aria-label={`Archive email from ${c.contact_name}`}
                                className="p-1 rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(c.id)}
                                title="Delete"
                                aria-label={`Delete email from ${c.contact_name}`}
                                className="p-1 rounded-full hover:bg-[#fce8e6] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#d93025]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                title="Snooze"
                                aria-label={`Snooze ${c.contact_name}`}
                                className="p-1 rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]"
                              >
                                <Clock className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => { setSelectedIds(new Set([c.id])); setShowBulkSend(true); }}
                                title="Send"
                                aria-label={`Send email to ${c.contact_name}`}
                                className="p-1 rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                              <div className="relative">
                                <button
                                  onMouseDown={e => e.stopPropagation()}
                                  onClick={e => { e.stopPropagation(); setRowMenuId(prev => prev === c.id ? null : c.id); }}
                                  title="More"
                                  aria-label="More email options"
                                  className="p-1 rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                                {rowMenuId === c.id && (
                                  <div
                                    className="absolute right-0 top-full mt-1 z-50 w-72 bg-white dark:bg-[#2d2d2d] rounded-lg shadow-[0_2px_10px_rgba(60,64,67,.3),0_6px_28px_rgba(60,64,67,.15)] py-1 border border-[#e0e0e0] dark:border-[#3c4043]"
                                    role="menu"
                                    onMouseDown={e => e.stopPropagation()}
                                  >
                                    {[
                                      { label: 'Add to Tasks', action: () => setRowMenuId(null) },
                                      { label: 'Label as', action: () => { setSelectedIds(new Set([c.id])); setShowAddToGroup(true); setRowMenuId(null); } },
                                      { label: 'Forward as attachment', action: () => { openCompose({ subject: `Fwd: ${getEmailDetails(c).subject}` }); setRowMenuId(null); } },
                                      { label: 'Filter messages like these', action: () => setRowMenuId(null) },
                                      { label: 'Mute', action: () => setRowMenuId(null) },
                                      { label: 'Share to help improve Google', action: () => setRowMenuId(null) },
                                      { label: 'Switch to advanced toolbar', action: () => setRowMenuId(null) },
                                    ].map(item => (
                                      <button
                                        key={item.label}
                                        role="menuitem"
                                        onClick={item.action}
                                        className="w-full text-left px-4 py-2.5 text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="py-6 flex flex-col items-center gap-1 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                      <span>{filteredContacts.length.toLocaleString()} conversations</span>
                      <span className="flex gap-2">
                        <a href="#" className="text-[#0b57d0] dark:text-[#7cacf8] hover:underline">Terms</a>
                        <span>·</span>
                        <a href="#" className="text-[#0b57d0] dark:text-[#7cacf8] hover:underline">Privacy</a>
                        <span>·</span>
                        <a href="#" className="text-[#0b57d0] dark:text-[#7cacf8] hover:underline">Program Policies</a>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right sidebar - Google apps + sliding panels */}
        <div className="hidden md:flex flex-shrink-0 flex-row">

          {/* Panel content - slides in when an icon is active */}
          {activeRightPanel && (
            <div className="w-[300px] border-l border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#2d2d2d] flex flex-col overflow-hidden mb-2 rounded-2xl mr-1 shadow-sm">

              {/* ── Calendar Panel ── */}
              {activeRightPanel === 'Google Calendar' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043]">
                    <span className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">CALENDAR</span>
                    <div className="flex items-center gap-1">
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button onClick={() => setActiveRightPanel(null)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#dadce0] dark:border-[#3c4043]">
                    <span className="text-sm font-medium text-[#1a73e8]">
                      {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                        <ChevronLeft className="h-4 w-4 text-[#5f6368]" />
                      </button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                        <ChevronRight className="h-4 w-4 text-[#5f6368]" />
                      </button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]">
                        <MoreVertical className="h-4 w-4 text-[#5f6368]" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-2 py-1 text-xs text-[#5f6368] dark:text-[#9aa0a6] text-center py-3">
                      GMT+05:30
                    </div>
                    {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => (
                      <div key={hour} className="flex items-start gap-2 px-3 py-2 border-b border-[#f0f0f0] dark:border-white/5 min-h-[48px]">
                        <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] w-10 flex-shrink-0 pt-0.5">
                          {hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
                        </span>
                        <div className="flex-1" />
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-center">
                    <button className="px-4 py-1.5 rounded-full border border-[#dadce0] dark:border-[#3c4043] text-sm text-[#1a73e8] hover:bg-[#e8f0fe] transition-colors">
                      Today
                    </button>
                  </div>
                </>
              )}

              {/* ── Tasks Panel ── */}
              {activeRightPanel === 'Google Tasks' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043]">
                    <span className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">TASKS</span>
                    <div className="flex items-center gap-1">
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button onClick={() => setActiveRightPanel(null)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
                    <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">My Tasks ▾</span>
                    <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368]">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043]">
                    <button className="flex items-center gap-2 text-sm text-[#1a73e8] hover:bg-[#e8f0fe] w-full px-3 py-2 rounded-full transition-colors">
                      <Plus className="h-4 w-4" /> Add a task
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
                    <div className="w-20 h-20 opacity-60">
                      <svg viewBox="0 0 80 80" fill="none">
                        <circle cx="55" cy="30" r="18" fill="#e8f0fe" />
                        <rect x="10" y="45" width="40" height="6" rx="3" fill="#dadce0" />
                        <rect x="10" y="57" width="30" height="6" rx="3" fill="#dadce0" />
                        <circle cx="55" cy="30" r="10" fill="#4285f4" opacity="0.6" />
                        <path d="M50 30l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">No tasks yet</p>
                    <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Add your to-dos and keep track of them across Google Workspace</p>
                  </div>
                </>
              )}

              {/* ── Keep Notes Panel ── */}
              {activeRightPanel === 'Google Keep' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043]">
                    <span className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">KEEP</span>
                    <div className="flex items-center gap-1">
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <Search className="h-4 w-4" />
                      </button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button onClick={() => setActiveRightPanel(null)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
                    <input placeholder="Take a note..." className="flex-1 bg-transparent text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] focus:outline-none" />
                    <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4]">
                      <Check className="h-4 w-4 text-[#5f6368]" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                    <div className="w-16 h-16">
                      <svg viewBox="0 0 64 64" fill="none">
                        <rect x="8" y="8" width="48" height="48" rx="4" fill="#FBBC04" />
                        <rect x="16" y="20" width="32" height="4" rx="2" fill="white" opacity="0.8" />
                        <rect x="16" y="30" width="24" height="4" rx="2" fill="white" opacity="0.6" />
                        <rect x="16" y="40" width="28" height="4" rx="2" fill="white" opacity="0.6" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">No notes yet</p>
                    <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Your notes from Google Keep will show up here.</p>
                    <div className="space-y-2 w-full mt-2">
                      {['Android devices', 'iPhone & iPad', 'Web app', 'Chrome extension'].map(item => (
                        <button key={item} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-sm text-[#1a73e8] transition-colors">
                          <span className="h-2 w-2 rounded-full bg-[#FBBC04] flex-shrink-0" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Contacts Panel ── */}
              {activeRightPanel === 'Google Contacts' && (
                <>
                  <div className="flex items-center justify-between px-3 py-3 border-b border-[#dadce0] dark:border-[#3c4043]">
                    <div className="relative flex-1 mr-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f6368]" />
                      <input
                        placeholder="Search..."
                        value={contactPanelSearch}
                        onChange={e => setContactPanelSearch(e.target.value)}
                        className="w-full h-8 pl-9 pr-3 bg-[#f1f3f4] dark:bg-[#3c4043] rounded-full text-sm text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368]">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button onClick={() => setActiveRightPanel(null)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-[#5f6368]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-3">
                      <button className="flex items-center gap-2 text-sm text-[#1a73e8] hover:bg-[#e8f0fe] w-full px-3 py-2 rounded-full transition-colors">
                        <Plus className="h-4 w-4" /> Create contact
                      </button>
                    </div>
                    {contacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-[#e8f0fe] flex items-center justify-center">
                          <UserPlus className="h-6 w-6 text-[#1a73e8]" />
                        </div>
                        <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">No contacts yet</p>
                      </div>
                    ) : (
                      <>
                        {contacts.filter(c =>
                          !contactPanelSearch ||
                          (c.contact_name ?? '').toLowerCase().includes(contactPanelSearch.toLowerCase()) ||
                          (c.email ?? '').toLowerCase().includes(contactPanelSearch.toLowerCase())
                        ).slice(0, 30).map(c => (
                          <div key={c.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] cursor-pointer">
                            <div className={cn('h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0', avatarGradient(c.id))}>
                              {getInitials(c.contact_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-[#202124] dark:text-[#e8eaed]">{c.contact_name ?? 'Unknown'}</p>
                              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate">{c.email}</p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Icon strip */}
          <div className="w-12 flex flex-col items-center pt-2 gap-3" aria-label="Google apps">
            {[
              { color: '#4285F4', label: 'Google Calendar', path: 'M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z' },
              { color: '#FBBC04', label: 'Google Keep', path: 'M9 21h6v-2H9v2zm3-19C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z' },
              { color: '#34A853', label: 'Google Tasks', path: 'M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.25l1.44-1.44A9.9 9.9 0 0012 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39l-1.61 1.61z' },
              { color: '#EA4335', label: 'Google Contacts', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },
            ].map(({ color, label, path }) => (
              <button
                key={label}
                title={label}
                aria-label={label}
                onClick={() => setActiveRightPanel(prev => prev === label ? null : label)}
                className={cn(
                  'h-10 w-10 flex items-center justify-center rounded-full transition-colors',
                  activeRightPanel === label
                    ? 'bg-[#e8f0fe] dark:bg-[#004a77]'
                    : 'hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]'
                )}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d={path} fill={color} />
                </svg>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── Compose Windows ── */}
      {visibleWindows.map((w, i) => (
        <div key={w.id} style={!w.maximized ? { right: `${72 + i * 524}px` } : undefined}>
          <ComposeWindow
            provider={provider}
            contacts={contacts}
            initialTo={w.initialTo}
            initialSubject={w.initialSubject}
            initialBody={w.initialBody}
            minimized={false}
            maximized={w.maximized}
            onClose={() => closeCompose(w.id)}
            onMinimize={() => minimizeCompose(w.id)}
            onMaximize={() => maximizeCompose(w.id)}
            onSent={() => loadContacts()}
          />
        </div>
      ))}

      {/* ── Minimized compose taskbar ── */}
      {minimizedWindows.length > 0 && (
        <div className="fixed bottom-0 right-0 sm:right-[72px] z-50 flex items-end gap-2 pointer-events-none">
          {minimizedWindows.map(w => (
            <div key={w.id} className="pointer-events-auto">
              <ComposeWindow
                provider={provider}
                contacts={contacts}
                initialTo={w.initialTo}
                initialSubject={w.initialSubject}
                initialBody={w.initialBody}
                minimized={true}
                onClose={() => closeCompose(w.id)}
                onMinimize={() => minimizeCompose(w.id)}
                onMaximize={() => restoreCompose(w.id)}
                onSent={() => loadContacts()}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      {showImport && (
        <ImportLeadsDialog
          open={showImport}
          onOpenChange={setShowImport}
          onImportComplete={() => { loadContacts(); loadGroups(); }}
          channel={provider}
        />
      )}
      {showBulkSend && bulkSendGroup && (
        <EmailTemplatePicker
          open={showBulkSend}
          onOpenChange={o => { setShowBulkSend(o); if (!o) exitSelection(); }}
          group={bulkSendGroup}
          provider={provider}
        />
      )}
      {showAddToGroup && (
        <AddToGroupModal
          groups={groups}
          provider={provider}
          contactIds={activeContact && !selectedIds.size ? [activeContact.id] : Array.from(selectedIds)}
          onDone={() => { setShowAddToGroup(false); exitSelection(); loadGroups(); }}
          onClose={() => setShowAddToGroup(false)}
        />
      )}

      {/* ── Profile / Account modal ── */}
      {showProfileModal && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowProfileModal(false)} aria-hidden="true" />
          <div
            className="absolute top-14 right-2 z-[70] w-[340px] sm:w-[380px] bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-[0_8px_28px_rgba(60,64,67,.28),0_2px_8px_rgba(60,64,67,.14)] overflow-hidden"
            role="dialog" aria-label="Account menu" aria-modal="true"
          >
            {/* Email + close */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#e0e0e0] dark:border-[#3c4043]">
              <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{connectedEmail}</span>
              <button onClick={() => setShowProfileModal(false)} title="Close" aria-label="Close account menu"
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] ml-2 flex-shrink-0">
                <X className="h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6]" />
              </button>
            </div>

            {/* Avatar + greeting */}
            <div className="px-6 py-5 flex flex-col items-center text-center gap-3">
              <div className="relative">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-[#1a73e8] flex items-center justify-center text-white text-3xl font-medium select-none">
                  {userImage
                    ? <Image src={userImage} alt="Profile photo" width={80} height={80} className="h-full w-full object-cover" />
                    : (connectedEmail?.charAt(0)?.toUpperCase() ?? '?')}
                </div>
                <label
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#e8eaed] dark:bg-[#3c4043] border-2 border-white dark:border-[#2d2d2d] flex items-center justify-center hover:bg-[#dadce0] dark:hover:bg-[#4a4a4a] transition-colors cursor-pointer"
                  title="Change profile photo" aria-label="Change profile photo">
                  <Camera className="h-3.5 w-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                  <input type="file" accept="image/*" className="hidden" aria-label="Upload profile photo" />
                </label>
              </div>
              <div>
                <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed]">
                  Hi, {connectedEmail?.split('@')[0] ?? 'there'}!
                </p>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">{connectedEmail}</p>
              </div>
              <button
                className="px-6 py-2 border border-[#dadce0] dark:border-[#3c4043] rounded-full text-sm text-[#0b57d0] dark:text-[#7cacf8] hover:bg-[#e8f0fe] dark:hover:bg-[#004a77]/40 transition-colors font-medium">
                Manage your Google Account
              </button>
            </div>

            <div className="border-t border-[#e0e0e0] dark:border-[#3c4043]" />

            {/* Storage bar */}
            <div className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-[#e0e0e0] dark:bg-[#3c4043] rounded-full overflow-hidden">
                <div className="h-full bg-[#1a73e8] rounded-full" style={{ width: '61%' }} />
              </div>
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] whitespace-nowrap flex-shrink-0">61% of 15 GB used</span>
            </div>

            <div className="border-t border-[#e0e0e0] dark:border-[#3c4043]" />

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors text-sm text-[#202124] dark:text-[#e8eaed]">
                <UserPlus className="h-5 w-5 text-[#444746] dark:text-[#9aa0a6]" />
                Add another account
              </button>
              <button
                onClick={() => { setShowProfileModal(false); onSignOut?.(); }}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors text-sm text-[#202124] dark:text-[#e8eaed]">
                <LogOut className="h-5 w-5 text-[#444746] dark:text-[#9aa0a6]" />
                Sign out of all accounts
              </button>
            </div>

            <div className="border-t border-[#e0e0e0] dark:border-[#3c4043]" />

            {/* Privacy / Terms */}
            <div className="px-5 py-3 flex items-center justify-center gap-3">
              <a href="#" className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors">Privacy Policy</a>
              <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">·</span>
              <a href="#" className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors">Terms of Service</a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
