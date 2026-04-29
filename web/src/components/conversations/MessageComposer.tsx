'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Send, Smile, X, Bot, User, Plus, Camera, FileText, Music,
  MapPin, Phone, BarChart2, Star, Calendar, Image as ImageIcon,
  ChevronRight, Loader2, Paperclip,
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
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

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
  channel:        Channel;
  onSendMessage:  (payload: RichMessagePayload) => void;
  disabled?:      boolean;
  contactName?:   string;
  conversationId?: string;
  owner?:         string | null;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0b1957] flex items-center justify-center"><BarChart2 className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-[#1E293B]">Create Poll</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Question</label>
            <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask a question..."
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Options</label>
            <div className="mt-1 space-y-2">
              {options.map((opt,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0b1957]/10 text-[#0b1957] text-xs flex items-center justify-center font-bold shrink-0">{i+1}</span>
                  <input value={opt} onChange={e=>updateOption(i,e.target.value)} placeholder={`Option ${i+1}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1957]/20 focus:border-[#0b1957]"/>
                  {options.length>2 && <button onClick={()=>removeOption(i)}><X className="w-4 h-4 text-gray-300 hover:text-red-400"/></button>}
                </div>
              ))}
            </div>
            {options.length<10 && (
              <button onClick={addOption} className="mt-2 text-xs text-[#0b1957] font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3"/> Add option
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 rounded-xl">Cancel</button>
          <button onClick={handleSend} disabled={!question.trim() || options.filter(o=>o.trim()).length<2}
            className="px-4 py-2 text-sm font-semibold bg-[#0b1957] text-white rounded-xl hover:bg-[#0a1540] disabled:opacity-40">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center"><Phone className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-[#1E293B]">Share Contact</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(f=>(
            <div key={f.label}>
              <label className="text-xs font-medium text-[#64748B]">{f.label}</label>
              <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"/>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 rounded-xl">Cancel</button>
          <button onClick={handleSend} disabled={!name.trim()||!phone.trim()}
            className="px-4 py-2 text-sm font-semibold bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-40">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center"><Calendar className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-[#1E293B]">Share Event</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-[#64748B]">Event Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Team Meeting"
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-[#64748B]">Date *</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"/>
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B]">Time</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B]">Location</label>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Dubai, UAE"
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"/>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B]">Note</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" rows={2}
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"/>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 rounded-xl">Cancel</button>
          <button onClick={handleSend} disabled={!title.trim()||!date}
            className="px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><MapPin className="w-4 h-4 text-white"/></div>
            <h3 className="font-semibold text-[#1E293B]">Share Location</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
        </div>
        <div className="p-5 space-y-4">
          <button onClick={getLocation} disabled={gpsStatus==='loading'}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center shrink-0">
              {gpsStatus==='loading' ? <Loader2 className="w-5 h-5 text-green-600 animate-spin"/> : <MapPin className="w-5 h-5 text-green-600"/>}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#1E293B]">
                {gpsStatus==='loading' ? 'Getting location…' : gpsStatus==='done' ? '✓ Location found' : 'Send Current Location'}
              </p>
              {coords     && <p className="text-xs text-[#64748B]">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
              {gpsStatus==='error' && <p className="text-xs text-red-500">Location access denied</p>}
              {gpsStatus==='idle'  && <p className="text-xs text-[#94A3B8]">Uses your device GPS</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto"/>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-gray-400 font-medium">or</span><div className="flex-1 h-px bg-gray-200"/>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B]">Enter address or place</label>
            <input value={manual} onChange={e=>setManual(e.target.value)} placeholder="e.g. Dubai Mall, UAE"
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"/>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 rounded-xl">Cancel</button>
          <button onClick={handleSend} disabled={!coords && !manual.trim()}
            className="px-4 py-2 text-sm font-semibold bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-40">
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
  'activities': { label: '⚽ Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🛼', '🛹', '🛷', '🥌', '🎯', '🪀', '🪃', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎭', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🏎️', '🛵', '🦯', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🛼', '🚏', '⛽', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '�2', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛰️', '🚁', '🛶', '⛵', '🚤', '🛳️', '🛲', '🚧', '⛽'] },
};

// ── Main component ─────────────────────────────────────────────────────────────

function StickerPicker({ onSelect, onClose }: { onSelect: (s: string) => void; onClose: () => void }) {
  const [activePack, setActivePack] = useState('recently');
  const [searchQuery, setSearchQuery] = useState('');
  const packs = Object.entries(STICKER_PACKS);
  const currentPack = STICKER_PACKS[activePack as keyof typeof STICKER_PACKS];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-96">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-[#1E293B]">Stickers</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-2 border-b border-gray-100 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search via sticker store"
            className="w-full px-3 py-2 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-500 focus:outline-none"
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
                className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Pack tabs at bottom */}
        <div className="px-2 py-2 border-t border-gray-100 flex items-center gap-1 overflow-x-auto shrink-0">
          {packs.map(([key, pack]) => (
            <button
              key={key}
              onClick={() => setActivePack(key)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activePack === key
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
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
  channel, onSendMessage, disabled = false, contactName, conversationId, owner,
}: MessageComposerProps) {

  // ── State ────────────────────────────────────────────────────────────────
  const [message,            setMessage]            = useState('');
  const [pendingFiles,       setPendingFiles]       = useState<PendingFile[]>([]);
  const [fileLoading,        setFileLoading]        = useState(false);
  const [agentType,          setAgentType]          = useState<AgentType>(owner === 'human_agent' ? 'human' : 'ai');
  const [showTakeoverDialog, setShowTakeoverDialog] = useState(false);
  const [showAttachMenu,     setShowAttachMenu]     = useState(false);
  const [showStickers,       setShowStickers]       = useState(false);
  const [showPoll,           setShowPoll]           = useState(false);
  const [showContact,        setShowContact]        = useState(false);
  const [showEvent,          setShowEvent]          = useState(false);
  const [showLocation,       setShowLocation]       = useState(false);

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
  const updateOwnership = useCallback(async (newOwner: 'AI' | 'human_agent') => {
    if (!conversationId) return;
    try {
      await fetchWithTenant(`${CONV_API}/${conversationId}/ownership`, {
        method: 'PATCH',
        body: JSON.stringify({ owner: newOwner }),
      });
    } catch (err) { console.error('Failed to update ownership:', err); }
  }, [conversationId]);

  const handleAgentTypeChange = useCallback((type: AgentType) => {
    if (type === 'human' && agentType === 'ai') setShowTakeoverDialog(true);
    else if (type === 'ai' && agentType === 'human') { setAgentType('ai'); updateOwnership('AI'); }
  }, [agentType, updateOwnership]);

  const confirmTakeover = useCallback(() => {
    setAgentType('human'); updateOwnership('human_agent'); setShowTakeoverDialog(false);
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
    }
  }, []);

  const canSend = !disabled && (message.trim().length > 0 || pendingFiles.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border-t border-border bg-white p-3 whatsapp-chat-bg">

      {/* ── Modals ── */}
      <AlertDialog open={showTakeoverDialog} onOpenChange={setShowTakeoverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take over from AI Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause the AI agent and give you manual control. The AI will not respond until you switch back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTakeover}>Yes, take control</AlertDialogAction>
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
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin"/>
              <span>Reading file…</span>
            </div>
          )}
          {pendingFiles.map(pf => (
            <div key={pf.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 text-sm max-w-[200px]">
              {pf.mediaType === 'image' ? (
                <img src={pf.previewUrl} alt={pf.file.name} className="h-7 w-7 rounded object-cover shrink-0"/>
              ) : pf.mediaType === 'video' ? (
                <div className="h-7 w-7 rounded bg-purple-100 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-purple-600"/>
                </div>
              ) : pf.mediaType === 'audio' ? (
                <div className="h-7 w-7 rounded bg-orange-100 flex items-center justify-center shrink-0">
                  <Music className="h-4 w-4 text-orange-600"/>
                </div>
              ) : (
                <div className="h-7 w-7 rounded bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-blue-600"/>
                </div>
              )}
              <span className="truncate text-xs">{pf.file.name}</span>
              <button onClick={()=>removePendingFile(pf.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-3.5 w-3.5"/>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">

        {/* ── Agent type toggle ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"
              className={cn('h-9 w-9 flex-shrink-0',
                agentType === 'human' ? 'text-orange-500 hover:text-orange-600' : 'text-green-500 hover:text-green-600')}
              disabled={disabled}
              title={agentType === 'human' ? 'Human agent controls this chat' : 'AI agent controls this chat'}>
              {agentType === 'human' ? <User className="h-5 w-5"/> : <Bot className="h-5 w-5"/>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover z-50">
            <DropdownMenuItem onClick={()=>handleAgentTypeChange('human')} className={cn(agentType==='human'&&'bg-accent')}>
              <User className="h-4 w-4 mr-2"/> Human Agent
              {agentType==='human' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={()=>handleAgentTypeChange('ai')} className={cn(agentType==='ai'&&'bg-accent')}>
              <Bot className="h-4 w-4 mr-2"/> AI Agent
              {agentType==='ai' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── "+" Attachment menu ── */}
        <div ref={attachBtnRef} className="relative flex-shrink-0">
          <button
            onClick={()=>{ if (!disabled) setShowAttachMenu(v=>!v); }}
            disabled={disabled}
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200',
              showAttachMenu
                ? 'bg-[#0b1957] text-white rotate-45'
                : 'text-[#64748B] hover:bg-gray-100 hover:text-[#1E293B]'
            )}>
            <Plus className="h-5 w-5"/>
          </button>

          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-40">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2 px-1">Attach</p>
              <div className="grid grid-cols-3 gap-1">
                {ATTACH_ITEMS.map(item => (
                  <button key={item.id} onClick={()=>handleAttachItem(item.id)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-105', item.bg)}>
                      {item.icon}
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium leading-tight text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Quick Reply Picker ── */}
        <QuickReplyPicker onSelect={handleQuickReplySelect} contactName={contactName} disabled={disabled}/>

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
              'bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#25D366]/30'
            )}
            rows={1}
          />
        </div>

        {/* ── Sticker / Emoji button ── */}
        <div className="relative flex-shrink-0">
          <Button variant="ghost" size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
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
          className="h-9 w-9 flex-shrink-0 bg-[#25D366] hover:bg-[#22c55e] text-white disabled:opacity-40">
          <Send className="h-4 w-4"/>
        </Button>
      </div>

      {/* ── Hint bar ── */}
      <p className="text-[10px] text-muted-foreground mt-2 px-1">
        Enter to send · Shift+Enter for new line
        {agentType === 'human' && <span className="ml-2 text-orange-500 font-medium">· You have manual control</span>}
      </p>
    </div>
  );
});
