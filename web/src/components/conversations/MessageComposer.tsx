'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Send, Smile, X, Bot, User, Plus, Camera, FileText, Music,
  MapPin, Phone, BarChart2, Star, Calendar, Image as ImageIcon,
  ChevronRight, Loader2, Paperclip, LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Channel } from '@/types/conversation';
import { cn } from '@/lib/utils';
import type { RichMessagePayload, RichMessageType } from '@lad/frontend-features/conversations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuickReplyPicker } from './QuickReplyPicker';
import { TemplatePicker } from './TemplatePicker';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { fetchJson } from '@/lib/fetch-json';

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType = 'human' | 'ai';

/** A file selected by the user, pre-read as base64 for upload. */
interface PendingFile {
  id:         string;
  file:       File;
  base64:     string;       // raw base64 (no data: prefix)
  previewUrl: string;       // blob URL for UI preview
  mediaType:  'image' | 'video' | 'document' | 'audio';
}

export interface MessageComposerProps {
  channel:         Channel;
  /** Explicit backend routing channel - 'personal' for Baileys, 'waba' for Meta Graph API.
   *  When omitted, falls back to inferring from `channel` (always 'waba' for 'whatsapp'). */
  backendChannel?: 'personal' | 'waba';
  onSendMessage:   (payload: RichMessagePayload) => void;
  /** Broadcast-mode template send (no conversationId). When set, picking a
   *  template calls this instead of the per-conversation send endpoint. */
  onSendTemplate?: (templateName: string, languageCode: string, parameters: string[]) => void | Promise<void>;
  /** Broadcast-mode target count (selected groups) - shown in the template dialog. */
  broadcastTargetCount?: number;
  disabled?:       boolean;
  contactName?:    string;
  conversationId?: string;
  owner?:          string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CONV_API = '/api/whatsapp-conversations/conversations';

const channelPlaceholders: Partial<Record<Channel, string>> = {
  whatsapp: 'Type a message...',
  linkedin: 'Write a professional message...',
  gmail:    'Compose your email...',
};

const STICKER_ROWS = [
  ['😀','😂','🥹','😍','🥰','😎','🤩','😏'],
  ['😢','😭','😤','🤬','😱','🤯','🥳','😴'],
  ['👍','👎','❤️','🔥','💯','🎉','👏','🙏'],
  ['🐶','🐱','🌸','🌟','⭐','🍕','🎂','🏆'],
];

interface AttachItem { id: string; label: string; icon: React.ReactNode; bg: string; }
const ATTACH_ITEMS: AttachItem[] = [
  { id: 'gallery',  label: 'Photos & Video', icon: <ImageIcon className="w-6 h-6 text-white" />, bg: 'bg-purple-500' },
  { id: 'camera',   label: 'Camera',         icon: <Camera    className="w-6 h-6 text-white" />, bg: 'bg-pink-500'   },
  { id: 'document', label: 'Document',       icon: <FileText  className="w-6 h-6 text-white" />, bg: 'bg-blue-500'   },
  { id: 'audio',    label: 'Audio',          icon: <Music     className="w-6 h-6 text-white" />, bg: 'bg-orange-500' },
  { id: 'location', label: 'Location',       icon: <MapPin    className="w-6 h-6 text-white" />, bg: 'bg-green-500'  },
  { id: 'contact',  label: 'Contact',        icon: <Phone     className="w-6 h-6 text-white" />, bg: 'bg-teal-500'   },
  { id: 'poll',     label: 'Poll',           icon: <BarChart2 className="w-6 h-6 text-white" />, bg: 'bg-[#0b1957]'  },
  { id: 'sticker',  label: 'Sticker',        icon: <Star      className="w-6 h-6 text-white" />, bg: 'bg-yellow-500' },
  { id: 'event',    label: 'Event',          icon: <Calendar  className="w-6 h-6 text-white" />, bg: 'bg-indigo-500' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
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

// ── Sub-modals ─────────────────────────────────────────────────────────────────

function PollModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState(['', '']);

  const addOption    = () => options.length < 10 && setOptions([...options, '']);
  const updateOption = (i: number, v: string) => { const n=[...options]; n[i]=v; setOptions(n); };
  const removeOption = (i: number) => options.length > 2 && setOptions(options.filter((_,x)=>x!==i));

  const handleSend = () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) return;
    onSend({ type: 'poll', pollQuestion: question.trim(), pollOptions: validOpts });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center"><BarChart2 className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Create Poll</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Question</label>
            <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask a question..."
              className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Options</label>
            <div className="mt-1 space-y-2">
              {options.map((opt,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold shrink-0">{i+1}</span>
                  <input value={opt} onChange={e=>updateOption(i,e.target.value)} placeholder={`Option ${i+1}`}
                    className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
                  {options.length>2 && <button onClick={()=>removeOption(i)}><X className="w-4 h-4 text-zinc-400 hover:text-red-500"/></button>}
                </div>
              ))}
            </div>
            {options.length<10 && (
              <button onClick={addOption} className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3"/> Add option
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 justify-end">
          <button onClick={handleSend} disabled={!question.trim() || options.filter(o=>o.trim()).length<2}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-40 transition-colors">
            Send Poll
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [email,   setEmail]   = useState('');
  const [company, setCompany] = useState('');

  const handleSend = () => {
    if (!name.trim() || !phone.trim()) return;
    onSend({ type: 'contact', contactName: name.trim(), contactPhone: phone.trim(),
              contactEmail: email.trim() || undefined, contactCompany: company.trim() || undefined });
  };

  const fields = [
    { label: 'Full Name *',  value: name,    set: setName,    ph: 'John Doe'            },
    { label: 'Phone *',      value: phone,   set: setPhone,   ph: '+971501234567'       },
    { label: 'Email',        value: email,   set: setEmail,   ph: 'john@example.com'   },
    { label: 'Company',      value: company, set: setCompany, ph: 'Acme Inc.'           },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center"><Phone className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Share Contact</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(f=>(
            <div key={f.label}>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{f.label}</label>
              <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 justify-end">
          <button onClick={handleSend} disabled={!name.trim()||!phone.trim()}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-40 transition-colors">
            Share Contact
          </button>
        </div>
      </div>
    </div>
  );
}

function EventModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [title,    setTitle]    = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [location, setLocation] = useState('');
  const [note,     setNote]     = useState('');

  const handleSend = () => {
    if (!title.trim() || !date) return;
    let text = `📅 *Event: ${title.trim()}*`;
    text += `\n🗓️ ${date}${time ? ' at ' + time : ''}`;
    if (location.trim()) text += `\n📍 ${location.trim()}`;
    if (note.trim())     text += `\n📝 ${note.trim()}`;
    // Events are sent as formatted text (no native WA type)
    onSend({ type: 'text', content: text });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center"><Calendar className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Share Event</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Event Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Team Meeting"
              className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Date *</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Time</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Location</label>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Dubai, UAE"
              className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Note</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" rows={2}
              className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 justify-end">
          <button onClick={handleSend} disabled={!title.trim()||!date}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-40 transition-colors">
            Share Event
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationModal({ onClose, onSend }: { onClose: () => void; onSend: (p: RichMessagePayload) => void }) {
  const [gpsStatus, setGpsStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [coords,    setCoords]    = useState<{lat:number;lng:number}|null>(null);
  const [manual,    setManual]    = useState('');

  const getLocation = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('done'); },
      ()  => setGpsStatus('error'),
      { timeout: 10000 }
    );
  };

  const handleSend = () => {
    if (coords) {
      onSend({ type: 'location', latitude: coords.lat, longitude: coords.lng,
                locationName: 'My Location', locationAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` });
    } else if (manual.trim()) {
      // Manual address: send as location type; backend will build Google Maps link
      onSend({ type: 'location', locationName: manual.trim(), locationAddress: manual.trim(),
                latitude: 0, longitude: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center"><MapPin className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Share Location</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <button onClick={getLocation} disabled={gpsStatus==='loading'}
            className="w-full flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 flex items-center justify-center shrink-0">
              {gpsStatus==='loading' ? <Loader2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin"/> : <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {gpsStatus==='loading' ? 'Getting location…' : gpsStatus==='done' ? '✓ Location found' : 'Send Current Location'}
              </p>
              {coords     && <p className="text-xs text-zinc-500 dark:text-zinc-400">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
              {gpsStatus==='error' && <p className="text-xs text-red-500">Location access denied</p>}
              {gpsStatus==='idle'  && <p className="text-xs text-zinc-400 dark:text-zinc-500">Uses your device GPS</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 ml-auto"/>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"/><span className="text-xs text-zinc-400 font-medium">or</span><div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"/>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Enter address or place</label>
            <input value={manual} onChange={e=>setManual(e.target.value)} placeholder="e.g. Dubai Mall, UAE"
              className="mt-1 w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"/>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 justify-end">
          <button onClick={handleSend} disabled={!coords && !manual.trim()}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-40 transition-colors">
            Share Location
          </button>
        </div>
      </div>
    </div>
  );
}

// Organize emojis into sticker pack categories like WhatsApp
const STICKER_PACKS = {
  'recently': { label: '⏰ Recent', emojis: ['😀', '😂', '❤️', '👍', '🔥', '💯', '✨', '🎉'] },
  'smileys': { label: '😊 Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😏', '😒', '😞', '😔', '😠', '😠', '😡', '🤬', '😈', '👿', '💀', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'] },
  'hearts': { label: '❤️ Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❣️', '💢', '💥', '💫', '⭐', '✨', '🌟'] },
  'gestures': { label: '👍 Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '☝️', '👆', '👇', '☟', '👈', '👉', '👊', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🦾', '🦿', '👅', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️'] },
  'animals': { label: '🐶 Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦉', '🦜', '🦢', '🦗', '🕷️'] },
  'food': { label: '🍕 Food', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍆', '🍅', '🌶️', '🌽', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🥓', '🥔', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯', '🥛', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃'] },
  'activities': { label: '⚽ Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🛼', '🛹', '🛷', '🥌', '🎯', '🪀', '🪃', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎭', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🏎️', '🛵', '🦯', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🛼', '🚏', '⛽', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚋', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛰️', '🚁', '🛶', '⛵', '🚤', '🛳️', '🛲', '🚧', '⛽'] },
};

// ── Main component ─────────────────────────────────────────────────────────────

function StickerPicker({ onSelect, onClose }: { onSelect: (s: string) => void; onClose: () => void }) {
  const [activePack, setActivePack] = useState('recently');
  const [searchQuery, setSearchQuery] = useState('');
  const packs = Object.entries(STICKER_PACKS);
  const currentPack = STICKER_PACKS[activePack as keyof typeof STICKER_PACKS];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden flex flex-col max-h-96">
        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Stickers</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search via sticker store"
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-full text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50"
          />
        </div>

        {/* Sticker grid */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-8 gap-2">
            {currentPack.emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Pack tabs at bottom */}
        <div className="px-2 py-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto shrink-0">
          {packs.map(([key, pack]) => (
            <button
              key={key}
              onClick={() => setActivePack(key)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activePack === key
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {pack.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const MessageComposer = memo(function MessageComposer({
  channel, backendChannel: backendChannelProp, onSendMessage, onSendTemplate, broadcastTargetCount, disabled = false, contactName, conversationId, owner,
}: MessageComposerProps) {
  // Resolve which backend this conversation belongs to.
  // Explicit backendChannel prop takes priority. Every real caller (ChatWindow
  // via ConversationsPage) passes it as 'personal' | 'waba'; 'waba' is only a
  // safety default for the unreachable no-prop case.
  const resolvedBackendChannel: 'personal' | 'waba' = backendChannelProp ?? 'waba';

  // ── State ────────────────────────────────────────────────────────────────
  const [message,            setMessage]            = useState('');
  const [pendingFiles,       setPendingFiles]       = useState<PendingFile[]>([]);
  const [fileLoading,        setFileLoading]        = useState(false);
  const [agentType,          setAgentType]          = useState<AgentType>(owner === 'human_agent' ? 'human' : 'ai');
  const [showTakeoverDialog, setShowTakeoverDialog] = useState(false);
  /** Set when an AI/human handover was rejected, so the UI stops implying it worked. */
  const [ownershipError,     setOwnershipError]     = useState<string | null>(null);
  const [showAttachMenu,     setShowAttachMenu]     = useState(false);
  const [showStickers,       setShowStickers]       = useState(false);
  const [showPoll,           setShowPoll]           = useState(false);
  const [showContact,        setShowContact]        = useState(false);
  const [showEvent,          setShowEvent]          = useState(false);
  const [showLocation,       setShowLocation]       = useState(false);
  const [isTemplatePickerOpen,  setIsTemplatePickerOpen]  = useState(false);
  const [templateSending,       setTemplateSending]       = useState(false);
  const [templateSendResult,    setTemplateSendResult]    = useState<{ success: boolean; message: string } | null>(null);
  const [templateSendProgress,  setTemplateSendProgress]  = useState<{ sent: number; total: number; running: boolean } | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const galleryRef   = useRef<HTMLInputElement>(null);
  const cameraRef    = useRef<HTMLInputElement>(null);
  const documentRef  = useRef<HTMLInputElement>(null);
  const audioRef     = useRef<HTMLInputElement>(null);
  const attachBtnRef = useRef<HTMLDivElement>(null);

  // ── Sync owner → agentType ───────────────────────────────────────────────
  useEffect(() => { setAgentType(owner === 'human_agent' ? 'human' : 'ai'); }, [owner, conversationId]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`; }
  }, [message]);

  // ── Close attach menu on outside click ──────────────────────────────────
  useEffect(() => {
    if (!showAttachMenu) return;
    const h = (e: MouseEvent) => {
      if (attachBtnRef.current && !attachBtnRef.current.contains(e.target as Node))
        setShowAttachMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAttachMenu]);

  // ── Ownership API ─────────────────────────────────────────────────────────
  // Reports whether the change actually landed. This used to swallow every
  // failure into console.error while the caller had ALREADY flipped
  // `agentType`, so a rejected PATCH left the composer showing "human agent"
  // while the server still had the AI owning the thread — the AI kept replying
  // to a conversation its operator believed they had taken over. `fetchWithTenant`
  // does not throw on 4xx/5xx, so even an explicit reject arrived here as success.
  const updateOwnership = useCallback(async (newOwner: 'AI' | 'human_agent'): Promise<boolean> => {
    if (!conversationId) return true;
    setOwnershipError(null);
    try {
      await fetchJson(`${CONV_API}/${conversationId}/ownership`, {
        method: 'PATCH',
        body: JSON.stringify({ owner: newOwner }),
      });
      return true;
    } catch (err) {
      setOwnershipError(
        err instanceof Error ? err.message : 'Could not change who handles this conversation',
      );
      return false;
    }
  }, [conversationId]);

  const handleAgentTypeChange = useCallback((type: AgentType) => {
    if (type === 'human' && agentType === 'ai') setShowTakeoverDialog(true);
    else if (type === 'ai' && agentType === 'human') {
      setAgentType('ai');
      // Put the toggle back if the server refused, so it never claims a
      // handover that did not happen.
      void updateOwnership('AI').then((ok) => { if (!ok) setAgentType('human'); });
    }
  }, [agentType, updateOwnership]);

  const confirmTakeover = useCallback(() => {
    setAgentType('human');
    void updateOwnership('human_agent').then((ok) => { if (!ok) setAgentType('ai'); });
    setShowTakeoverDialog(false);
  }, [updateOwnership]);

  // ── File reading ──────────────────────────────────────────────────────────
  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileLoading(true);
    try {
      const additions: PendingFile[] = [];
      for (const file of Array.from(files)) {
        const base64 = await readFileAsBase64(file);
        additions.push({
          id:         `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          base64,
          previewUrl: URL.createObjectURL(file),
          mediaType:  inferMediaType(file),
        });
      }
      setPendingFiles(prev => [...prev, ...additions]);
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

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (disabled) return;

    // Send each pending file as its own message
    if (pendingFiles.length > 0) {
      for (const pf of pendingFiles) {
        onSendMessage({
          type:        pf.mediaType as RichMessageType,
          fileBase64:  pf.base64,
          filename:    pf.file.name,
          contentType: pf.file.type,
          caption:     message.trim() || undefined,
        });
        URL.revokeObjectURL(pf.previewUrl);
      }
      setPendingFiles([]);
      setMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    // Plain text
    if (message.trim()) {
      onSendMessage({ type: 'text', content: message.trim() });
      setMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  }, [disabled, pendingFiles, message, onSendMessage]);

  const handleRichSend = useCallback((payload: RichMessagePayload) => {
    onSendMessage(payload);
    setShowPoll(false); setShowContact(false); setShowEvent(false); setShowLocation(false);
  }, [onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleQuickReplySelect = useCallback((content: string) => {
    setMessage(content); textareaRef.current?.focus();
  }, []);

  // ── Template send (single-conversation mode) ──────────────────────────────
  const handleTemplateSendFromComposer = useCallback(async (
    templateName: string,
    languageCode: string,
    parameters: string[],
    _nameFormat: 'first' | 'full',
    _batch: { batchSize: number; delayMin: number; delayRandom: number; dailyLimit: number },
    headerParamCount: number,
    headerType: string,
    headerUrl: string,
    // The number the template lives on. A template exists on one WABA, so the
    // send has to leave from that number or Meta cannot find it.
    accountId: string,
  ) => {
    // Broadcast mode (no conversation): hand the template name + params to the
    // parent, which fans it out to the selected groups.
    if (!conversationId) {
      if (!onSendTemplate) return;
      setTemplateSending(true);
      setTemplateSendResult(null);
      try {
        await onSendTemplate(templateName, languageCode, parameters || []);
        setTemplateSendResult({ success: true, message: `Template "${templateName}" queued` });
        setTimeout(() => setIsTemplatePickerOpen(false), 400);
        setTimeout(() => setTemplateSendResult(null), 3000);
      } catch (err: any) {
        setTemplateSendResult({ success: false, message: err?.message || 'Failed to send template' });
      } finally {
        setTemplateSending(false);
      }
      return;
    }
    setTemplateSending(true);
    setTemplateSendResult(null);
    setTemplateSendProgress({ sent: 0, total: 1, running: true });
    try {
      const isPersonal = resolvedBackendChannel === 'personal';
      const CONV_API = '/api/whatsapp-conversations/conversations';

      let res: Response;
      if (isPersonal) {
        res = await fetchWithTenant(`${CONV_API}/bulk/send-template?channel=personal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_ids: [conversationId],
            template_name:    templateName,
            language_code:    languageCode,
            parameters:       parameters || [],
          }),
        });
      } else {
        res = await fetchWithTenant(`${CONV_API}/bulk?channel=${resolvedBackendChannel}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action:             'send-template',
            conversation_ids:   [conversationId],
            template_name:      templateName,
            language_code:      languageCode,
            parameters:         parameters || [],
            header_param_count: headerParamCount ?? 0,
            header_type:        headerType || '',
            header_url:         headerUrl || '',
            account_id:         accountId || '',
          }),
        });
      }

      const data = await res.json();
      const sent = data.sent || (data.success ? 1 : 0);
      const total = 1;

      // Update progress before checking for errors
      setTemplateSendProgress({ sent, total, running: false });

      if (!data.success || (data.failed && data.failed > 0)) {
        const firstFailed = data.results?.find((r: any) => r.status === 'failed');
        throw new Error(firstFailed?.error || data.error || 'Failed to send template');
      }
      setTemplateSendResult({ success: true, message: `Template "${templateName}" sent to 1 conversation` });
      // Keep showing the dialog for a moment so user sees the progress
      setTimeout(() => setIsTemplatePickerOpen(false), 500);
      // Clear result after 3 seconds
      setTimeout(() => setTemplateSendResult(null), 3000);
    } catch (err: any) {
      setTemplateSendResult({ success: false, message: err.message || 'Failed to send template' });
      setTemplateSendProgress(null);
    } finally {
      setTemplateSending(false);
    }
  }, [conversationId, channel, resolvedBackendChannel, onSendTemplate]);

  const handleAttachItem = useCallback((id: string) => {
    setShowAttachMenu(false);
    switch (id) {
      case 'gallery':  galleryRef.current?.click();   break;
      case 'camera':   cameraRef.current?.click();    break;
      case 'document': documentRef.current?.click();  break;
      case 'audio':    audioRef.current?.click();     break;
      case 'location': setShowLocation(true);         break;
      case 'contact':  setShowContact(true);          break;
      case 'poll':     setShowPoll(true);             break;
      case 'sticker':  setShowStickers(true);         break;
      case 'event':    setShowEvent(true);            break;
      case 'template': setIsTemplatePickerOpen(true); break;
    }
  }, []);

  const canSend = !disabled && (message.trim().length > 0 || pendingFiles.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">

      {/* ── Modals ── */}
      <AlertDialog open={showTakeoverDialog} onOpenChange={setShowTakeoverDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Take over from AI Agent?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400">
              This will pause the AI agent and give you manual control. The AI will not respond until you switch back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTakeover} className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white">Yes, take control</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPoll     && <PollModal     onClose={()=>setShowPoll(false)}     onSend={handleRichSend}/>}
      {showContact  && <ContactModal  onClose={()=>setShowContact(false)}  onSend={handleRichSend}/>}
      {showEvent    && <EventModal    onClose={()=>setShowEvent(false)}    onSend={handleRichSend}/>}
      {showLocation && <LocationModal onClose={()=>setShowLocation(false)} onSend={handleRichSend}/>}

      {/* ── Hidden file inputs ── */}
      <input ref={galleryRef}  type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,video/*"/>
      <input ref={cameraRef}   type="file" className="hidden"          onChange={handleFileChange} accept="image/*,video/*" capture="environment"/>
      <input ref={documentRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"/>
      <input ref={audioRef}    type="file" multiple className="hidden" onChange={handleFileChange} accept="audio/*"/>

      {/* ── Pending file previews ── */}
      {(pendingFiles.length > 0 || fileLoading) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {fileLoading && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin"/>
              <span>Reading file…</span>
            </div>
          )}
          {pendingFiles.map(pf => (
            <div key={pf.id} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm max-w-[200px]">
              {pf.mediaType === 'image' ? (
                <img src={pf.previewUrl} alt={pf.file.name} className="h-7 w-7 rounded object-cover shrink-0"/>
              ) : pf.mediaType === 'video' ? (
                <div className="h-7 w-7 rounded bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400"/>
                </div>
              ) : pf.mediaType === 'audio' ? (
                <div className="h-7 w-7 rounded bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                  <Music className="h-4 w-4 text-amber-600 dark:text-amber-400"/>
                </div>
              ) : (
                <div className="h-7 w-7 rounded bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                </div>
              )}
              <span className="truncate text-xs text-zinc-800 dark:text-zinc-200">{pf.file.name}</span>
              <button onClick={()=>removePendingFile(pf.id)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0">
                <X className="h-3.5 w-3.5"/>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">

        {/* ── Agent type toggle (chat only - hidden for group broadcast) ── */}
        {conversationId && (
        <div className="hidden lg:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className={cn('h-9 w-9 flex-shrink-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                  agentType === 'human' ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300')}
                disabled={disabled}
                title={agentType === 'human' ? 'Human agent controls this chat' : 'AI agent controls this chat'}>
                {agentType === 'human' ? <User className="h-5 w-5"/> : <Bot className="h-5 w-5"/>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg z-50">
              <DropdownMenuItem onClick={()=>handleAgentTypeChange('human')} className={cn('hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer', agentType==='human'&&'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400')}>
                <User className="h-4 w-4 mr-2"/> Human Agent
                {agentType==='human' && <span className="ml-auto text-xs font-medium">Active</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={()=>handleAgentTypeChange('ai')} className={cn('hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer', agentType==='ai'&&'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400')}>
                <Bot className="h-4 w-4 mr-2"/> AI Agent
                {agentType==='ai' && <span className="ml-auto text-xs font-medium">Active</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {ownershipError && (
            <p className="absolute top-full left-0 mt-1 whitespace-nowrap text-[11px] text-rose-600 dark:text-rose-400">
              {ownershipError} — handover not applied.
            </p>
          )}
        </div>
        )}

        {/* ── "+" Attachment menu (always visible - the only path to Send Template
              in broadcast mode, so it must work on mobile too) ── */}
        <div ref={attachBtnRef} className="relative flex-shrink-0">
          <button
            onClick={()=>{ if (!disabled) setShowAttachMenu(v=>!v); }}
            disabled={disabled}
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200',
              showAttachMenu
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white rotate-45'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}>
            <Plus className="h-5 w-5"/>
          </button>

          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-3 z-40">
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">Attach</p>
              <div className="grid grid-cols-3 gap-1">
                {[
                  // Sticker is emoji-text (inserted into the message input), so it
                  // broadcasts fine as text - keep it in every mode. Broadcast mode
                  // additionally offers Send Template.
                  ...ATTACH_ITEMS,
                  ...(onSendTemplate && !conversationId
                    ? [{ id: 'template', label: 'Send Template', icon: <LayoutTemplate className="w-6 h-6 text-white" />, bg: 'bg-emerald-600' } as AttachItem]
                    : []),
                ].map(item => (
                  <button key={item.id} onClick={()=>handleAttachItem(item.id)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-105', item.bg)}>
                      {item.icon}
                    </div>
                    <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium leading-tight text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Template shortcut button (chat only; broadcast opens the picker from the + menu) ── */}
        {conversationId && (
        <div className="hidden lg:block">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            disabled={disabled || !conversationId}
            title="Send template message"
            onClick={() => setIsTemplatePickerOpen(true)}
          >
            <LayoutTemplate className="h-5 w-5" />
          </Button>
        </div>
        )}
        <TemplatePicker
          open={isTemplatePickerOpen}
          onOpenChange={setIsTemplatePickerOpen}
          selectedCount={conversationId ? 1 : Math.max(1, broadcastTargetCount ?? 1)}
          onSend={handleTemplateSendFromComposer}
          sending={templateSending}
          sendProgress={templateSendProgress}
          channel={resolvedBackendChannel}
          isBulkSend={false}
          variant="whatsapp"
        />

        {/* ── Text input ── */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={e=>setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingFiles.length > 0
                ? 'Add a caption (optional)…'
                : channelPlaceholders[channel] ?? 'Type a message...'
            }
            disabled={disabled}
            className={cn(
              'min-h-[40px] max-h-[150px] resize-none py-2.5 px-4 rounded-2xl',
              'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-700/80 focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 focus:outline-none'
            )}
            rows={1}
          />
        </div>

        {/* ── Sticker / Emoji button ── */}
        <div className="relative flex-shrink-0 hidden lg:block">
          <Button variant="ghost" size="icon"
            className="h-9 w-9 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            disabled={disabled}
            onClick={()=>setShowStickers(v=>!v)}>
            <Smile className="h-5 w-5"/>
          </Button>
          {showStickers && (
            <StickerPicker
              onSelect={emoji=>{ setMessage(prev=>prev+emoji); textareaRef.current?.focus(); }}
              onClose={()=>setShowStickers(false)}
            />
          )}
        </div>

        {/* ── Send button ── */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="h-9 w-9 flex-shrink-0 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white disabled:opacity-40 transition-colors shadow-xs">
          <Send className="h-4 w-4"/>
        </Button>
      </div>

      {/* ── Template send result toast ── */}
      {templateSendResult && (
        <div className={cn(
          'mt-1.5 px-3 py-1.5 rounded-md text-xs flex items-center gap-2',
          templateSendResult.success
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'
        )}>
          {templateSendResult.success ? '✓' : '✕'} {templateSendResult.message}
        </div>
      )}

      {/* ── Hint bar (chat only - hidden for group broadcast) ── */}
      {conversationId && (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 px-1 hidden lg:block">
          Enter to send · Shift+Enter for new line
          {agentType === 'human' && <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">· You have manual control</span>}
        </p>
      )}
    </div>
  );
});
