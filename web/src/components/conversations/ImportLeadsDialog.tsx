import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  UserPlus,
  Upload,
  X,
  Loader2,
  Check,
  AlertCircle,
  Phone,
  Mail,
  Linkedin,
  Instagram,
  Building2,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  FolderPlus,
  TriangleAlert,
  RefreshCw,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Workbook } from 'exceljs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogActions,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { safeStorage } from '@lad/shared/storage';

// ── Types ────────────────────────────────────────────────────────

interface LeadEntry {
  id: string; // client-side ID for list key
  name: string;
  phone: string;
  email: string;
  company: string;
  linkedin_url: string;
  instagram_url: string;
  source: string;
}

interface ChatGroup {
  id: string;
  name: string;
  color: string;
  conversation_count: number;
}

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  channel?: 'personal' | 'waba' | 'gmail' | 'outlook' | 'custom';
  /** If provided (email mode), imported contacts are also added to this email group */
  emailGroupId?: string;
  /** Visual theme variant: 'default' or 'whatsapp' (neutral zinc + emerald green) */
  variant?: 'default' | 'whatsapp';
}

const EMPTY_LEAD: Omit<LeadEntry, 'id'> = {
  name: '',
  phone: '',
  email: '',
  company: '',
  linkedin_url: '',
  instagram_url: '',
  source: '',
};

function newLead(): LeadEntry {
  return { ...EMPTY_LEAD, id: crypto.randomUUID() };
}

function detectChannels(lead: LeadEntry): string[] {
  const channels: string[] = [];
  if (lead.phone) channels.push('whatsapp');
  if (lead.linkedin_url) channels.push('linkedin');
  if (lead.instagram_url) channels.push('instagram');
  if (lead.email) channels.push('gmail');
  return channels;
}

const CHANNEL_ICONS: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  whatsapp: { icon: Phone, color: 'text-green-600 bg-green-50 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border dark:border-emerald-500/20', label: 'WhatsApp' },
  linkedin: { icon: Linkedin, color: 'text-blue-600 bg-blue-50 dark:text-sky-300 dark:bg-sky-500/10 dark:border dark:border-sky-500/20', label: 'LinkedIn' },
  instagram: { icon: Instagram, color: 'text-pink-600 bg-pink-50 dark:text-pink-300 dark:bg-pink-500/10 dark:border dark:border-pink-500/20', label: 'Instagram' },
  gmail: { icon: Mail, color: 'text-orange-500 bg-orange-50 dark:text-amber-300 dark:bg-amber-500/10 dark:border dark:border-amber-500/20', label: 'Email' },
};

const API_BASE = '/api/whatsapp-conversations';
const EMAIL_API = '/api/email-conversations';

// ── Validation ───────────────────────────────────────────────────

/**
 * Validate a single lead's optional fields.
 * Returns a map of field → error message. Empty object means valid.
 * All fields are optional - only validated when non-empty.
 */
function validateLead(lead: LeadEntry): Record<string, string> {
  const errors: Record<string, string> = {};

  // Phone: if provided, must contain 7-15 digits (no + requirement)
  if (lead.phone.trim()) {
    const digits = lead.phone.trim().replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'Must be 7-15 digits (e.g. 501234567 or +971501234567)';
    }
  }

  // Email: if provided, must have @ and a domain with dot
  if (lead.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) {
      errors.email = 'Invalid email (e.g. name@domain.com)';
    }
  }

  // LinkedIn: if provided, must be a linkedin.com URL or path
  if (lead.linkedin_url.trim()) {
    const li = lead.linkedin_url.trim();
    if (!/^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|pub|profile)\/.+/i.test(li)) {
      errors.linkedin_url = 'Must be a LinkedIn URL (e.g. linkedin.com/in/username)';
    }
  }

  // Instagram: if provided, must be @handle or instagram.com URL
  if (lead.instagram_url.trim()) {
    const ig = lead.instagram_url.trim();
    const isHandle = /^@[\w.]{1,30}$/.test(ig);
    const isUrl = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i.test(ig);
    if (!isHandle && !isUrl) {
      errors.instagram_url = 'Must be @handle or instagram.com URL';
    }
  }

  return errors;
}

/**
 * Scan all leads and find the most common country code among phones that
 * already have a `+` prefix. Returns e.g. "+971", "+44", "+1", or null.
 */
function detectCommonCountryCode(leads: LeadEntry[]): string | null {
  const validPhones = leads
    .map((l) => l.phone.trim().replace(/[\s\-().]/g, ''))
    .filter((p) => /^\+[1-9]\d{6,}$/.test(p));

  if (validPhones.length === 0) return null;

  const freq: Record<string, number> = {};
  for (const p of validPhones) {
    // Accumulate counts for 1-, 2-, 3-digit country codes (+X, +XX, +XXX)
    for (const len of [2, 3, 4]) {
      const prefix = p.slice(0, len); // includes the leading +
      if (p.length > len) freq[prefix] = (freq[prefix] || 0) + 1;
    }
  }

  const threshold = Math.max(1, Math.floor(validPhones.length * 0.4));

  // Prefer longer codes first (more specific: +971 before +97 before +9)
  for (const len of [4, 3, 2]) {
    const best = Object.entries(freq)
      .filter(([k]) => k.length === len)
      .sort(([, a], [, b]) => b - a)[0];
    if (best && best[1] >= threshold) return best[0];
  }

  // Fallback: whatever the most popular prefix was at any length
  const fallback = Object.entries(freq).sort(([, a], [, b]) => b - a)[0];
  return fallback ? fallback[0] : null;
}

/**
 * Given a raw phone string and a detected country code (e.g. "+971"),
 * return the normalised E.164-style number.
 *
 * Handles:
 *  - Already has + → return as-is
 *  - Starts with 00 (intl prefix) → replace with +
 *  - Starts with country-code digits (e.g. "971…") → add +
 *  - Starts with 0 (trunk prefix) → strip 0 and prepend code
 *  - Plain local digits → prepend code
 */
function autoFixPhone(phone: string, countryCode: string): string {
  const cleaned = phone.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return phone;
  if (cleaned.startsWith('+')) return cleaned; // already fine

  const codeDigits = countryCode.slice(1); // "971" from "+971"

  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  if (cleaned.startsWith(codeDigits)) return '+' + cleaned;
  if (cleaned.startsWith('0')) return countryCode + cleaned.slice(1);
  return countryCode + cleaned;
}

