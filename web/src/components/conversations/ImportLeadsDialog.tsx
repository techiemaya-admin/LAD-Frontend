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
  channel?: 'personal' | 'waba';
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
  whatsapp: { icon: Phone, color: 'text-green-600 bg-green-50', label: 'WhatsApp' },
  linkedin: { icon: Linkedin, color: 'text-blue-600 bg-blue-50', label: 'LinkedIn' },
  instagram: { icon: Instagram, color: 'text-pink-600 bg-pink-50', label: 'Instagram' },
  gmail: { icon: Mail, color: 'text-orange-500 bg-orange-50', label: 'Email' },
};

const API_BASE = '/api/whatsapp-conversations';

// ── Validation ───────────────────────────────────────────────────

/**
 * Validate a single lead's optional fields.
 * Returns a map of field → error message. Empty object means valid.
 * All fields are optional — only validated when non-empty.
 */
function validateLead(lead: LeadEntry): Record<string, string> {
  const errors: Record<string, string> = {};

  // Phone: if provided, must contain 7–15 digits (no + requirement)
  if (lead.phone.trim()) {
    const digits = lead.phone.trim().replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'Must be 7–15 digits (e.g. 501234567 or +971501234567)';
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

// ── Component ────────────────────────────────────────────────────

export function ImportLeadsDialog({ open, onOpenChange, onImportComplete, channel }: ImportLeadsDialogProps) {
  const [activeTab, setActiveTab] = useState('single');
  const [leads, setLeads] = useState<LeadEntry[]>([newLead()]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    conversations: number;
    conversationIds?: string[];
    errors: { name: string; error: string }[];
    skipped: { name: string; reason: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [broadcastName, setBroadcastName] = useState('');
  const [showBroadcastPrompt, setShowBroadcastPrompt] = useState(false);
  const [showAddToGroupPrompt, setShowAddToGroupPrompt] = useState(false);
  const [postImportGroupIds, setPostImportGroupIds] = useState<Set<string>>(new Set());
  const [addingToGroups, setAddingToGroups] = useState(false);
  const [creatingBroadcast, setCreatingBroadcast] = useState(false);
  const [broadcastCreateError, setBroadcastCreateError] = useState('');

  // Multi-select state for bulk-delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Load chat groups when dialog opens
  useEffect(() => {
    if (!open) return;
    const channelParam = channel === 'personal' ? '?channel=personal' : '';
    fetch(`${API_BASE}/chat-groups${channelParam}`, {
      headers: {
        'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setGroups(data.data || []);
      })
      .catch(() => {});
  }, [open, channel]);

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

        if (!worksheet || !worksheet.rowCount || worksheet.rowCount < 2) return;

        // Parse header
        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values
          ?.map((h) => String(h || '').trim().toLowerCase().replace(/['"]/g, ''))
          .filter((h) => h) || [];

        const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full name' || h === 'fullname');
        const phoneIdx = headers.findIndex((h) => h === 'phone' || h === 'whatsapp' || h === 'mobile' || h === 'phone number');
        const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email address');
        const companyIdx = headers.findIndex((h) => h === 'company' || h === 'organization' || h === 'org');
        const linkedinIdx = headers.findIndex((h) => h === 'linkedin' || h === 'linkedin_url' || h === 'linkedin url');
        const instagramIdx = headers.findIndex((h) => h === 'instagram' || h === 'instagram_url' || h === 'instagram url');
        const sourceIdx = headers.findIndex((h) => h === 'source');

        const parsedLeads: LeadEntry[] = [];
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          const cells = row.values || [];
          const name = nameIdx >= 0 ? String(cells[nameIdx + 1] || '').trim() : '';
          if (!name) continue;

          parsedLeads.push({
            id: crypto.randomUUID(),
            name,
            phone: phoneIdx >= 0 ? String(cells[phoneIdx + 1] || '').trim() : '',
            email: emailIdx >= 0 ? String(cells[emailIdx + 1] || '').trim() : '',
            company: companyIdx >= 0 ? String(cells[companyIdx + 1] || '').trim() : '',
            linkedin_url: linkedinIdx >= 0 ? String(cells[linkedinIdx + 1] || '').trim() : '',
            instagram_url: instagramIdx >= 0 ? String(cells[instagramIdx + 1] || '').trim() : '',
            source: sourceIdx >= 0 ? String(cells[sourceIdx + 1] || '').trim() : 'excel_import',
          });
        }

        if (parsedLeads.length > 0) {
          setLeads(parsedLeads);
          setSelectedIds(new Set());
          setActiveTab('single');
        }
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (excelInputRef.current) excelInputRef.current.value = '';
  }, []);

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

  // Import — blocked when there are validation errors
  const handleImport = useCallback(async () => {
    const validLeads = leads.filter((l) => l.name.trim());
    if (validLeads.length === 0) return;

    // Block if any validation errors remain
    if (invalidCount > 0) {
      setSelectedIds(new Set(invalidLeadIds));
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
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
        setImportResult({
          success: true,
          imported: data.data.imported,
          conversations: data.data.conversations_created,
          errors: data.data.errors || [],
          skipped: data.data.skipped || [],
          conversationIds: data.data.conversation_ids || [],
        });
        // Don't auto-close — wait for user to create broadcast or skip
      } else {
        setImportResult({
          success: false,
          imported: 0,
          conversations: 0,
          errors: [{ name: 'Import', error: data.error || 'Unknown error' }],
          skipped: [],
        });
      }
    } catch (err) {
      setImportResult({
        success: false,
        imported: 0,
        conversations: 0,
        errors: [{ name: 'Import', error: String(err) }],
        skipped: [],
      });
    } finally {
      setImporting(false);
    }
  }, [leads, selectedGroupIds, onImportComplete, onOpenChange, invalidCount, invalidLeadIds]);

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

  const validCount = leads.filter((l) => l.name.trim()).length;
  const hasValidationErrors = invalidCount > 0;
  const allInvalidSelected = invalidCount > 0 && invalidLeadIds.size === selectedIds.size &&
    [...invalidLeadIds].every((id) => selectedIds.has(id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[90vw] h-auto max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-50 text-orange-600 border border-orange-100 shadow-sm flex items-center justify-center w-10 h-10">
              <UserPlus className="h-6 w-6 stroke-[2.5px]" />
            </div>
            Import Leads
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
          <TabsList className="mx-8 mt-6 w-auto self-start">
            <TabsTrigger value="single" className="text-xs gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Add Leads
            </TabsTrigger>
            <TabsTrigger value="csv" className="text-xs gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV Upload
            </TabsTrigger>
            <TabsTrigger value="excel" className="text-xs gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel Upload
            </TabsTrigger>
          </TabsList>

          {/* ── CSV Upload Tab ─────────────────────── */}
          <TabsContent value="csv" className="px-8 py-6 flex-1">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Upload CSV file</p>
              <p className="text-xs text-muted-foreground mb-4">
                Required: <span className="font-medium">name</span>. Optional: phone, email, company, linkedin, instagram, source
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Choose CSV File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleCsvUpload}
              />
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Example CSV</p>
                <code className="text-[11px] text-muted-foreground block whitespace-pre leading-relaxed">
{`name,phone,email,company,linkedin,instagram
John Doe,+971501234567,john@example.com,Acme Inc,linkedin.com/in/john,@johndoe
Jane Smith,+971507654321,jane@corp.com,Corp Ltd,,@janesmith`}
                </code>
              </div>
            </div>
          </TabsContent>

          {/* ── Excel Upload Tab ─────────────────────── */}
          <TabsContent value="excel" className="px-8 py-6 flex-1">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Upload Excel file (.xlsx)</p>
              <p className="text-xs text-muted-foreground mb-4">
                Required: <span className="font-medium">name</span>. Optional: phone, email, company, linkedin, instagram, source
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => excelInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Choose Excel File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
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

          {/* ── Single/List Add Tab ────────────────── */}
          <TabsContent value="single" className="flex-1 flex flex-col min-h-0 px-8 py-6">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
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
                  />
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs text-primary justify-center gap-1.5 border border-dashed border-primary/30 hover:border-primary/60"
              onClick={addLead}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Lead
            </Button>
          </TabsContent>
        </Tabs>

        {/* ── Invalid Records Banner ──────────────── */}
        {hasValidationErrors && !importResult?.success && (
          <div className="mx-8 mb-4 rounded-xl bg-amber-50 border border-amber-200 overflow-hidden shadow-sm">
            {/* Top row: summary + bulk actions */}
            <div className="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-700 min-w-0">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">
                  {invalidCount} record{invalidCount !== 1 ? 's' : ''} with invalid data — fix or delete before importing
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  onClick={allInvalidSelected ? () => setSelectedIds(new Set()) : handleSelectAllInvalid}
                >
                  {allInvalidSelected ? 'Deselect All' : 'Select All Invalid'}
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs gap-1"
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
              <div className="px-3 py-2 border-t border-amber-200 bg-amber-100/60 flex items-center justify-between gap-3">
                <span className="text-xs text-amber-800">
                  <span className="font-semibold">Auto-fix phones:</span>{' '}
                  detected country code{' '}
                  <code className="bg-amber-200 rounded px-1 font-mono">{detectedCountryCode}</code>{' '}
                  from existing records — apply to {phoneErrorLeadIds.size} number{phoneErrorLeadIds.size !== 1 ? 's' : ''}?
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0 border-amber-400 text-amber-800 hover:bg-amber-200"
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
        {groups.length > 0 && !importResult?.success && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
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
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
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
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}>
            {importResult.success ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <span className="block">
                      Imported <strong>{importResult.imported}</strong> lead{importResult.imported !== 1 ? 's' : ''},{' '}
                      created <strong>{importResult.conversations}</strong> conversation{importResult.conversations !== 1 ? 's' : ''}
                    </span>
                    {importResult.skipped.length > 0 && (
                      <details className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        <summary className="cursor-pointer font-medium select-none">
                          ⚠ {importResult.skipped.length} record{importResult.skipped.length !== 1 ? 's' : ''} skipped (no phone number)
                        </summary>
                        <ul className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto">
                          {importResult.skipped.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="shrink-0 text-amber-500">·</span>
                              <span><strong>{s.name}</strong> — {s.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {importResult.errors.length > 0 && (
                      <details className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                        <summary className="cursor-pointer font-medium select-none">
                          ✕ {importResult.errors.length} record{importResult.errors.length !== 1 ? 's' : ''} failed
                        </summary>
                        <ul className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto">
                          {importResult.errors.map((e, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="shrink-0 text-red-400">·</span>
                              <span><strong>{e.name}</strong> — {e.error}</span>
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
                      className="h-8 text-xs"
                      autoFocus
                    />
                    {broadcastCreateError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
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
                              setBroadcastCreateError('Group created but ID not returned — please refresh.');
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
        <DialogActions>
          {!importResult?.success ? (
            <div className="flex items-center justify-between w-full">
              <div className="text-sm font-medium">
                {hasValidationErrors ? (
                  <span className="text-amber-600">
                    Fix {invalidCount} invalid record{invalidCount !== 1 ? 's' : ''} to continue
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {validCount} lead{validCount !== 1 ? 's' : ''} ready to import
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={importing || validCount === 0 || hasValidationErrors}
                  className="rounded-xl px-8 py-2.5 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Import {validCount} Lead{validCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="rounded-xl px-6 py-2.5 font-semibold text-gray-500 border-gray-200 hover:bg-gray-50"
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
}

function LeadRow({ lead, index, errors, isSelected, onUpdate, onRemove, onToggleSelect, canRemove }: LeadRowProps) {
  const channels = detectChannels(lead);
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      className={cn(
        'p-3 rounded-xl border bg-card transition-colors',
        hasErrors
          ? isSelected
            ? 'border-red-400 bg-red-50/60 ring-2 ring-red-200'
            : 'border-red-300 bg-red-50/30 hover:border-red-400'
          : 'border-border hover:border-primary/20'
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
                  : 'border-red-300 hover:border-red-500'
              )}
            >
              {isSelected && <Check className="h-2.5 w-2.5" />}
            </button>
          )}
          <span className={cn(
            'text-[10px] font-semibold uppercase',
            hasErrors ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {hasErrors && <TriangleAlert className="inline h-3 w-3 mr-0.5 -mt-px" />}
            Lead #{index + 1}
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
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(lead.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 1: Name + Company */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="relative">
          <Input
            placeholder="Full name *"
            value={lead.name}
            onChange={(e) => onUpdate(lead.id, 'name', e.target.value)}
            className="h-8 text-sm pl-3"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Company"
            value={lead.company}
            onChange={(e) => onUpdate(lead.id, 'company', e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
      </div>

      {/* Row 2: Phone + Email */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="space-y-1">
          <div className="relative">
            <Phone className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
              errors.phone ? 'text-red-400' : 'text-green-500'
            )} />
            <Input
              placeholder="+971501234567"
              value={lead.phone}
              onChange={(e) => onUpdate(lead.id, 'phone', e.target.value)}
              className={cn(
                'h-8 text-sm pl-8',
                errors.phone && 'border-red-400 focus-visible:ring-red-300'
              )}
            />
          </div>
          {errors.phone && (
            <p className="text-[10px] text-red-500 leading-tight pl-1">{errors.phone}</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="relative">
            <Mail className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
              errors.email ? 'text-red-400' : 'text-orange-400'
            )} />
            <Input
              placeholder="Email"
              value={lead.email}
              onChange={(e) => onUpdate(lead.id, 'email', e.target.value)}
              className={cn(
                'h-8 text-sm pl-8',
                errors.email && 'border-red-400 focus-visible:ring-red-300'
              )}
            />
          </div>
          {errors.email && (
            <p className="text-[10px] text-red-500 leading-tight pl-1">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Row 3: LinkedIn + Instagram */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="relative">
            <Linkedin className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
              errors.linkedin_url ? 'text-red-400' : 'text-blue-600'
            )} />
            <Input
              placeholder="linkedin.com/in/..."
              value={lead.linkedin_url}
              onChange={(e) => onUpdate(lead.id, 'linkedin_url', e.target.value)}
              className={cn(
                'h-8 text-sm pl-8',
                errors.linkedin_url && 'border-red-400 focus-visible:ring-red-300'
              )}
            />
          </div>
          {errors.linkedin_url && (
            <p className="text-[10px] text-red-500 leading-tight pl-1">{errors.linkedin_url}</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="relative">
            <Instagram className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
              errors.instagram_url ? 'text-red-400' : 'text-pink-500'
            )} />
            <Input
              placeholder="@handle or instagram.com/..."
              value={lead.instagram_url}
              onChange={(e) => onUpdate(lead.id, 'instagram_url', e.target.value)}
              className={cn(
                'h-8 text-sm pl-8',
                errors.instagram_url && 'border-red-400 focus-visible:ring-red-300'
              )}
            />
          </div>
          {errors.instagram_url && (
            <p className="text-[10px] text-red-500 leading-tight pl-1">{errors.instagram_url}</p>
          )}
        </div>
      </div>
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
