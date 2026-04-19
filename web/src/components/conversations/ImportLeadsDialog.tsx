import { useState, useCallback, useEffect, useRef } from 'react';
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

// ── Component ────────────────────────────────────────────────────

export function ImportLeadsDialog({ open, onOpenChange, onImportComplete }: ImportLeadsDialogProps) {
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
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [broadcastName, setBroadcastName] = useState('');
  const [showBroadcastPrompt, setShowBroadcastPrompt] = useState(false);

  // Load chat groups when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch(`${API_BASE}/chat-groups`, {
      headers: {
        'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setGroups(data.data || []);
      })
      .catch(() => {});
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setLeads([newLead()]);
      setSelectedGroupIds(new Set());
      setImportResult(null);
      setActiveTab('single');
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
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

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

  // Import
  const handleImport = useCallback(async () => {
    const validLeads = leads.filter((l) => l.name.trim());
    if (validLeads.length === 0) return;

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch(`${API_BASE}/leads/import`, {
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
          conversationIds: data.data.conversation_ids || [], // Store IDs for broadcast creation
        });
        // Don't auto-close — wait for user to create broadcast or skip
      } else {
        setImportResult({
          success: false,
          imported: 0,
          conversations: 0,
          errors: [{ name: 'Import', error: data.error || 'Unknown error' }],
        });
      }
    } catch (err) {
      setImportResult({
        success: false,
        imported: 0,
        conversations: 0,
        errors: [{ name: 'Import', error: String(err) }],
      });
    } finally {
      setImporting(false);
    }
  }, [leads, selectedGroupIds, onImportComplete, onOpenChange]);

  const validCount = leads.filter((l) => l.name.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-5 w-5" />
            Import Leads
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 w-auto self-start">
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
          <TabsContent value="csv" className="px-4 py-3 flex-1">
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
          <TabsContent value="excel" className="px-4 py-3 flex-1">
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
          <TabsContent value="single" className="flex-1 flex flex-col overflow-hidden px-4 py-2">
            <ScrollArea className="flex-1 max-h-[40vh] pr-2">
              <div className="space-y-3">
                {leads.map((lead, idx) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    index={idx}
                    onUpdate={updateLead}
                    onRemove={removeLead}
                    canRemove={leads.length > 1}
                  />
                ))}
              </div>
            </ScrollArea>

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

        {/* ── Broadcast Assignment ──────────────── */}
        {groups.length > 0 && (
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
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>
                    Imported {importResult.imported} lead{importResult.imported !== 1 ? 's' : ''}, created{' '}
                    {importResult.conversations} conversation{importResult.conversations !== 1 ? 's' : ''}
                  </span>
                </div>
                {!showBroadcastPrompt && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs font-medium mb-2">Create a broadcast group for these leads?</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setShowBroadcastPrompt(true)}
                    >
                      Create Broadcast Group
                    </Button>
                  </div>
                )}
                {showBroadcastPrompt && (
                  <div className="mt-2 pt-2 border-t border-green-200 space-y-2">
                    <Input
                      placeholder="Enter broadcast name..."
                      value={broadcastName}
                      onChange={(e) => setBroadcastName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        onClick={() => {
                          setShowBroadcastPrompt(false);
                          setBroadcastName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs flex-1"
                        onClick={async () => {
                          if (!broadcastName.trim()) return;
                          try {
                            const conversationIds = importResult?.conversationIds || [];
                            const res = await fetch(`${API_BASE}/chat-groups`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`,
                              },
                              body: JSON.stringify({
                                name: broadcastName.trim(),
                                conversation_ids: conversationIds,
                              }),
                            });
                            if (res.ok) {
                              setShowBroadcastPrompt(false);
                              setBroadcastName('');
                              onOpenChange(false);
                              onImportComplete();
                            }
                          } catch (err) {
                            console.error('Failed to create broadcast:', err);
                          }
                        }}
                      >
                        Create
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
        {!importResult?.success ? (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {validCount} lead{validCount !== 1 ? 's' : ''} ready to import
              {selectedGroupIds.size > 0 && (
                <span className="ml-1">
                  into {selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="gap-1.5"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Import {validCount} Lead{validCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-border flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onImportComplete();
              }}
            >
              {showBroadcastPrompt ? 'Cancel' : 'Skip & Close'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Lead Row Component ───────────────────────────────────────────

interface LeadRowProps {
  lead: LeadEntry;
  index: number;
  onUpdate: (id: string, field: keyof LeadEntry, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function LeadRow({ lead, index, onUpdate, onRemove, canRemove }: LeadRowProps) {
  const channels = detectChannels(lead);

  return (
    <div className="p-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
          Lead #{index + 1}
        </span>
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
        <div className="relative">
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
          <Input
            placeholder="WhatsApp number"
            value={lead.phone}
            onChange={(e) => onUpdate(lead.id, 'phone', e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" />
          <Input
            placeholder="Email"
            value={lead.email}
            onChange={(e) => onUpdate(lead.id, 'email', e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
      </div>

      {/* Row 3: LinkedIn + Instagram */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Linkedin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-600" />
          <Input
            placeholder="LinkedIn URL"
            value={lead.linkedin_url}
            onChange={(e) => onUpdate(lead.id, 'linkedin_url', e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
        <div className="relative">
          <Instagram className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-500" />
          <Input
            placeholder="Instagram handle"
            value={lead.instagram_url}
            onChange={(e) => onUpdate(lead.id, 'instagram_url', e.target.value)}
            className="h-8 text-sm pl-8"
          />
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
