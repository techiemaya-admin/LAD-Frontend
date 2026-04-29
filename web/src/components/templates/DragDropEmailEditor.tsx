'use client';

import { useState, useCallback, useEffect, useRef, ChangeEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Trash2, Pencil, Check, X,
  Heading1, Heading2, AlignLeft, Image as ImageIcon,
  MousePointer, Minus, MoveVertical, Plus, Tags,
  Upload, Loader2, LayoutTemplate,
  Facebook, Instagram, Linkedin, Youtube, Twitter,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = 'h1' | 'h2' | 'text' | 'image' | 'logo' | 'button' | 'divider' | 'spacer' | 'footer' | 'signature';
type Align = 'left' | 'center' | 'right';

interface EmailBlock {
  id: string;
  type: BlockType;
  props: Record<string, any>;
}

// ── Default props per block type ──────────────────────────────────────────────

const DEFAULT_PROPS: Record<BlockType, Record<string, any>> = {
  h1:        { content: 'Heading 1', align: 'left', color: '#111827' },
  h2:        { content: 'Heading 2', align: 'left', color: '#374151' },
  text:      { content: 'Your email content goes here. Write something compelling...', align: 'left', color: '#374151' },
  image:     { src: '', alt: 'Image', align: 'center', width: 100 },
  logo:      { src: '', alt: 'Logo', align: 'center', width: 160, href: '' },
  button:    { label: 'Click Here', href: '#', bgColor: '#0b1957', textColor: '#ffffff', align: 'center' },
  divider:   { color: '#e5e7eb' },
  spacer:    { height: 24 },
  footer:    {
    companyName: 'Enterprise name',
    address: '00 Street Name, 00000, City',
    unsubscribeText: "You've received it because you've subscribed to our newsletter.",
    unsubscribeLabel: 'Unsubscribe',
    unsubscribeUrl: '#',
    bgColor: '#f3f4f6',
    textColor: '#6b7280',
    socials: { facebook: '', instagram: '', linkedin: '', youtube: '', twitter: '' },
  },
  signature: {
    name: 'Your Name',
    title: 'Job Title',
    company: 'Company Name',
    email: '',
    phone: '',
    website: '',
    logoSrc: '',
    logoAlt: 'Logo',
    logoWidth: 120,
    bgColor: '#ffffff',
    accentColor: '#0b1957',
  },
};

// ── HTML generator ────────────────────────────────────────────────────────────

function blockToHtml(block: EmailBlock): string {
  const { type, props } = block;
  const { align = 'left', color } = props;

  switch (type) {
    case 'h1':
      return `<h1 style="text-align:${align};color:${color};font-size:32px;font-weight:700;margin:0 0 16px;line-height:1.2;">${props.content}</h1>`;
    case 'h2':
      return `<h2 style="text-align:${align};color:${color};font-size:22px;font-weight:600;margin:0 0 12px;line-height:1.3;">${props.content}</h2>`;
    case 'text':
      return `<p style="text-align:${align};color:${color};font-size:15px;line-height:1.7;margin:0 0 12px;">${props.content.replace(/\n/g, '<br/>')}</p>`;
    case 'image':
      if (!props.src) return `<!-- image block (no src) -->`;
      return `<div style="text-align:${align};margin:0 0 16px;"><img src="${props.src}" alt="${props.alt}" style="max-width:${props.width}%;height:auto;display:inline-block;" /></div>`;
    case 'logo':
      if (!props.src) return `<!-- logo block (no src) -->`;
      return `<div style="text-align:${align};margin:0 0 20px;">${props.href ? `<a href="${props.href}" style="text-decoration:none;">` : ''}<img src="${props.src}" alt="${props.alt || 'Logo'}" style="width:${props.width || 160}px;height:auto;display:inline-block;" />${props.href ? '</a>' : ''}</div>`;
    case 'button':
      return `<div style="text-align:${align};margin:16px 0;"><a href="${props.href}" style="background:${props.bgColor};color:${props.textColor};padding:12px 28px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;display:inline-block;">${props.label}</a></div>`;
    case 'divider':
      return `<hr style="border:none;border-top:1px solid ${props.color};margin:20px 0;" />`;
    case 'spacer':
      return `<div style="height:${props.height}px;"></div>`;
    case 'footer': {
      const s = props.socials || {};
      const _aStyle = 'display:inline-block;vertical-align:middle;text-decoration:none;margin:0 4px;';
      const _iStyle = 'display:block;width:28px;height:28px;border-radius:50%;';
      const socialLinks = [
        s.facebook  ? `<a href="${s.facebook}"  style="${_aStyle}"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png"  width="28" height="28" alt="Facebook"  style="${_iStyle}"/></a>` : '',
        s.instagram ? `<a href="${s.instagram}" style="${_aStyle}"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="28" height="28" alt="Instagram" style="${_iStyle}"/></a>` : '',
        s.linkedin  ? `<a href="${s.linkedin}"  style="${_aStyle}"><img src="https://cdn-icons-png.flaticon.com/32/733/733561.png"  width="28" height="28" alt="LinkedIn"  style="${_iStyle}"/></a>` : '',
        s.youtube   ? `<a href="${s.youtube}"   style="${_aStyle}"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="28" height="28" alt="YouTube"   style="${_iStyle}"/></a>` : '',
        s.twitter   ? `<a href="${s.twitter}"   style="${_aStyle}"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png"  width="28" height="28" alt="Twitter"   style="${_iStyle}"/></a>` : '',
      ].filter(Boolean).join('');
      return `<div style="background:${props.bgColor || '#f3f4f6'};padding:24px 20px;text-align:center;margin-top:20px;">
  ${socialLinks ? `<div style="display:block;line-height:1;margin-bottom:14px;font-size:0;">${socialLinks}</div>` : ''}
  ${props.companyName ? `<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${props.textColor || '#374151'};">${props.companyName}</p>` : ''}
  ${props.address ? `<p style="margin:0 0 10px;font-size:12px;color:${props.textColor || '#6b7280'};">${props.address}</p>` : ''}
  ${props.unsubscribeText ? `<p style="margin:0 0 6px;font-size:11px;color:#9ca3af;">${props.unsubscribeText}</p>` : ''}
  ${props.unsubscribeLabel ? `<a href="${props.unsubscribeUrl || '#'}" style="font-size:11px;color:#9ca3af;text-decoration:underline;">${props.unsubscribeLabel}</a>` : ''}
</div>`;
    }
    case 'signature': {
      const p = props;
      return `<div style="background:${p.bgColor || '#ffffff'};border-left:3px solid ${p.accentColor || '#0b1957'};padding:16px 20px;margin-top:20px;font-family:Arial,sans-serif;">
  ${p.logoSrc ? `<img src="${p.logoSrc}" alt="${p.logoAlt || 'Logo'}" style="width:${p.logoWidth || 120}px;height:auto;display:block;margin-bottom:10px;"/>` : ''}
  <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:${p.accentColor || '#0b1957'};">${p.name || ''}</p>
  ${p.title   ? `<p style="margin:0 0 2px;font-size:13px;color:#374151;">${p.title}</p>` : ''}
  ${p.company ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">${p.company}</p>` : ''}
  <div style="font-size:12px;color:#6b7280;line-height:1.7;">
    ${p.email   ? `<a href="mailto:${p.email}"   style="color:#6b7280;text-decoration:none;display:block;">${p.email}</a>`   : ''}
    ${p.phone   ? `<a href="tel:${p.phone}"       style="color:#6b7280;text-decoration:none;display:block;">${p.phone}</a>`   : ''}
    ${p.website ? `<a href="${p.website}"          style="color:#6b7280;text-decoration:none;display:block;">${p.website}</a>` : ''}
  </div>
</div>`;
    }
    default:
      return '';
  }
}

export function blocksToHtml(blocks: EmailBlock[]): string {
  if (!blocks.length) return '';
  const inner = blocks.map(blockToHtml).join('\n');
  return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:24px 20px;">\n${inner}\n</div>`;
}

// ── Block palette definitions ─────────────────────────────────────────────────

const PALETTE: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'h1',        label: 'Heading 1',  icon: <Heading1 className="w-4 h-4" />,       desc: 'Large title' },
  { type: 'h2',        label: 'Heading 2',  icon: <Heading2 className="w-4 h-4" />,       desc: 'Subtitle' },
  { type: 'text',      label: 'Text',       icon: <AlignLeft className="w-4 h-4" />,      desc: 'Paragraph' },
  { type: 'image',     label: 'Image',      icon: <ImageIcon className="w-4 h-4" />,      desc: 'Picture' },
  { type: 'logo',      label: 'Logo',       icon: <ImageIcon className="w-4 h-4" />,      desc: 'Brand logo' },
  { type: 'button',    label: 'Button',     icon: <MousePointer className="w-4 h-4" />,   desc: 'CTA link' },
  { type: 'divider',   label: 'Divider',    icon: <Minus className="w-4 h-4" />,          desc: 'Separator' },
  { type: 'spacer',    label: 'Spacer',     icon: <MoveVertical className="w-4 h-4" />,   desc: 'Whitespace' },
  { type: 'footer',    label: 'Footer',     icon: <LayoutTemplate className="w-4 h-4" />, desc: 'Social + address' },
  { type: 'signature', label: 'Signature',  icon: <Tags className="w-4 h-4" />,           desc: 'Name + contacts' },
];

// ── Variables ─────────────────────────────────────────────────────────────────

const VARIABLES = [
  { label: 'First Name',  val: '{{first_name}}' },
  { label: 'Last Name',   val: '{{last_name}}'  },
  { label: 'Company',     val: '{{company}}'    },
  { label: 'Title',       val: '{{title}}'      },
  { label: 'Email',       val: '{{email}}'      },
  { label: 'Industry',    val: '{{industry}}'   },
  { label: 'Location',    val: '{{location}}'   },
];

// ── Variable picker button ────────────────────────────────────────────────────

function VariablePicker({ onInsert }: { onInsert: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
          open
            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
            : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'
        }`}
      >
        <Tags className="w-3.5 h-3.5" />
        Variables
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 min-w-[180px]">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pb-1.5">Insert variable</p>
          {VARIABLES.map(({ label, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => { onInsert(val); setOpen(false); }}
              className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-xs hover:bg-violet-50 transition-colors group"
            >
              <span className="text-gray-700 font-medium group-hover:text-violet-700">{label}</span>
              <span className="font-mono text-[10px] text-gray-400 group-hover:text-violet-500">{val}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Footer block editor ───────────────────────────────────────────────────────

const SOCIAL_ICONS: { key: string; label: string; Icon: React.ElementType; color: string }[] = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,  color: '#0A66C2' },
  { key: 'youtube',   label: 'YouTube',   Icon: Youtube,   color: '#FF0000' },
  { key: 'twitter',   label: 'Twitter/X', Icon: Twitter,   color: '#1DA1F2' },
];

function FooterBlockEditor({ local, set, inputCls, labelCls }: {
  local: Record<string, any>;
  set: (key: string, val: any) => void;
  inputCls: string;
  labelCls: string;
}) {
  const socials = local.socials || {};
  const setSocial = (key: string, val: string) => set('socials', { ...socials, [key]: val });

  return (
    <>
      {/* Company info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Company Name</label>
          <input type="text" value={local.companyName || ''} onChange={(e) => set('companyName', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input type="text" value={local.address || ''} onChange={(e) => set('address', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Unsubscribe */}
      <div>
        <label className={labelCls}>Unsubscribe Text</label>
        <input type="text" value={local.unsubscribeText || ''} onChange={(e) => set('unsubscribeText', e.target.value)} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Unsubscribe Label</label>
          <input type="text" value={local.unsubscribeLabel || 'Unsubscribe'} onChange={(e) => set('unsubscribeLabel', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Unsubscribe URL</label>
          <input type="text" placeholder="https://..." value={local.unsubscribeUrl || '#'} onChange={(e) => set('unsubscribeUrl', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Background</label>
          <div className="flex items-center gap-2">
            <input type="color" value={local.bgColor || '#f3f4f6'} onChange={(e) => set('bgColor', e.target.value)} className="h-8 w-10 rounded border border-gray-200 cursor-pointer flex-shrink-0" />
            <input type="text" value={local.bgColor || '#f3f4f6'} onChange={(e) => set('bgColor', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Text Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={local.textColor || '#6b7280'} onChange={(e) => set('textColor', e.target.value)} className="h-8 w-10 rounded border border-gray-200 cursor-pointer flex-shrink-0" />
            <input type="text" value={local.textColor || '#6b7280'} onChange={(e) => set('textColor', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Social links */}
      <div>
        <label className={labelCls}>Social Media Links</label>
        <div className="space-y-2 mt-1">
          {SOCIAL_ICONS.map(({ key, label, Icon, color }) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <input
                type="text"
                placeholder={`${label} URL (leave blank to hide)`}
                value={socials[key] || ''}
                onChange={(e) => setSocial(key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <label className={labelCls}>Preview</label>
        <div className="rounded-xl overflow-hidden border border-gray-200 text-center py-5 px-4" style={{ background: local.bgColor || '#f3f4f6' }}>
          {/* Social icons */}
          <div className="flex justify-center gap-2 mb-3">
            {SOCIAL_ICONS.filter(s => socials[s.key]).map(({ key, label, Icon, color }) => (
              <div key={key} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: color }}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            ))}
            {!SOCIAL_ICONS.some(s => socials[s.key]) && (
              <div className="flex gap-2">
                {SOCIAL_ICONS.slice(0, 3).map(({ key, Icon, color }) => (
                  <div key={key} className="w-7 h-7 rounded-full flex items-center justify-center opacity-30" style={{ background: color }}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                ))}
              </div>
            )}
          </div>
          {local.companyName && <p className="text-xs font-bold mb-0.5" style={{ color: local.textColor || '#374151' }}>{local.companyName}</p>}
          {local.address && <p className="text-[11px] mb-2" style={{ color: local.textColor || '#6b7280' }}>{local.address}</p>}
          {local.unsubscribeText && <p className="text-[10px] text-gray-400 mb-1">{local.unsubscribeText}</p>}
          {local.unsubscribeLabel && <span className="text-[10px] text-gray-400 underline">{local.unsubscribeLabel}</span>}
        </div>
      </div>
    </>
  );
}

// ── Signature block editor ────────────────────────────────────────────────────

function SignatureBlockEditor({ local, set, inputCls, labelCls }: {
  local: Record<string, any>;
  set: (key: string, val: any) => void;
  inputCls: string;
  labelCls: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch('/api/campaigns/email-templates/upload', { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url  = data.url || data.data?.url;
      if (url) set('logoSrc', url);
    } catch { /* non-fatal */ }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <>
      {/* Logo */}
      <div>
        <label className={labelCls}>Logo</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        {local.logoSrc ? (
          <div className="relative inline-block">
            <img src={local.logoSrc} alt="Logo" className="max-h-14 object-contain rounded border border-gray-200 bg-white p-1" />
            <button type="button" onClick={() => set('logoSrc', '')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-blue-200 rounded-xl text-xs text-blue-600 hover:bg-blue-50 transition-all">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload logo
          </button>
        )}
        {local.logoSrc && (
          <div className="flex items-center gap-2 mt-2">
            <input type="range" min={40} max={300} step={10} value={local.logoWidth ?? 120}
              onChange={(e) => set('logoWidth', Number(e.target.value))} className="flex-1 accent-blue-600" />
            <span className="text-xs text-gray-600 w-14 text-right">{local.logoWidth ?? 120}px wide</span>
          </div>
        )}
      </div>

      {/* Name & title */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Full Name</label>
          <input type="text" value={local.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Job Title</label>
          <input type="text" value={local.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Company</label>
        <input type="text" value={local.company || ''} onChange={(e) => set('company', e.target.value)} className={inputCls} />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Email</label>
          <input type="text" placeholder="you@company.com" value={local.email || ''} onChange={(e) => set('email', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input type="text" placeholder="+1 (555) 000-0000" value={local.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Website</label>
        <input type="text" placeholder="https://yoursite.com" value={local.website || ''} onChange={(e) => set('website', e.target.value)} className={inputCls} />
      </div>

      {/* Accent color */}
      <div>
        <label className={labelCls}>Accent Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={local.accentColor || '#0b1957'} onChange={(e) => set('accentColor', e.target.value)} className="h-8 w-10 rounded border border-gray-200 cursor-pointer flex-shrink-0" />
          <input type="text" value={local.accentColor || '#0b1957'} onChange={(e) => set('accentColor', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Live preview */}
      <div>
        <label className={labelCls}>Preview</label>
        <div className="rounded-xl border-l-4 p-4" style={{ borderColor: local.accentColor || '#0b1957', background: local.bgColor || '#ffffff' }}>
          {local.logoSrc && <img src={local.logoSrc} alt="Logo" style={{ width: local.logoWidth || 120 }} className="max-h-12 object-contain mb-2" />}
          {local.name && <p className="font-bold text-sm mb-0.5" style={{ color: local.accentColor || '#0b1957' }}>{local.name}</p>}
          {local.title && <p className="text-xs text-gray-600 mb-0.5">{local.title}</p>}
          {local.company && <p className="text-xs font-semibold text-gray-700 mb-1.5">{local.company}</p>}
          <div className="text-xs text-gray-500 space-y-0.5">
            {local.email && <p>{local.email}</p>}
            {local.phone && <p>{local.phone}</p>}
            {local.website && <p>{local.website}</p>}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Image block sub-editor (upload + URL + preview) ──────────────────────────

function ImageBlockEditor({
  local,
  set,
  inputCls,
  labelCls,
}: {
  local: Record<string, any>;
  set: (key: string, val: any) => void;
  inputCls: string;
  labelCls: string;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadError('Max file size is 5 MB'); return; }

    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch('/api/campaigns/email-templates/upload', { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url  = data.url || data.data?.url;
      if (url) {
        set('src', url);
        if (!local.alt || local.alt === 'Image') set('alt', file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      {/* Upload + URL row */}
      <div>
        <label className={labelCls}>Image</label>

        {/* Upload button */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 border-2 border-dashed border-blue-200 rounded-xl text-sm text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-400 transition-all disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload from device'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-[11px] text-gray-400 font-medium">or paste URL</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* URL input */}
        <input
          type="text"
          placeholder="https://example.com/image.png"
          value={local.src || ''}
          onChange={(e) => set('src', e.target.value)}
          className={inputCls}
        />

        {uploadError && (
          <p className="text-xs text-red-500 mt-1">{uploadError}</p>
        )}
      </div>

      {/* Image preview */}
      {local.src && (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
          <img
            src={local.src}
            alt={local.alt || 'Preview'}
            className="w-full max-h-40 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={() => set('src', '')}
            className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Alt text */}
      <div>
        <label className={labelCls}>Alt Text</label>
        <input
          type="text"
          placeholder="Describe the image…"
          value={local.alt || ''}
          onChange={(e) => set('alt', e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Width */}
      <div>
        <label className={labelCls}>Width %</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={local.width ?? 100}
            onChange={(e) => set('width', Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-sm font-semibold text-gray-700 w-10 text-right">{local.width ?? 100}%</span>
        </div>
      </div>
    </>
  );
}

// ── Inline block editor ───────────────────────────────────────────────────────

function BlockEditor({
  block,
  onUpdate,
  onClose,
}: {
  block: EmailBlock;
  onUpdate: (props: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState({ ...block.props });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  const set = (key: string, val: any) => setLocal((p) => ({ ...p, [key]: val }));
  const handleSave = () => { onUpdate(local); onClose(); };

  // Insert variable at cursor position in the active content field
  const insertVariable = (variable: string) => {
    if (block.type === 'text') {
      const el = textareaRef.current;
      if (!el) { set('content', (local.content || '') + variable); return; }
      const start = el.selectionStart ?? (local.content || '').length;
      const end   = el.selectionEnd   ?? start;
      const newVal = (local.content || '').substring(0, start) + variable + (local.content || '').substring(end);
      set('content', newVal);
      setTimeout(() => {
        el.focus();
        const pos = start + variable.length;
        el.setSelectionRange(pos, pos);
      }, 0);
    } else if (['h1', 'h2'].includes(block.type)) {
      const el = inputRef.current;
      if (!el) { set('content', (local.content || '') + variable); return; }
      const start = el.selectionStart ?? (local.content || '').length;
      const end   = el.selectionEnd   ?? start;
      const newVal = (local.content || '').substring(0, start) + variable + (local.content || '').substring(end);
      set('content', newVal);
      setTimeout(() => {
        el.focus();
        const pos = start + variable.length;
        el.setSelectionRange(pos, pos);
      }, 0);
    } else if (block.type === 'button') {
      // Insert into button label
      set('label', (local.label || '') + variable);
    }
  };

  const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1';
  const inputCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  const showVariables = ['h1', 'h2', 'text', 'button'].includes(block.type);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 space-y-3">

      {/* Text content */}
      {['h1', 'h2', 'text'].includes(block.type) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls} style={{ marginBottom: 0 }}>Content</label>
            <VariablePicker onInsert={insertVariable} />
          </div>
          {block.type === 'text' ? (
            <textarea
              ref={textareaRef}
              value={local.content || ''}
              onChange={(e) => set('content', e.target.value)}
              rows={4}
              className={inputCls + ' resize-y mt-1.5'}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={local.content || ''}
              onChange={(e) => set('content', e.target.value)}
              className={inputCls + ' mt-1.5'}
            />
          )}
        </div>
      )}

      {/* Image src + upload + alt + width */}
      {block.type === 'image' && (
        <ImageBlockEditor local={local} set={set} inputCls={inputCls} labelCls={labelCls} />
      )}

      {/* Logo — upload + optional link + width */}
      {block.type === 'logo' && (
        <>
          <ImageBlockEditor local={local} set={set} inputCls={inputCls} labelCls={labelCls} />
          <div>
            <label className={labelCls}>Link URL (optional)</label>
            <input type="text" placeholder="https://yoursite.com" value={local.href || ''}
              onChange={(e) => set('href', e.target.value)} className={inputCls} />
          </div>
        </>
      )}

      {/* Button props */}
      {block.type === 'button' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls} style={{ marginBottom: 0 }}>Button Label</label>
              <VariablePicker onInsert={insertVariable} />
            </div>
            <input type="text" value={local.label || ''} onChange={(e) => set('label', e.target.value)} className={inputCls + ' mt-1.5'} />
          </div>
          <div>
            <label className={labelCls}>Link URL</label>
            <input type="text" placeholder="https://..." value={local.href || ''} onChange={(e) => set('href', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={local.bgColor || '#0b1957'} onChange={(e) => set('bgColor', e.target.value)} className="h-8 w-12 rounded border border-gray-200 cursor-pointer" />
                <input type="text" value={local.bgColor || '#0b1957'} onChange={(e) => set('bgColor', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Text Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={local.textColor || '#ffffff'} onChange={(e) => set('textColor', e.target.value)} className="h-8 w-12 rounded border border-gray-200 cursor-pointer" />
                <input type="text" value={local.textColor || '#ffffff'} onChange={(e) => set('textColor', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Divider color */}
      {block.type === 'divider' && (
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={local.color || '#e5e7eb'} onChange={(e) => set('color', e.target.value)} className="h-8 w-12 rounded border border-gray-200 cursor-pointer" />
            <input type="text" value={local.color || '#e5e7eb'} onChange={(e) => set('color', e.target.value)} className={inputCls} />
          </div>
        </div>
      )}

      {/* Spacer height */}
      {block.type === 'spacer' && (
        <div>
          <label className={labelCls}>Height (px)</label>
          <input type="number" min={4} max={120} value={local.height ?? 24} onChange={(e) => set('height', Number(e.target.value))} className={inputCls} />
        </div>
      )}

      {/* Alignment (most blocks) */}
      {['h1', 'h2', 'text', 'image', 'logo', 'button'].includes(block.type) && (
        <div>
          <label className={labelCls}>Alignment</label>
          <div className="flex gap-2">
            {(['left', 'center', 'right'] as Align[]).map((a) => (
              <button
                key={a}
                onClick={() => set('align', a)}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium capitalize transition ${local.align === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text/heading color */}
      {['h1', 'h2', 'text'].includes(block.type) && (
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={local.color || '#374151'} onChange={(e) => set('color', e.target.value)} className="h-8 w-12 rounded border border-gray-200 cursor-pointer" />
            <input type="text" value={local.color || '#374151'} onChange={(e) => set('color', e.target.value)} className={inputCls} />
          </div>
        </div>
      )}

      {/* ── Footer editor ── */}
      {block.type === 'footer' && (
        <FooterBlockEditor local={local} set={set} inputCls={inputCls} labelCls={labelCls} />
      )}

      {/* ── Signature editor ── */}
      {block.type === 'signature' && (
        <SignatureBlockEditor local={local} set={set} inputCls={inputCls} labelCls={labelCls} />
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Check className="w-3.5 h-3.5" /> Apply
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Sortable block row ────────────────────────────────────────────────────────

function SortableBlock({
  block,
  isEditing,
  onStartEdit,
  onUpdate,
  onDelete,
  onStopEdit,
}: {
  block: EmailBlock;
  isEditing: boolean;
  onStartEdit: () => void;
  onUpdate: (props: Record<string, any>) => void;
  onDelete: () => void;
  onStopEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const typeLabel = PALETTE.find((p) => p.type === block.type)?.label ?? block.type;
  const typeIcon  = PALETTE.find((p) => p.type === block.type)?.icon;

  // Compact block preview
  const Preview = () => {
    const { props, type } = block;
    switch (type) {
      case 'h1':
        return <span className="text-base font-bold text-gray-800 truncate">{props.content}</span>;
      case 'h2':
        return <span className="text-sm font-semibold text-gray-700 truncate">{props.content}</span>;
      case 'text':
        return <span className="text-sm text-gray-500 truncate">{props.content?.substring(0, 80)}{props.content?.length > 80 ? '…' : ''}</span>;
      case 'image':
        return props.src
          ? <span className="text-sm text-blue-500 truncate">🖼 {props.src.substring(0, 50)}…</span>
          : <span className="text-sm text-amber-500 italic">⚠ No image URL set</span>;
      case 'logo':
        return props.src
          ? <img src={props.src} alt="logo" className="h-6 object-contain" />
          : <span className="text-sm text-amber-500 italic">⚠ No logo uploaded</span>;
      case 'button':
        return (
          <span className="inline-block px-3 py-1 text-xs rounded font-semibold" style={{ background: props.bgColor, color: props.textColor }}>
            {props.label}
          </span>
        );
      case 'divider':
        return <hr className="border-t border-gray-300 w-32" />;
      case 'spacer':
        return <span className="text-xs text-gray-400">{props.height}px gap</span>;
      case 'footer': {
        const activeSocials = SOCIAL_ICONS.filter(s => props.socials?.[s.key]);
        return (
          <div className="flex items-center gap-2">
            {activeSocials.slice(0, 4).map(({ key, Icon, color }) => (
              <div key={key} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color }}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
            ))}
            <span className="text-xs text-gray-500 truncate">{props.companyName || 'Footer'} · {props.address || 'address'}</span>
          </div>
        );
      }
      case 'signature':
        return (
          <div className="flex items-center gap-2">
            {props.logoSrc && <img src={props.logoSrc} alt="logo" className="h-5 object-contain" />}
            <span className="text-xs font-semibold truncate" style={{ color: props.accentColor || '#0b1957' }}>{props.name || 'Signature'}</span>
            {props.title && <span className="text-xs text-gray-400 truncate">· {props.title}</span>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`group relative flex items-center gap-3 p-3 bg-white rounded-xl border-2 transition-all ${isEditing ? 'border-blue-400 shadow-md' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'}`}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Type badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
          {typeIcon}
        </div>

        {/* Content preview */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex-shrink-0">{typeLabel}</span>
          <div className="flex-1 min-w-0">
            <Preview />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={isEditing ? onStopEdit : onStartEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline editor */}
      {isEditing && (
        <BlockEditor block={block} onUpdate={onUpdate} onClose={onStopEdit} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DragDropEmailEditorProps {
  htmlContent: string;
  subject?: string;
  onContentChange: (html: string) => void;
}

export default function DragDropEmailEditor({ htmlContent, subject, onContentChange }: DragDropEmailEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  // Track whether we've initialised from external htmlContent already
  const [initialised, setInitialised] = useState(false);

  // On first mount, if there's existing html, start with empty canvas
  // (converting arbitrary html → blocks is non-trivial; start fresh is safer)
  useEffect(() => {
    if (!initialised) setInitialised(true);
  }, []);

  // Whenever blocks change → regenerate HTML
  useEffect(() => {
    if (initialised) onContentChange(blocksToHtml(blocks));
  }, [blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const uid = () => Math.random().toString(36).slice(2, 9);

  const addBlock = useCallback((type: BlockType) => {
    const newBlock: EmailBlock = { id: uid(), type, props: { ...DEFAULT_PROPS[type] } };
    setBlocks((prev) => [...prev, newBlock]);
    setEditingId(newBlock.id);
    setShowPalette(false);
  }, []);

  const updateBlock = useCallback((id: string, props: Record<string, any>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === active.id);
        const newIdx = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add block toolbar */}
      <div className="relative">
        <button
          onClick={() => setShowPalette((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Block
        </button>

        {showPalette && (
          <div className="absolute top-full left-0 mt-2 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Choose a block type</p>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE.map(({ type, label, icon, desc }) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                    {icon}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span className="text-[10px] text-gray-400">{desc}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPalette(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4">
            <AlignLeft className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Your email is empty</p>
          <p className="text-xs text-gray-400 mb-4">Click "Add Block" above to build your email</p>
        </div>
      )}

      {/* Sortable blocks */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                isEditing={editingId === block.id}
                onStartEdit={() => setEditingId(block.id)}
                onStopEdit={() => setEditingId(null)}
                onUpdate={(props) => updateBlock(block.id, props)}
                onDelete={() => deleteBlock(block.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Block count */}
      {blocks.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {blocks.length} block{blocks.length !== 1 ? 's' : ''} · drag to reorder · click ✏ to edit
        </p>
      )}
    </div>
  );
}