// Turn an API error body into a readable string. FastAPI validation errors
// come back as `detail: [{ type, loc, msg, input, ctx }]` - rendering that
// array/object directly as a React child throws "Objects are not valid as a
// React child" (#31) and crashes the page. Flatten it to "field: message".
function formatApiError(data: unknown): string {
  const d = (data as { detail?: unknown; error?: unknown })?.detail
    ?? (data as { error?: unknown })?.error;
  if (Array.isArray(d)) {
    return d
      .map((e) => {
        const it = e as { loc?: unknown[]; msg?: string };
        const field = Array.isArray(it.loc)
          ? it.loc.filter((x) => x !== 'body').join('.')
          : '';
        return field ? `${field}: ${it.msg ?? ''}` : (it.msg ?? '');
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object') return (d as { msg?: string }).msg || 'Request failed';
  return 'Unknown error';
}

// Clean up common email artifacts so one messy row doesn't 422 the whole
// import: unwrap "Name <a@b.com>", strip surrounding quotes/spaces and stray
// leading/trailing dots/commas/semicolons (e.g. "a@b.com." → "a@b.com").
function sanitizeEmail(raw: string): string {
  let e = (raw || '').trim();
  const angle = e.match(/<([^>]+)>/);
  if (angle) e = angle[1];
  e = e.replace(/^["'\s.,;:]+|["'\s.,;:]+$/g, '').trim();
  return e.toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(e: string): boolean {
  return EMAIL_RE.test(e);
}

// ── Component ────────────────────────────────────────────────────

export function ImportLeadsDialog({ open, onOpenChange, onImportComplete, channel, emailGroupId, variant = 'default' }: ImportLeadsDialogProps) {
  const isWhatsApp = variant === 'whatsapp';
  // Email mode: channel is 'gmail' or 'outlook'
  const isEmailMode = channel === 'gmail' || channel === 'outlook';
  const inputBorderClass = isWhatsApp
    ? "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 focus:border-emerald-500 focus-visible:outline-none"
    : isEmailMode
    ? "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500 focus:border-sky-500 focus-visible:outline-none shadow-2xs"
    : "border border-gray-300 dark:border-slate-700/80 bg-white dark:bg-[#000724] text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 focus:border-blue-500 focus-visible:outline-none shadow-2xs";
  const [activeTab, setActiveTab] = useState('single');
  const [leads, setLeads] = useState<LeadEntry[]>([newLead()]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    total: number;
    imported: number;
    conversations: number;
    conversationIds?: string[];
    errors: { name: string; phone?: string; error: string }[];
    skipped: { name: string; phone?: string; reason: string }[];
    duplicates: { name: string; phone?: string; reason: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  // Feedback for the Excel-upload parser (empty = no problem).
  const [excelError, setExcelError] = useState<string>('');
  const [broadcastName, setBroadcastName] = useState('');
  const [showBroadcastPrompt, setShowBroadcastPrompt] = useState(false);
  const [showAddToGroupPrompt, setShowAddToGroupPrompt] = useState(false);
  const [postImportGroupIds, setPostImportGroupIds] = useState<Set<string>>(new Set());
  const [addingToGroups, setAddingToGroups] = useState(false);
  const [creatingBroadcast, setCreatingBroadcast] = useState(false);
  const [broadcastCreateError, setBroadcastCreateError] = useState('');

  // Multi-select state for bulk-delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Run in background: close dialog immediately and import continues without blocking the UI
  const [runInBackground, setRunInBackground] = useState(false);

  // URL-scrape state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapeStats, setScrapeStats] = useState<{ extracted: number; chars: number } | null>(null);

  // Compute validation errors for all leads
  const validationErrors = useMemo<Record<string, Record<string, string>>>(() => {
    const result: Record<string, Record<string, string>> = {};
    for (const lead of leads) {
      const errs = validateLead(lead);
      if (Object.keys(errs).length > 0) {
        result[lead.id] = errs;
      }
    }
    return result;
  }, [leads]);

  // Set of lead IDs that have at least one validation error
  const invalidLeadIds = useMemo(
    () => new Set(Object.keys(validationErrors)),
    [validationErrors]
  );

  const invalidCount = invalidLeadIds.size;

  // Load chat groups / email groups when dialog opens
  useEffect(() => {
    if (!open) return;
    if (isEmailMode) {
      // Email mode: load broadcast groups. Gmail/Outlook route through
      // LAD-Email-Comms (single-object response shape: {groups: [...]}).
      // Custom SMTP still uses the legacy WABA-Comms envelope
      // {success, data: [...]}.
      const isHosted = channel === 'gmail' || channel === 'outlook';
      const url = isHosted
        ? `/api/email-comms/groups?channel=${channel}`
        : `${EMAIL_API}/groups?channel=${channel}`;
      fetch(url, {
        headers: { 'Authorization': `Bearer ${safeStorage.getItem('token') || ''}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (isHosted) {
            setGroups(data.groups || []);
          } else if (data.success) {
            setGroups(data.data || []);
          }
        })
        .catch(() => {});
    } else {
      // WhatsApp mode: load chat groups
      const channelParam = channel === 'personal' ? '?channel=personal' : '';
      fetch(`${API_BASE}/chat-groups${channelParam}`, {
        headers: { 'Authorization': `Bearer ${safeStorage.getItem('token') || ''}` },
      })
        .then((r) => r.json())
        .then((data) => { if (data.success) setGroups(data.data || []); })
        .catch(() => {});
    }
  }, [open, channel, isEmailMode]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setLeads([newLead()]);
      setSelectedGroupIds(new Set());
      setImportResult(null);
      setActiveTab('single');
      setShowBroadcastPrompt(false);
      setBroadcastName('');
      setShowAddToGroupPrompt(false);
      setPostImportGroupIds(new Set());
      setAddingToGroups(false);
      setCreatingBroadcast(false);
      setBroadcastCreateError('');
      setSelectedIds(new Set());
      setRunInBackground(false);
      setScrapeUrl('');
      setScraping(false);
      setScrapeError('');
      setScrapeStats(null);
    }
  }, [open]);

  const updateLead = useCallback((id: string, field: keyof LeadEntry, value: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }, []);

  const addLead = useCallback(() => {
    setLeads((prev) => [...prev, newLead()]);
  }, []);

  const removeLead = useCallback((id: string) => {
    setLeads((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const toggleSelectLead = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleSelectAllInvalid = useCallback(() => {
    setSelectedIds(new Set(invalidLeadIds));
  }, [invalidLeadIds]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setLeads((prev) => {
      const remaining = prev.filter((l) => !selectedIds.has(l.id));
      return remaining.length > 0 ? remaining : [newLead()];
    });
    setSelectedIds(new Set());
  }, [selectedIds]);

  // Detect country code from leads that already have a + prefix
  const detectedCountryCode = useMemo(() => detectCommonCountryCode(leads), [leads]);

  // How many leads have phone errors that auto-fix can address
  const phoneErrorLeadIds = useMemo(
    () => new Set(Object.entries(validationErrors).filter(([, e]) => e.phone).map(([id]) => id)),
    [validationErrors]
  );

  const handleAutoFixPhones = useCallback(() => {
    if (!detectedCountryCode) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (!l.phone.trim()) return l;
        const fixed = autoFixPhone(l.phone, detectedCountryCode);
        return fixed !== l.phone ? { ...l, phone: fixed } : l;
      })
    );
  }, [detectedCountryCode]);

  // CSV parsing
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full name' || h === 'fullname');
      const phoneIdx = headers.findIndex((h) => h === 'phone' || h === 'whatsapp' || h === 'mobile' || h === 'phone number');
      const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email address');
      const companyIdx = headers.findIndex((h) => h === 'company' || h === 'organization' || h === 'org');
      const linkedinIdx = headers.findIndex((h) => h === 'linkedin' || h === 'linkedin_url' || h === 'linkedin url');
      const instagramIdx = headers.findIndex((h) => h === 'instagram' || h === 'instagram_url' || h === 'instagram url');
      const sourceIdx = headers.findIndex((h) => h === 'source');

      const parsedLeads: LeadEntry[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : '';
        if (!name) continue;

        parsedLeads.push({
          id: crypto.randomUUID(),
          name,
          phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || '' : '',
          email: emailIdx >= 0 ? cols[emailIdx]?.trim() || '' : '',
          company: companyIdx >= 0 ? cols[companyIdx]?.trim() || '' : '',
          linkedin_url: linkedinIdx >= 0 ? cols[linkedinIdx]?.trim() || '' : '',
          instagram_url: instagramIdx >= 0 ? cols[instagramIdx]?.trim() || '' : '',
          source: sourceIdx >= 0 ? cols[sourceIdx]?.trim() || '' : 'csv_import',
        });
      }

      if (parsedLeads.length > 0) {
        setLeads(parsedLeads);
        setSelectedIds(new Set());
        setActiveTab('single'); // Switch to list view to review
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Excel parsing
  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const workbook = new Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        setExcelError('');
        if (!worksheet || !worksheet.rowCount || worksheet.rowCount < 2) {
          setExcelError('That sheet has no data rows. Add contacts below the header row and re-upload.');
          return;
        }

        // Normalise any cell value to a trimmed string. Excel auto-converts
        // emails/URLs to hyperlinks, so exceljs returns objects like
        // { text, hyperlink } (also richText / formula { result }) - a plain
        // String() on those yields "[object Object]", which is why email
        // uploads were silently dropped. Unwrap them here.
        const cellText = (v: unknown): string => {
          if (v == null) return '';
          if (typeof v === 'object') {
            const o = v as Record<string, unknown>;
            const rt = Array.isArray(o.richText)
              ? (o.richText as { text?: string }[]).map((r) => r.text ?? '').join('')
              : undefined;
            return String(o.text ?? rt ?? o.result ?? o.hyperlink ?? '').trim();
          }
          return String(v).trim();
        };
        const norm = (v: unknown) => cellText(v).toLowerCase().replace(/['"]/g, '');

        // Build header → 1-based column-number map (gap-safe; never compacted).
        const col: Record<string, number> = {};
        worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const h = norm(cell.value);
          if (h && !(h in col)) col[h] = colNumber;
        });
        const pick = (...names: string[]) => {
          for (const n of names) if (col[n]) return col[n];
          return 0;
        };
        const nameCol      = pick('name', 'full name', 'fullname', 'contact name');
        const phoneCol     = pick('phone', 'whatsapp', 'mobile', 'phone number');
        const emailCol     = pick('email', 'email address', 'e-mail');
        const companyCol   = pick('company', 'organization', 'org');
        const linkedinCol  = pick('linkedin', 'linkedin_url', 'linkedin url');
        const instagramCol = pick('instagram', 'instagram_url', 'instagram url');
        const sourceCol    = pick('source');

        if (!nameCol) {
          setExcelError('No "name" column found in the header row. Use Download Template to see the expected columns.');
          return;
        }

        const readCell = (row: ReturnType<typeof worksheet.getRow>, c: number) =>
          c ? cellText(row.getCell(c).value) : '';

        const parsedLeads: LeadEntry[] = [];
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          const name = readCell(row, nameCol);
          if (!name) continue;
          parsedLeads.push({
            id: crypto.randomUUID(),
            name,
            phone: readCell(row, phoneCol),
            email: readCell(row, emailCol),
            company: readCell(row, companyCol),
            linkedin_url: readCell(row, linkedinCol),
            instagram_url: readCell(row, instagramCol),
            source: readCell(row, sourceCol) || 'excel_import',
          });
        }

        if (parsedLeads.length === 0) {
          setExcelError('No rows with a name were found.');
          return;
        }
        // Email groups need an email per contact - surface it early rather
        // than silently importing 0.
        if (isEmailMode && !parsedLeads.some((l) => l.email.trim())) {
          setExcelError('None of the rows have an email address - email groups need an "email" column.');
        }
        setLeads(parsedLeads);
        setSelectedIds(new Set());
        setActiveTab('single');
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        setExcelError('Could not read that file. Make sure it is a valid .xlsx export.');
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (excelInputRef.current) excelInputRef.current.value = '';
  }, [isEmailMode]);

  // Download template
  const downloadTemplate = useCallback(async () => {
    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Leads Template');

      // Add header row
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Company', key: 'company', width: 20 },
        { header: 'LinkedIn', key: 'linkedin', width: 30 },
        { header: 'Instagram', key: 'instagram', width: 20 },
        { header: 'Source', key: 'source', width: 15 },
      ];

      // Style header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };

      // Add sample data
      worksheet.addRow({
        name: 'John Doe',
        phone: '+971501234567',
        email: 'john@example.com',
        company: 'Acme Inc',
        linkedin: 'linkedin.com/in/john',
        instagram: '@johndoe',
        source: 'manual',
      });

      worksheet.addRow({
        name: 'Jane Smith',
        phone: '+971507654321',
        email: 'jane@corp.com',
        company: 'Corp Ltd',
        linkedin: '',
        instagram: '@janesmith',
        source: 'manual',
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate template:', err);
    }
  }, []);

  // URL Scrape - pull contacts from a webpage and pre-fill the lead list
  const handleScrapeUrl = useCallback(async () => {
    const url = scrapeUrl.trim();
    if (!url) {
      setScrapeError('Please enter a URL');
      return;
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      setScrapeError('URL must start with http:// or https://');
      return;
    }

    setScraping(true);
    setScrapeError('');
    setScrapeStats(null);

    try {
      const res = await fetch(`${API_BASE}/leads/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setScrapeError(formatApiError(data) || `Failed (${res.status})`);
        return;
      }

      const extracted: any[] = data.data?.leads || [];
      if (extracted.length === 0) {
        setScrapeError('No contacts found on that page. Try a different URL or one with a member/team list.');
        return;
      }

      const newLeads: LeadEntry[] = extracted.map((c) => ({
        id: crypto.randomUUID(),
        name: String(c.name || '').trim(),
        phone: String(c.phone || '').trim(),
        email: String(c.email || '').trim(),
        company: String(c.company || '').trim(),
        linkedin_url: String(c.linkedin_url || '').trim(),
        instagram_url: String(c.instagram_url || '').trim(),
        source: String(c.source || '').trim() || 'url_scrape',
      }));

      setLeads(newLeads);
      setSelectedIds(new Set());
      setScrapeStats({ extracted: newLeads.length, chars: data.data?.scraped_chars || 0 });
      setActiveTab('single'); // jump to review list so user can edit before importing
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setScraping(false);
    }
  }, [scrapeUrl]);

  // Import - blocked when there are validation errors
  const handleImport = useCallback(async () => {
    const validLeads = isEmailMode
      ? leads.filter((l) => l.name.trim() && l.email.trim())
      : leads.filter((l) => l.name.trim());
    if (validLeads.length === 0) return;

    // Block if any validation errors remain
    if (invalidCount > 0) {
      setSelectedIds(new Set(invalidLeadIds));
      return;
    }

    setImporting(true);
    setImportResult(null);

    if (runInBackground) { onOpenChange(false); }

    try {
      // ── Email mode ─────────────────────────────────────────────────────────
      if (isEmailMode) {
        // Gmail/Outlook → LAD-Email-Comms POST /contacts. That endpoint
        // atomically bulk-upserts + assigns to a group if group_id is
        // supplied, so we don't need the follow-up /groups/:id/contacts
        // call. Custom SMTP still uses the legacy WABA envelope path.
        const isHosted = channel === 'gmail' || channel === 'outlook';
        const url = isHosted
          ? `/api/email-comms/contacts`
          : `${EMAIL_API}/contacts`;
        // Sanitize + validate emails client-side so one malformed row (e.g. a
        // trailing period) can't 422 the entire batch. Fixable artifacts are
        // cleaned; rows still invalid afterwards are dropped and reported.
        const cleaned = validLeads
          .map((l) => ({ l, email: sanitizeEmail(l.email) }))
          .filter((c) => isValidEmail(c.email));
        const skippedInvalid = validLeads.length - cleaned.length;
        if (cleaned.length === 0) {
          setImportResult({
            success: false, total: validLeads.length, imported: 0, conversations: 0,
            errors: [{ name: 'Import', error: 'No valid email addresses after cleaning - check the email column.' }],
            skipped: [], duplicates: [],
          });
          setImporting(false);
          return;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({
            contacts: cleaned.map((c) => ({
              name: c.l.name.trim(),
              email: c.email,
              company: c.l.company.trim() || null,
            })),
            channel,
            ...(emailGroupId ? { group_id: emailGroupId } : {}),
          }),
        });
        const data = await res.json();

        // Normalise the two response shapes:
        //   * LAD-Email-Comms: {imported, duplicates, contact_ids,
        //                       added_to_group}
        //   * Legacy WABA:     {success, data: {imported, contact_ids,
        //                       errors, skipped}}
        const ok = isHosted ? res.ok : !!data.success;
        const inner = isHosted ? data : (data.data ?? {});

        if (ok) {
          // For legacy provider, still need to add contacts to the group
          // after import - LAD-Email-Comms already did it atomically.
          if (!isHosted && emailGroupId && inner?.contact_ids?.length > 0) {
            try {
              await fetch(`${EMAIL_API}/groups/${emailGroupId}/contacts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
                },
                body: JSON.stringify({ contact_ids: inner.contact_ids }),
              });
            } catch { /* non-fatal */ }
          }
          if (runInBackground) {
            onImportComplete();
          } else {
            setImportResult({
              success: true,
              total: validLeads.length,
              imported: inner.imported ?? validLeads.length,
              conversations: 0,
              errors: (inner.errors || []).map((e: { name?: string; email?: string; error: string }) => ({
                name: e.name || e.email || 'Contact',
                error: e.error,
              })),
              skipped: [
                ...(isHosted && inner.duplicates
                  ? [{ name: `${inner.duplicates} contact(s)`, reason: 'already in address book' }]
                  : []),
                ...(!isHosted && inner.skipped
                  ? [{ name: `${inner.skipped} contact(s)`, reason: 'missing name or email' }]
                  : []),
                ...(skippedInvalid > 0
                  ? [{ name: `${skippedInvalid} contact(s)`, reason: 'invalid email address' }]
                  : []),
              ],
              duplicates: [],
              conversationIds: [],
            });
          }
        } else {
          if (!runInBackground) {
            setImportResult({
              success: false, total: validLeads.length, imported: 0, conversations: 0,
              errors: [{ name: 'Import', error: formatApiError(data) }],
              skipped: [],
              duplicates: [],
            });
          }
        }
        return;
      }

      // ── WhatsApp mode ──────────────────────────────────────────────────────
      const channelParam = channel === 'personal' ? '?channel=personal' : '';
      const res = await fetch(`${API_BASE}/leads/import${channelParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          leads: validLeads.map((l) => ({
            name: l.name.trim(),
            phone: l.phone.trim() || null,
            email: l.email.trim() || null,
            company: l.company.trim() || null,
            linkedin_url: l.linkedin_url.trim() || null,
            instagram_url: l.instagram_url.trim() || null,
            source: l.source.trim() || null,
          })),
          chat_group_ids: selectedGroupIds.size > 0 ? Array.from(selectedGroupIds) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (runInBackground) {
          onImportComplete();
        } else {
          setImportResult({
            success: true,
            total: data.data.total ?? validLeads.length,
            imported: data.data.imported,
            conversations: data.data.conversations_created,
            errors: data.data.errors || [],
            skipped: data.data.skipped || [],
            duplicates: data.data.duplicates || [],
            conversationIds: data.data.conversation_ids || [],
          });
        }
      } else {
        if (!runInBackground) {
          setImportResult({
            success: false, total: validLeads.length, imported: 0, conversations: 0,
            errors: [{ name: 'Import', error: data.error || 'Unknown error' }],
            skipped: [],
            duplicates: [],
          });
        }
      }
    } catch (err) {
      if (!runInBackground) {
        setImportResult({
          success: false, total: validLeads.length, imported: 0, conversations: 0,
          errors: [{ name: 'Import', error: String(err) }],
          skipped: [],
          duplicates: [],
        });
      }
    } finally {
      setImporting(false);
    }
  }, [leads, selectedGroupIds, onImportComplete, onOpenChange, invalidCount, invalidLeadIds, runInBackground, channel, isEmailMode, emailGroupId]);

  const handleAddToExistingGroups = useCallback(async () => {
    if (postImportGroupIds.size === 0) return;
    setAddingToGroups(true);
    try {
      const channelParam = channel === 'personal' ? '?channel=personal' : '';
      const leadsForGroup = leads
        .filter((l) => l.name.trim() && l.phone.trim())
        .map((l) => ({
          name: l.name.trim(),
          phone: l.phone.trim(),
          email: l.email.trim() || null,
        }));
      for (const groupId of postImportGroupIds) {
        await fetch(`${API_BASE}/chat-groups/${groupId}/import-contacts${channelParam}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ contacts: leadsForGroup }),
        });
      }
      setShowAddToGroupPrompt(false);
      setPostImportGroupIds(new Set());
      onOpenChange(false);
      onImportComplete();
    } catch (err) {
      console.error('Failed to add to groups:', err);
    } finally {
      setAddingToGroups(false);
    }
  }, [leads, postImportGroupIds, channel, onImportComplete, onOpenChange]);

  const validCount = isEmailMode
    ? leads.filter((l) => l.name.trim() && l.email.trim()).length
    : leads.filter((l) => l.name.trim()).length;
  const hasValidationErrors = invalidCount > 0;
  const allInvalidSelected = invalidCount > 0 && invalidLeadIds.size === selectedIds.size &&
    [...invalidLeadIds].every((id) => selectedIds.has(id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={isEmailMode ? "dark:bg-black/75 backdrop-blur-xs" : undefined}
        className={cn(
          "w-[calc(100%-1.5rem)] sm:w-[90vw] sm:max-w-5xl h-auto max-h-[90vh] flex flex-col p-0 gap-0 border rounded-2xl overflow-hidden shadow-2xl dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] dark:ring-1 dark:ring-white/10",
          isWhatsApp
            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800"
            : isEmailMode
            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700"
            : "bg-white dark:bg-[#000724] border-slate-200 dark:border-slate-800"
        )}
      >
        <DialogHeader className={cn(
          "flex flex-row items-center justify-between border-b px-3.5 py-3 sm:px-6 sm:py-4 shrink-0",
          isWhatsApp || isEmailMode
            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            : "bg-white dark:bg-[#081331] border-gray-100 dark:border-slate-800/80"
        )}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn(
              "p-1.5 sm:p-2 rounded-full shadow-sm flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border shrink-0",
              isWhatsApp
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : isEmailMode
                ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/20"
                : "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20"
            )}>
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5px]" />
            </div>
            <DialogTitle className={cn(
              "text-sm min-[390px]:text-base sm:text-xl font-bold tracking-tight whitespace-nowrap",
              isWhatsApp || isEmailMode
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-gray-900 dark:text-white"
            )}>
              {isEmailMode ? 'Import Email Contacts' : 'Import Leads'}
            </DialogTitle>
          </div>
          <DialogClose className={cn(
            "p-1 sm:p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity focus:outline-none cursor-pointer shrink-0 ml-1.5 sm:ml-2",
            isWhatsApp || isEmailMode
              ? "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}>
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            isEmailMode
              ? "bg-zinc-50/50 dark:bg-zinc-950"
              : isWhatsApp
              ? "bg-zinc-50/50 dark:bg-zinc-900"
              : "bg-gray-50/30 dark:bg-[#000724]"
          )}
        >
          <TabsList className={cn(
            "mx-3 sm:mx-8 mt-4 sm:mt-6 max-w-[calc(100%-1.5rem)] sm:max-w-full overflow-x-auto justify-start flex-nowrap shrink-0 p-1 rounded-xl h-auto gap-1 border shadow-sm dark:shadow-md dark:shadow-black/40",
            isEmailMode
              ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              : isWhatsApp
              ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/80"
              : "bg-slate-100 dark:bg-[#071131] border-slate-200 dark:border-slate-800/70"
          )}>
            <TabsTrigger
              value="single"
              className={cn(
                "text-xs px-3 py-1.5 gap-1.5 rounded-lg font-medium transition-all shrink-0 whitespace-nowrap shadow-none data-[state=inactive]:shadow-none",
                isWhatsApp
                  ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 data-[state=active]:bg-emerald-600 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/30"
                  : isEmailMode
                  ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 data-[state=active]:bg-[#0B1957] data-[state=active]:text-white dark:data-[state=active]:bg-sky-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 data-[state=active]:bg-[#0B1957] data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/40"
              )}
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              {isEmailMode ? 'Add Contacts' : 'Add Leads'}
            </TabsTrigger>
            <TabsTrigger
              value="excel"
              className={cn(
                "text-xs px-3 py-1.5 gap-1.5 rounded-lg font-medium transition-all shrink-0 whitespace-nowrap shadow-none data-[state=inactive]:shadow-none",
                isWhatsApp
                  ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 data-[state=active]:bg-emerald-600 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/30"
                  : isEmailMode
                  ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 data-[state=active]:bg-[#0B1957] data-[state=active]:text-white dark:data-[state=active]:bg-sky-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 data-[state=active]:bg-[#0B1957] data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/40"
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              Excel Upload
            </TabsTrigger>
            {!isEmailMode && (
              <TabsTrigger
                value="url"
                className={cn(
                  "text-xs px-3 py-1.5 gap-1.5 rounded-lg font-medium transition-all shrink-0 whitespace-nowrap shadow-none data-[state=inactive]:shadow-none",
                  isWhatsApp
                    ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 data-[state=active]:bg-emerald-600 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 data-[state=active]:bg-[#0B1957] data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm dark:data-[state=active]:shadow-md dark:data-[state=active]:shadow-black/40"
                )}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                Scrape from URL
              </TabsTrigger>
            )}
          </TabsList>


          {/* ── Excel Upload Tab ─────────────────────── */}
          <TabsContent value="excel" className="px-3 sm:px-8 py-4 sm:py-6 flex-1">
            <div className={cn(
              "border-2 border-dashed rounded-xl p-4 sm:p-8 text-center transition-colors",
              isEmailMode
                ? "border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/70 hover:border-sky-500/50 dark:hover:border-sky-500/60 text-zinc-700 dark:text-zinc-300 shadow-xs"
                : isWhatsApp
                ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 hover:border-emerald-500/50 text-zinc-700 dark:text-zinc-300"
                : "border-border dark:border-slate-800 bg-white dark:bg-[#071131] hover:border-blue-500/50"
            )}>
              <Upload className={cn("h-10 w-10 mx-auto mb-3", (isWhatsApp || isEmailMode) ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground")} />
              <p className={cn("text-sm font-medium mb-1", (isWhatsApp || isEmailMode) ? "text-zinc-900 dark:text-zinc-200" : "")}>Upload Excel file (.xlsx)</p>
              <p className={cn("text-xs mb-4", (isWhatsApp || isEmailMode) ? "text-zinc-500 dark:text-zinc-400" : "text-muted-foreground")}>
                {isEmailMode ? (
                  <>Required: <span className="font-medium">name</span>, <span className="font-medium">email</span>. Optional: company, phone, source</>
                ) : (
                  <>Required: <span className="font-medium">name</span>. Optional: phone, email, company, linkedin, instagram, source</>
                )}
              </p>
              {excelError && (
                <p className="text-xs text-red-600 dark:text-red-300/90 bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/25 rounded-lg p-2.5 mb-4 text-left">
                  {excelError}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 justify-center items-stretch sm:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => excelInputRef.current?.click()}
                  className={cn(
                    "w-full sm:w-auto justify-center",
                    (isWhatsApp || isEmailMode) && "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Choose Excel File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className={cn(
                    "w-full sm:w-auto justify-center",
                    (isWhatsApp || isEmailMode) && "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </div>
          </TabsContent>

          {/* ── URL Scrape Tab ───────────────────────── */}
          <TabsContent value="url" className="px-3 sm:px-4 py-3 flex-1">
            <div className={cn(
              "border-2 border-dashed rounded-xl p-3.5 sm:p-6",
              isWhatsApp
                ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300"
                : "border-border dark:border-slate-800 bg-white dark:bg-[#071131]"
            )}>
              <div className="flex items-start gap-3 mb-4">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                  isWhatsApp
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400"
                )}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium mb-0.5", isWhatsApp ? "text-zinc-900 dark:text-zinc-200" : "")}>Extract contacts from any webpage</p>
                  <p className={cn("text-xs", isWhatsApp ? "text-zinc-500 dark:text-zinc-400" : "text-muted-foreground")}>
                    Paste a URL. This can be a member directory, team page, chapter listing, or similar page. We&apos;ll fetch the page, including JavaScript-rendered pages, and use AI to extract names, phone numbers, emails, companies, and social profiles.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Globe className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isWhatsApp ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground")} />
                  <Input
                    placeholder="https://example.com/team or member directory URL"
                    value={scrapeUrl}
                    onChange={(e) => { setScrapeUrl(e.target.value); setScrapeError(''); }}
                    disabled={scraping}
                    className={cn("pl-9 h-9 text-sm", inputBorderClass)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !scraping && scrapeUrl.trim()) {
                        handleScrapeUrl();
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleScrapeUrl}
                  disabled={scraping || !scrapeUrl.trim()}
                  className={cn(
                    "gap-1.5 shrink-0 w-full sm:w-auto justify-center",
                    isWhatsApp && "bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                  )}
                >
                  {scraping ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Scrape &amp; Extract
                    </>
                  )}
                </Button>
              </div>

              {scraping && (
                <div className="text-xs text-muted-foreground italic">
                  Fetching the page and extracting contacts - this can take 20-45 seconds for
                  JavaScript-heavy pages.
                </div>
              )}

              {scrapeError && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-300/90 bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/25 rounded-lg p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                  <span>{scrapeError}</span>
                </div>
              )}

              {scrapeStats && !scrapeError && (
                <div className="flex items-start gap-2 text-xs text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/20 rounded-lg p-2.5">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600 dark:text-emerald-400" />
                  <span>
                    Extracted <strong>{scrapeStats.extracted}</strong> contact{scrapeStats.extracted !== 1 ? 's' : ''}
                    {scrapeStats.chars > 0 && ` from ${scrapeStats.chars.toLocaleString()} chars of page content`}.
                    Switched to the Add Leads tab - review and edit before importing.
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Single/List Add Tab ────────────────── */}
          <TabsContent value="single" className="flex-1 flex flex-col min-h-0 px-3 sm:px-8 py-4 sm:py-6">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2">
              <div className="space-y-3">
                {leads.map((lead, idx) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    index={idx}
                    errors={validationErrors[lead.id] || {}}
                    isSelected={selectedIds.has(lead.id)}
                    onUpdate={updateLead}
                    onRemove={removeLead}
                    onToggleSelect={toggleSelectLead}
                    canRemove={leads.length > 1}
                    isEmailMode={isEmailMode}
                    isWhatsApp={isWhatsApp}
                  />
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "mt-2 w-full text-xs justify-center gap-1.5 border border-dashed transition-all",
                isWhatsApp
                  ? "text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                  : isEmailMode
                  ? "text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 hover:text-sky-600 dark:hover:text-sky-400"
                  : "text-blue-600 dark:text-blue-400 border-blue-400/40 dark:border-blue-500/40 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400"
              )}
              onClick={addLead}
            >
              <Plus className="h-3.5 w-3.5" />
              {isEmailMode ? 'Add Another Contact' : 'Add Another Lead'}
            </Button>
          </TabsContent>
        </Tabs>

        {/* ── Invalid Records Banner ──────────────── */}
        {hasValidationErrors && !importResult?.success && (
          <div className={cn(
            "mx-3 sm:mx-8 mb-4 rounded-xl border overflow-hidden shadow-sm",
            isWhatsApp || isEmailMode
              ? "bg-amber-50/80 dark:bg-zinc-900 border-amber-200 dark:border-amber-500/25"
              : "bg-amber-50/80 dark:bg-[#071131] border-amber-200 dark:border-amber-500/25"
          )}>
            {/* Top row: summary + bulk actions */}
            <div className="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 text-amber-800 dark:text-amber-200/90">
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400/80" />
                <span className="text-xs font-medium">
                  {invalidCount} record{invalidCount !== 1 ? 's' : ''} with invalid data - fix or delete before importing
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 dark:border-amber-500/30 bg-amber-100/50 dark:bg-amber-500/10 text-amber-800 hover:text-amber-800 dark:text-amber-200/90 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                  onClick={allInvalidSelected ? () => setSelectedIds(new Set()) : handleSelectAllInvalid}
                >
                  {allInvalidSelected ? 'Deselect All' : 'Select All Invalid'}
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white dark:bg-red-800 dark:hover:bg-red-900 dark:text-white border-transparent"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete {selectedIds.size}
                  </Button>
                )}
              </div>
            </div>
            {/* Auto-fix row: only shown when phone errors exist and a country code can be inferred */}
            {phoneErrorLeadIds.size > 0 && detectedCountryCode && (
              <div className="px-3 py-2 border-t flex items-center justify-between gap-3 border-amber-200 dark:border-amber-500/20 bg-amber-100/80 dark:bg-amber-500/[0.06] text-amber-900 dark:text-amber-200/80">
                <span className="text-xs">
                  <span className="font-semibold">Auto-fix phones:</span>{' '}
                  detected country code{' '}
                  <code className="rounded px-1 font-mono bg-amber-200 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 dark:border dark:border-amber-500/30">
                    {detectedCountryCode}
                  </code>{' '}
                  from existing records - apply to {phoneErrorLeadIds.size} number{phoneErrorLeadIds.size !== 1 ? 's' : ''}?
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0 border-amber-400 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-500/20"
                  onClick={handleAutoFixPhones}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Auto-fix
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Broadcast Assignment (pre-import only) ──────────────── */}
        {groups.length > 0 && !importResult?.success && !isEmailMode && (
          <div className={cn(
            "px-4 py-3 border-t",
            isWhatsApp ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" : "border-border dark:border-slate-800/80 bg-white dark:bg-[#071131]"
          )}>
            <p className={cn(
              "text-xs font-semibold uppercase mb-2",
              isWhatsApp ? "text-zinc-500 dark:text-zinc-400" : "text-muted-foreground"
            )}>
              Assign to Broadcasts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => {
                const selected = selectedGroupIds.has(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                      selected
                        ? isWhatsApp
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-blue-600 text-white border-blue-600'
                        : isWhatsApp
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/50'
                          : 'bg-muted/50 text-muted-foreground border-border dark:border-slate-800 hover:border-blue-500/50'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: selected ? 'white' : g.color }}
                    />
                    {g.name}
                    {selected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Import Result ──────────────────────── */}
        {importResult && (
          <div className={cn(
            'mx-4 mb-2 p-3 rounded-lg text-sm',
            importResult.success
              ? isWhatsApp || isEmailMode
                ? 'bg-emerald-50 dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-green-50 dark:bg-[#071131] text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/20'
              : isWhatsApp || isEmailMode
                ? 'bg-red-50 dark:bg-zinc-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/20'
                : 'bg-red-50 dark:bg-[#071131] text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/20'
          )}>
            {importResult.success ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-2 min-w-0 w-full">
                    <span className="block">
                      <strong>{importResult.imported}</strong> of <strong>{importResult.total}</strong> lead{importResult.total !== 1 ? 's' : ''} imported
                      {importResult.conversations > 0 && (
                        <> - <strong>{importResult.conversations}</strong> new conversation{importResult.conversations !== 1 ? 's' : ''} created</>
                      )}
                      {importResult.duplicates.length > 0 && (
                        <>, <strong>{importResult.duplicates.length}</strong> linked to existing</>
                      )}
                    </span>

                    {(importResult.skipped.length > 0 || importResult.errors.length > 0) && (
                      <div className="rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/[0.08] p-2.5 text-xs text-amber-800 dark:text-amber-200/90">
                        <p className="font-semibold mb-1.5">
                          {importResult.skipped.length + importResult.errors.length} number{(importResult.skipped.length + importResult.errors.length) !== 1 ? 's were' : ' was'} excluded
                        </p>
                        {importResult.skipped.length > 0 && (
                          <details open className="mb-1">
                            <summary className="cursor-pointer font-medium select-none">
                              ⚠ {importResult.skipped.length} skipped (validation)
                            </summary>
                            <ul className="mt-1 ml-3 space-y-0.5 max-h-32 overflow-y-auto">
                              {importResult.skipped.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="shrink-0 text-amber-500 dark:text-amber-400">·</span>
                                  <span className="break-all">
                                    <strong>{s.name}</strong>
                                    {s.phone ? <span className="text-amber-700/80 dark:text-amber-300/80"> ({s.phone})</span> : null}
                                    {' - '}{s.reason}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {importResult.errors.length > 0 && (
                          <details open className="text-red-700 dark:text-red-300/90">
                            <summary className="cursor-pointer font-medium select-none">
                              ✕ {importResult.errors.length} failed (error)
                            </summary>
                            <ul className="mt-1 ml-3 space-y-0.5 max-h-32 overflow-y-auto">
                              {importResult.errors.map((e, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="shrink-0 text-red-400">·</span>
                                  <span className="break-all">
                                    <strong>{e.name}</strong>
                                    {e.phone ? <span className="text-red-600/80 dark:text-red-300/80"> ({e.phone})</span> : null}
                                    {' - '}{e.error}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}

                    {importResult.duplicates.length > 0 && (
                      <details className="rounded-md border border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/[0.08] p-2.5 text-xs text-blue-800 dark:text-blue-200/90">
                        <summary className="cursor-pointer font-medium select-none">
                          ℹ {importResult.duplicates.length} already existed - linked to existing conversation{importResult.duplicates.length !== 1 ? 's' : ''}
                        </summary>
                        <ul className="mt-1 ml-3 space-y-0.5 max-h-32 overflow-y-auto">
                          {importResult.duplicates.map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="shrink-0 text-blue-500 dark:text-blue-400">·</span>
                              <span className="break-all">
                                <strong>{d.name}</strong>
                                {d.phone ? <span className="text-blue-700/80 dark:text-blue-300/80"> ({d.phone})</span> : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
                {!showBroadcastPrompt && !showAddToGroupPrompt && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs font-medium mb-2">Add to a broadcast group?</p>
                    <div className="flex gap-2 flex-wrap">
                      {groups.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1"
                          onClick={() => setShowAddToGroupPrompt(true)}
                        >
                          <FolderPlus className="h-3 w-3" />
                          Add to Existing Group
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => setShowBroadcastPrompt(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Create New Group
                      </Button>
                    </div>
                  </div>
                )}
                {showAddToGroupPrompt && !showBroadcastPrompt && (
                  <div className="mt-2 pt-2 border-t border-green-200 space-y-2">
                    <p className="text-xs font-medium">Select groups to add leads into:</p>
                    {groups.length === 0 ? (
                      <p className="text-xs text-green-600/70">No broadcast groups found.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {groups.map((g) => {
                          const sel = postImportGroupIds.has(g.id);
                          return (
                            <button
                              key={g.id}
                              onClick={() =>
                                setPostImportGroupIds((prev) => {
                                  const n = new Set(prev);
                                  if (n.has(g.id)) n.delete(g.id); else n.add(g.id);
                                  return n;
                                })
                              }
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                                sel
                                  ? 'bg-green-700 text-white border-green-700'
                                  : 'bg-green-50 text-green-700 border-green-300 hover:border-green-500'
                              )}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: sel ? 'white' : g.color }}
                              />
                              {g.name}
                              {sel && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        onClick={() => {
                          setShowAddToGroupPrompt(false);
                          setPostImportGroupIds(new Set());
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs flex-1"
                        disabled={postImportGroupIds.size === 0 || addingToGroups}
                        onClick={handleAddToExistingGroups}
                      >
                        {addingToGroups && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Add to {postImportGroupIds.size} Group{postImportGroupIds.size !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                )}
                {showBroadcastPrompt && (
                  <div className="mt-2 pt-2 border-t border-green-200 space-y-2">
                    <Input
                      placeholder="Enter broadcast name..."
                      value={broadcastName}
                      onChange={(e) => { setBroadcastName(e.target.value); setBroadcastCreateError(''); }}
                      disabled={creatingBroadcast}
                      className={cn("h-8 text-xs", inputBorderClass)}
                      autoFocus
                    />
                    {broadcastCreateError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-300/90 bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/25 rounded px-2 py-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500 dark:text-red-400" />
                        {broadcastCreateError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={creatingBroadcast}
                        onClick={() => {
                          setShowBroadcastPrompt(false);
                          setBroadcastName('');
                          setBroadcastCreateError('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs flex-1"
                        disabled={creatingBroadcast || !broadcastName.trim()}
                        onClick={async () => {
                          if (!broadcastName.trim() || creatingBroadcast) return;
                          setCreatingBroadcast(true);
                          setBroadcastCreateError('');
                          try {
                            const channelParam = channel === 'personal' ? '?channel=personal' : '';
                            const createRes = await fetch(`${API_BASE}/chat-groups${channelParam}`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
                              },
                              body: JSON.stringify({ name: broadcastName.trim() }),
                            });
                            const groupData = await createRes.json();
                            if (!createRes.ok) {
                              setBroadcastCreateError(groupData?.error || `Failed to create group (${createRes.status})`);
                              return;
                            }
                            const newGroup = groupData.group || groupData.data || (groupData.id ? groupData : null);
                            if (!newGroup?.id) {
                              setBroadcastCreateError('Group created but ID not returned - please refresh.');
                              return;
                            }
                            // Add the imported leads as members
                            const leadsForGroup = leads
                              .filter((l) => l.name.trim() && l.phone.trim())
                              .map((l) => ({
                                name: l.name.trim(),
                                phone: l.phone.trim(),
                                email: l.email.trim() || null,
                              }));
                            if (leadsForGroup.length > 0) {
                              const addRes = await fetch(`${API_BASE}/chat-groups/${newGroup.id}/import-contacts${channelParam}`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
                                },
                                body: JSON.stringify({ contacts: leadsForGroup }),
                              });
                              if (!addRes.ok) {
                                const addData = await addRes.json().catch(() => ({}));
                                setBroadcastCreateError(addData?.error || 'Group created but failed to add contacts.');
                                return;
                              }
                            }
                            setShowBroadcastPrompt(false);
                            setBroadcastName('');
                            onOpenChange(false);
                            onImportComplete();
                          } catch (err) {
                            console.error('Failed to create broadcast:', err);
                            setBroadcastCreateError('Unexpected error. Please try again.');
                          } finally {
                            setCreatingBroadcast(false);
                          }
                        }}
                      >
                        {creatingBroadcast ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Creating...
                          </>
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{importResult.errors[0]?.error || 'Import failed'}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────────── */}
        <DialogActions className={cn(
          "border-t p-4 flex items-center justify-between",
          isWhatsApp || isEmailMode
            ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900"
            : "border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-[#081331]"
        )}>
          {!importResult?.success ? (
            <div className="flex flex-col w-full space-y-4">
              {/* Run in background toggle - only shown when importing more than 1 lead */}
              {validCount > 1 && !hasValidationErrors && (
                <button
                  type="button"
                  onClick={() => setRunInBackground((v) => !v)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors text-left text-xs',
                    runInBackground
                      ? isWhatsApp
                        ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : isEmailMode
                        ? 'border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400'
                        : 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : isWhatsApp || isEmailMode
                        ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-blue-500/30 hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    runInBackground
                      ? isWhatsApp
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isEmailMode
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-blue-600 border-blue-600 text-white'
                      : isWhatsApp || isEmailMode
                        ? 'border-zinc-400 dark:border-zinc-600'
                        : 'border-muted-foreground/40'
                  )}>
                    {runInBackground && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', runInBackground && 'animate-spin')} />
                  <span>
                    <span className="font-medium">Run in background</span>
                    {' '}- close this dialog and continue importing without waiting
                  </span>
                </button>
              )}
              <div className="flex items-center justify-between w-full">
                <div className="text-sm font-medium">
                  {hasValidationErrors ? (
                    <span className={isWhatsApp || isEmailMode ? "text-amber-700 dark:text-amber-300/90" : "text-amber-600 dark:text-amber-300/90"}>
                      Fix {invalidCount} invalid record{invalidCount !== 1 ? 's' : ''} to continue
                    </span>
                  ) : (
                    <span className={isWhatsApp || isEmailMode ? "text-zinc-600 dark:text-zinc-400" : "text-muted-foreground"}>
                      {validCount} {isEmailMode ? 'contact' : 'lead'}{validCount !== 1 ? 's' : ''} ready to import
                      {!isEmailMode && selectedGroupIds.size > 0 && (
                        <span className="ml-1">
                          into {selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isEmailMode && emailGroupId && (
                        <span className="ml-1">into group</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleImport}
                    disabled={importing || validCount === 0 || hasValidationErrors}
                    className={cn(
                      "rounded-xl px-8 py-2.5 font-bold text-white shadow-lg transition-all disabled:opacity-50",
                      isWhatsApp
                        ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/10 dark:shadow-emerald-950/30"
                        : isEmailMode
                        ? "bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold shadow-sm"
                        : "bg-[#0B1957] hover:bg-[#0B1957]/90"
                    )}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Importing...
                      </>
                    ) : runInBackground ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Import & Close
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Import {validCount} {isEmailMode ? 'Contact' : 'Lead'}{validCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className={cn(
                "rounded-xl px-6 py-2.5 font-semibold transition-colors",
                isWhatsApp || isEmailMode
                  ? "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                  : "text-gray-500 border-gray-200 hover:bg-gray-50"
              )}
              onClick={() => {
                onOpenChange(false);
                onImportComplete();
              }}
            >
              {showBroadcastPrompt ? 'Cancel' : 'Skip & Close'}
            </Button>
          )}
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

// ── Lead Row Component ───────────────────────────────────────────

interface LeadRowProps {
  lead: LeadEntry;
  index: number;
  errors: Record<string, string>;
  isSelected: boolean;
  onUpdate: (id: string, field: keyof LeadEntry, value: string) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  canRemove: boolean;
  isEmailMode?: boolean;
  isWhatsApp?: boolean;
}

function LeadRow({ lead, index, errors, isSelected, onUpdate, onRemove, onToggleSelect, canRemove, isEmailMode, isWhatsApp }: LeadRowProps) {
  const channels = detectChannels(lead);
  const hasErrors = Object.keys(errors).length > 0;
  const inputBorderClass = isWhatsApp
    ? "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 focus:border-emerald-500 focus-visible:outline-none"
    : isEmailMode
    ? "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500 focus:border-sky-500 focus-visible:outline-none shadow-2xs"
    : "border border-gray-300 dark:border-slate-700/80 bg-white dark:bg-[#000724] text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 focus:border-blue-500 focus-visible:outline-none shadow-2xs";

  return (
    <div
      className={cn(
        'p-2.5 sm:p-3 rounded-xl border transition-colors',
        isWhatsApp || isEmailMode
          ? hasErrors
            ? isSelected
              ? 'border-red-500/60 bg-red-50 dark:bg-red-500/[0.08] ring-2 ring-red-500/20'
              : 'border-red-300 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/[0.04] hover:border-red-400 dark:hover:border-red-500/50'
            : isEmailMode
            ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs dark:shadow-md dark:shadow-black/20'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          : hasErrors
            ? isSelected
              ? 'border-red-400 dark:border-red-500/50 bg-red-50/60 dark:bg-[#071131] ring-2 ring-red-200 dark:ring-red-500/20'
              : 'border-red-300 dark:border-red-500/30 bg-red-50/30 dark:bg-[#071131] hover:border-red-400 dark:hover:border-red-500/50'
            : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#071131] hover:border-blue-500/30'
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          {/* Checkbox for selection (only when errors exist) */}
          {hasErrors && (
            <button
              onClick={() => onToggleSelect(lead.id)}
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0',
                isSelected
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'border-red-300 dark:border-red-500/40 hover:border-red-500'
              )}
            >
              {isSelected && <Check className="h-2.5 w-2.5" />}
            </button>
          )}
          <span className={cn(
            'text-[10px] font-semibold uppercase',
            hasErrors ? 'text-red-500 dark:text-red-300/80' : (isWhatsApp || isEmailMode) ? 'text-zinc-500 dark:text-zinc-400' : 'text-muted-foreground'
          )}>
            {hasErrors && <TriangleAlert className="inline h-3 w-3 mr-0.5 -mt-px text-red-500 dark:text-red-300/80" />}
            {isEmailMode ? `Contact #${index + 1}` : `Lead #${index + 1}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Channel badges auto-detected */}
          {channels.map((ch) => {
            const info = CHANNEL_ICONS[ch];
            if (!info) return null;
            const Icon = info.icon;
            return (
              <Badge key={ch} variant="secondary" className={cn('text-[9px] px-1.5 py-0 h-4 gap-1', info.color)}>
                <Icon className="h-2.5 w-2.5" />
                {info.label}
              </Badge>
            );
          })}
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-5 w-5 hover:text-destructive",
                (isWhatsApp || isEmailMode) ? "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" : "text-muted-foreground"
              )}
              onClick={() => onRemove(lead.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 1: Name + Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div className="relative">
          <Input
            placeholder="Full name *"
            value={lead.name}
            onChange={(e) => onUpdate(lead.id, 'name', e.target.value)}
            className={cn("h-8 text-sm pl-3", inputBorderClass)}
          />
        </div>
        <div className="relative">
          <Building2 className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5", (isWhatsApp || isEmailMode) ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground")} />
          <Input
            placeholder="Company"
            value={lead.company}
            onChange={(e) => onUpdate(lead.id, 'company', e.target.value)}
            className={cn("h-8 text-sm pl-8", inputBorderClass)}
          />
        </div>
      </div>

      {/* Row 2: Phone + Email  (email mode shows only Email, full-width) */}
      {isEmailMode ? (
        <div className="mb-2">
          <div className="space-y-1">
            <div className="relative">
              <Mail className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                errors.email ? 'text-red-400 dark:text-red-400/90' : 'text-zinc-400 dark:text-zinc-500'
              )} />
              <Input
                placeholder="Email *"
                value={lead.email}
                onChange={(e) => onUpdate(lead.id, 'email', e.target.value)}
                className={cn(
                  'h-8 text-sm pl-8',
                  inputBorderClass,
                  errors.email && 'border-red-400 dark:border-red-500/40 focus-visible:ring-red-300 dark:focus-visible:ring-red-500/20'
                )}
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-red-500 dark:text-red-300/80 leading-tight pl-1">{errors.email}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div className="space-y-1">
            <div className="relative">
              <Phone className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                errors.phone ? 'text-red-400 dark:text-red-400/90' : isWhatsApp ? 'text-zinc-400 dark:text-zinc-500' : 'text-green-500'
              )} />
              <Input
                type="tel"
                placeholder="+971501234567"
                value={lead.phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
                  onUpdate(lead.id, 'phone', cleaned);
                }}
                className={cn(
                  'h-8 text-sm pl-8',
                  inputBorderClass,
                  errors.phone && 'border-red-400 dark:border-red-500/40 focus-visible:ring-red-300 dark:focus-visible:ring-red-500/20'
                )}
              />
            </div>
            {errors.phone && (
              <p className="text-[10px] text-red-500 dark:text-red-300/80 leading-tight pl-1">{errors.phone}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Mail className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                errors.email ? 'text-red-400 dark:text-red-400/90' : isWhatsApp ? 'text-zinc-400 dark:text-zinc-500' : 'text-orange-400'
              )} />
              <Input
                placeholder="Email"
                value={lead.email}
                onChange={(e) => onUpdate(lead.id, 'email', e.target.value)}
                className={cn(
                  'h-8 text-sm pl-8',
                  inputBorderClass,
                  errors.email && 'border-red-400 dark:border-red-500/40 focus-visible:ring-red-300 dark:focus-visible:ring-red-500/20'
                )}
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-red-500 dark:text-red-300/80 leading-tight pl-1">{errors.email}</p>
            )}
          </div>
        </div>
      )}

      {/* Row 3: LinkedIn + Instagram - hidden in email mode */}
      {!isEmailMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="relative">
              <Linkedin className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                errors.linkedin_url ? 'text-red-400 dark:text-red-400/90' : isWhatsApp ? 'text-zinc-400 dark:text-zinc-500' : 'text-blue-600'
              )} />
              <Input
                placeholder="linkedin.com/in/..."
                value={lead.linkedin_url}
                onChange={(e) => onUpdate(lead.id, 'linkedin_url', e.target.value)}
                className={cn(
                  'h-8 text-sm pl-8',
                  inputBorderClass,
                  errors.linkedin_url && 'border-red-400 dark:border-red-500/40 focus-visible:ring-red-300 dark:focus-visible:ring-red-500/20'
                )}
              />
            </div>
            {errors.linkedin_url && (
              <p className="text-[10px] text-red-500 dark:text-red-300/80 leading-tight pl-1">{errors.linkedin_url}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Instagram className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                errors.instagram_url ? 'text-red-400 dark:text-red-400/90' : isWhatsApp ? 'text-zinc-400 dark:text-zinc-500' : 'text-pink-500'
              )} />
              <Input
                placeholder="@handle or instagram.com/..."
                value={lead.instagram_url}
                onChange={(e) => onUpdate(lead.id, 'instagram_url', e.target.value)}
                className={cn(
                  'h-8 text-sm pl-8',
                  inputBorderClass,
                  errors.instagram_url && 'border-red-400 dark:border-red-500/40 focus-visible:ring-red-300 dark:focus-visible:ring-red-500/20'
                )}
              />
            </div>
            {errors.instagram_url && (
              <p className="text-[10px] text-red-500 dark:text-red-300/80 leading-tight pl-1">{errors.instagram_url}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV line parser (handles quoted fields) ──────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
