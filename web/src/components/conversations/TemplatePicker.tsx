import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Send, Loader2, AlertCircle, ChevronDown, Plus, MessageSquare } from 'lucide-react';
import { CreateWabaTemplateModal } from './CreateWabaTemplateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogActions,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// Contact-field names that are auto-filled from the conversation's contact record
const CONTACT_NAME_FIELDS = ['name', 'first_name', 'contact_name', 'customer_name', 'member_name', 'client_name'];
const CONTACT_COMPANY_FIELDS = ['company', 'company_name', 'organization', 'business'];

interface FieldOption { label: string; value: string; hint: string; }
const FIELD_OPTIONS: FieldOption[] = [
  { label: 'Contact name (full)',  value: '{member_name}',       hint: 'e.g. Naveen Reddy'         },
  { label: 'Contact first name',  value: '{member_first_name}', hint: 'e.g. Naveen'               },
  { label: 'Company',             value: '{member_company}',    hint: 'e.g. Acme Corp'            },
  { label: 'Phone number',        value: '{member_phone}',      hint: 'e.g. +971501234567'        },
  { label: 'Email address',       value: '{member_email}',      hint: 'e.g. naveen@example.com'   },
  { label: 'Custom value…',       value: '__custom__',          hint: 'Same text sent to everyone' },
];

interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  quality_score: string;
  quality_pending: boolean;
  category: string;
  body: string;
  parameter_count: number;
  parameters: string[]; // e.g. ['name', '1', 'company']
  header_type: string;        // "text" | "image" | "document" | "video" | ""
  header_param_count: number; // how many leading parameters belong to the header component
  header_url: string;         // media handle for image/document/video header templates
}

type NameFormat = 'first' | 'full';

interface BatchOptions {
  batchSize: number;      // how many messages per batch
  delayMin: number;       // minimum delay between batches (seconds)
  delayRandom: number;    // additional random 0–N seconds added to delay
  dailyLimit: number;     // maximum messages to send in a single day
}

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSend: (templateName: string, languageCode: string, parameters: string[], nameFormat: NameFormat, batch: BatchOptions, headerParamCount: number, headerType: string, headerUrl: string) => void;
  sending?: boolean;
  /** Track progress: { sent: number; total: number; running: boolean } */
  sendProgress?: { sent: number; total: number; running: boolean } | null;
  /** Which backend channel to fetch templates from. Defaults to 'waba'. */
  channel?: 'personal' | 'waba';
  /** Force batch settings to always be shown (e.g. group sends where count may be 0). */
  isBulkSend?: boolean;
}

const TEMPLATES_API = '/api/whatsapp-conversations/conversations/templates';

/** Return up to ~60 chars of body text surrounding {{paramName}}, e.g. "…report for {{2}} is ready…" */
function getParamContext(body: string, paramName: string): string {
  const tag = `{{${paramName}}}`;
  const idx = body.indexOf(tag);
  if (idx === -1) return '';
  const CTX = 40;
  const before = body.slice(Math.max(0, idx - CTX), idx).replace(/\s+/g, ' ').trimStart();
  const after  = body.slice(idx + tag.length, idx + tag.length + CTX).replace(/\s+/g, ' ').trimEnd();
  const prefix = idx > CTX ? '…' : '';
  const suffix = idx + tag.length + CTX < body.length ? '…' : '';
  return `${prefix}${before}[{{${paramName}}}]${after}${suffix}`;
}

const categoryColors: Record<string, string> = {
  MARKETING: 'bg-purple-50 text-purple-700 border-purple-200',
  UTILITY: 'bg-blue-50 text-blue-700 border-blue-200',
  AUTHENTICATION: 'bg-orange-50 text-orange-700 border-orange-200',
};

export function TemplatePicker({
  open,
  onOpenChange,
  selectedCount,
  onSend,
  sending = false,
  sendProgress = null,
  channel = 'waba',
  isBulkSend = false,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [resolvingMedia, setResolvingMedia] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [nameFormat, setNameFormat] = useState<NameFormat>('first');
  const [batchSize, setBatchSize] = useState(5);
  const [delayMin, setDelayMin] = useState(120);      // seconds — min 120 enforced
  const [delayRandom, setDelayRandom] = useState(30); // extra random seconds
  const [dailyLimit, setDailyLimit] = useState(250);  // max messages to send per day

  // Fetch templates when dialog opens (re-fetch if channel changes)
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedTemplate(null);
    setParamValues([]);
    setSearch('');
    const apiUrl = `${TEMPLATES_API}?channel=${channel}`;
    fetchWithTenant(apiUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          // Support both WABA format (data.data) and personal WA format (data.templates)
          const raw: any[] = data.data || data.templates || [];
          // Normalize to WhatsAppTemplate shape regardless of source
          const normalized: WhatsAppTemplate[] = raw
            .filter((t: any) => t.status !== 'REJECTED' && t.status !== 'DELETED')
            .map((t: any) => {
              const body = t.body || t.content || '';
              // Extract all {{placeholder}} names from body (works for both {{1}} and {{name}})
              const bodyParams = [...new Set(
                (body.match(/\{\{([^}]+)\}\}/g) || []).map((p: string) => p.replace(/^\{\{|\}\}$/g, '').trim())
              )] as string[];
              const params: string[] = t.parameters || bodyParams;
              return {
                name: t.name || '',
                language: t.language || t.language_code || t.metadata?.language_code || 'en',
                status: t.status || (t.is_active === false ? 'INACTIVE' : 'APPROVED'),
                quality_score: t.quality_score || '',
                quality_pending: t.quality_pending ?? false,
                category: t.category || t.metadata?.channel_type || 'MESSAGE',
                body,
                parameter_count: params.length || t.parameter_count || 0,
                parameters: params,
                header_type: t.header_type || '',
                header_param_count: t.header_param_count || 0,
                header_url: t.header_url || '',
              };
            });
          setTemplates(normalized);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, channel, refreshKey]);

  const filtered = useMemo(() => {
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const handleSelectTemplate = useCallback(async (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    // Auto-fill known contact fields with sentinels so the backend can personalize per-contact.
    // Priority: exact FIELD_OPTIONS match → CONTACT_NAME_FIELDS → CONTACT_COMPANY_FIELDS
    const params = template.parameters || [];
    const defaults = params.map((p) => {
      const key = p.toLowerCase();
      // Exact match against a FIELD_OPTIONS sentinel — e.g. param "member_first_name" → '{member_first_name}'
      const exactMatch = FIELD_OPTIONS.find(
        o => o.value !== '__custom__' && o.value.toLowerCase() === `{${key}}`
      );
      if (exactMatch) return exactMatch.value;
      // Legacy CONTACT_NAME_FIELDS match → full name sentinel
      if (CONTACT_NAME_FIELDS.includes(key)) return '{member_name}';
      // Company field
      if (CONTACT_COMPANY_FIELDS.includes(key)) return '{member_company}';
      // Params containing "name" or "first" → first-name sentinel
      if (key.includes('first') || (key.includes('name') && !key.includes('company'))) return '{member_first_name}';
      // Params containing "phone" or "mobile"
      if (key.includes('phone') || key.includes('mobile')) return '{member_phone}';
      // Params containing "email"
      if (key.includes('email')) return '{member_email}';
      // Params containing "company"
      if (key.includes('company') || key.includes('business')) return '{member_company}';
      return '';
    });
    // For positional templates ({{1}}, {{2}}, …): default first param to first-name,
    // leave the rest as empty so user picks from the dropdown.
    if (defaults.length > 0 && defaults[0] === '' && !isNaN(Number(params[0]))) {
      defaults[0] = '{member_first_name}';
    }
    setParamValues(defaults);

    // Resolve header media URL from Meta when template has an image/video/document header
    const isMediaHeader = ['image', 'document', 'video'].includes(template.header_type);
    if (!isMediaHeader) {
      setHeaderMediaUrl('');
      return;
    }
    if (template.header_url?.startsWith('https://')) {
      setHeaderMediaUrl(template.header_url);
      return;
    }
    if (template.header_url) {
      // handle is not a URL — ask the backend to resolve it via Meta Graph API
      setHeaderMediaUrl('');
      setResolvingMedia(true);
      try {
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/templates/resolve-media?handle=${encodeURIComponent(template.header_url)}`
        );
        const data = await res.json();
        if (data.url) setHeaderMediaUrl(data.url);
      } catch { /* silent — user can paste manually */ }
      finally { setResolvingMedia(false); }
    } else {
      setHeaderMediaUrl('');
    }
  }, []);

  const handleParamChange = useCallback((index: number, value: string) => {
    setParamValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!selectedTemplate) return;
    // WABA handles rate-limiting server-side — pass zeroes so the backend sends
    // without artificial throttling. Personal WA uses the user-configured schedule
    // to avoid account restrictions from rapid bulk sends.
    const scheduleParams = channel === 'personal'
      ? { batchSize, delayMin, delayRandom, dailyLimit }
      : { batchSize: 0, delayMin: 0, delayRandom: 0, dailyLimit: 0 };
    onSend(
      selectedTemplate.name,
      selectedTemplate.language,
      paramValues.length > 0 ? paramValues : [],
      nameFormat,
      scheduleParams,
      selectedTemplate.header_param_count ?? 0,
      selectedTemplate.header_type ?? '',
      headerMediaUrl,
    );
  }, [selectedTemplate, paramValues, nameFormat, channel, batchSize, delayMin, delayRandom, dailyLimit, onSend, headerMediaUrl]);

  // Whether any parameter is a name-type field (controls name format picker visibility)
  const hasNameParam = useMemo(() => {
    return (selectedTemplate?.parameters || []).some(p =>
      CONTACT_NAME_FIELDS.includes(p.toLowerCase())
    ) || paramValues.some(v => v === '{member_name}' || v === '{member_first_name}');
  }, [selectedTemplate, paramValues]);

  // Preview body with params filled in (lenient: handles {{name}}, {name}}, {name} etc.)
  const previewBody = useMemo(() => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;
    const params = selectedTemplate.parameters || [];
    const sampleFirst = 'Naveen';
    const sampleFull  = 'Naveen Reddy';
    // Sentinel → sample text mapping for all FIELD_OPTIONS
    const sentinelSamples: Record<string, string> = {
      '{member_name}':       nameFormat === 'first' ? sampleFirst : sampleFull,
      '{member_first_name}': sampleFirst,
      '{member_phone}':      '+971501234567',
      '{member_email}':      'naveen@example.com',
      '{member_company}':    '[Company]',
    };
    paramValues.forEach((val, i) => {
      const placeholder = params[i] || String(i + 1);
      const displayVal = sentinelSamples[val] ?? (val || `{{${placeholder}}}`);
      // Lenient regex: match {+placeholder}+
      const re = new RegExp(`\\{+${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}+`, 'gi');
      body = body.replace(re, displayVal);
    });
    return body;
  }, [selectedTemplate, paramValues, nameFormat]);

  const canSend = selectedTemplate && (
    selectedTemplate.parameter_count === 0 ||
    paramValues.every((v) => v.trim().length > 0 && v !== '__custom__' && v !== '')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[90vw] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-orange-600" />
              Send Template Message
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-100 px-3">
                {selectedCount} conversation{selectedCount !== 1 ? 's' : ''}
              </Badge>
            </DialogTitle>
            
            {channel === 'waba' && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs px-3 rounded-lg border-orange-200 text-orange-700 hover:bg-orange-50 transition-all"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New template
              </Button>
            )}
          </div>
        </DialogHeader>

        <CreateWabaTemplateModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={() => {
            setShowCreateModal(false);
            setRefreshKey(k => k + 1);
          }}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!selectedTemplate ? (
            <>
              {/* Search */}
              <div className="px-8 pt-6 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11 rounded-xl bg-gray-50 border-gray-100"
                  />
                </div>
              </div>

              {/* Template list */}
              <div className="flex-1 min-h-0 overflow-y-auto px-8 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">
                      {templates.length === 0
                        ? 'No approved templates found'
                        : 'No templates match your search'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((template) => (
                      <div
                        key={`${template.name}-${template.language}`}
                        className="p-3 rounded-xl hover:bg-orange-50/50 cursor-pointer transition-all border border-transparent hover:border-orange-100 group"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{template.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 h-4 font-bold',
                              categoryColors[template.category] || 'bg-gray-50 text-gray-600 border-gray-200'
                            )}
                          >
                            {template.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-medium">
                            {template.language}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.body || 'No body text'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6">
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Back button + template info */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 hover:bg-white shadow-sm"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{selectedTemplate.name}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{selectedTemplate.category}</span>
                  </div>
                </div>

                {/* Parameter inputs */}
                {selectedTemplate.parameter_count > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Template Parameters</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {(selectedTemplate.parameters || []).map((paramName, i) => {
                        const currentVal  = paramValues[i] || '';
                        const isCustom    = !FIELD_OPTIONS.some(o => o.value !== '__custom__' && o.value === currentVal);
                        const selectedOpt = FIELD_OPTIONS.find(o => o.value === currentVal) ?? FIELD_OPTIONS[FIELD_OPTIONS.length - 1];
                        const label       = isNaN(Number(paramName)) ? `{{${paramName}}}` : `Parameter {{${paramName}}}`;
                        const ctx         = getParamContext(selectedTemplate.body, paramName);
                        return (
                          <div key={i} className="space-y-2 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-700 font-mono">{label}</span>
                              {ctx && <span className="text-[10px] text-muted-foreground font-mono italic opacity-60">{ctx}</span>}
                            </div>
                            
                            <Select
                              value={FIELD_OPTIONS.find(o => o.value === currentVal) ? currentVal : '__custom__'}
                              onValueChange={v => handleParamChange(i, v === '__custom__' ? '' : v)}
                            >
                              <SelectTrigger className="h-10 rounded-lg border-gray-100 bg-gray-50/50">
                                <SelectValue placeholder="Select data field..." />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_OPTIONS.map(o => (
                                  <SelectItem key={o.value} value={o.value}>
                                    <div className="flex flex-col">
                                      <span className="font-bold">{o.label}</span>
                                      <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {(isCustom || currentVal === '__custom__' || currentVal === '') && (
                              <Input
                                placeholder={`Enter fixed value...`}
                                value={FIELD_OPTIONS.some(o => o.value !== '__custom__' && o.value === currentVal) ? '' : currentVal}
                                onChange={e => handleParamChange(i, e.target.value)}
                                className="h-10 rounded-lg"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Media header */}
                {['image', 'document', 'video'].includes(selectedTemplate.header_type) && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header {selectedTemplate.header_type}</h4>
                    <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-3">
                      {resolvingMedia ? (
                        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                          Resolving media from Meta...
                        </div>
                      ) : (
                        <>
                          {selectedTemplate.header_type === 'image' && headerMediaUrl && (
                            <div className="relative group">
                              <img
                                src={headerMediaUrl}
                                alt="Header preview"
                                className="w-full h-40 object-cover rounded-lg border border-gray-100 shadow-inner"
                              />
                            </div>
                          )}
                          <Input
                            placeholder="Enter public URL for media..."
                            value={headerMediaUrl}
                            onChange={e => setHeaderMediaUrl(e.target.value)}
                            className="h-10 rounded-lg"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Name Format */}
                {hasNameParam && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Name Personalization</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setNameFormat('first')}
                        className={cn(
                          "p-3 rounded-xl border transition-all text-left group",
                          nameFormat === 'first' ? "border-orange-500 bg-orange-50/50 ring-1 ring-orange-200" : "border-gray-100 hover:border-orange-200"
                        )}
                      >
                        <span className={cn("block text-sm font-bold", nameFormat === 'first' ? "text-orange-700" : "text-gray-900")}>First Name</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">e.g. Naveen</span>
                      </button>
                      <button
                        onClick={() => setNameFormat('full')}
                        className={cn(
                          "p-3 rounded-xl border transition-all text-left group",
                          nameFormat === 'full' ? "border-orange-500 bg-orange-50/50 ring-1 ring-orange-200" : "border-gray-100 hover:border-orange-200"
                        )}
                      >
                        <span className={cn("block text-sm font-bold", nameFormat === 'full' ? "text-orange-700" : "text-gray-900")}>Full Name</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">e.g. Naveen Reddy</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message Preview</h4>
                  <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400" />
                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-medium">
                      {previewBody}
                    </p>
                  </div>
                </div>

                {/* Batch Settings */}
                {channel === 'personal' && (isBulkSend || selectedCount > 1) && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery Schedule</h4>
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Batch Size</label>
                          <Input
                            type="number"
                            value={batchSize}
                            onChange={e => setBatchSize(parseInt(e.target.value))}
                            className="h-10 rounded-lg border-amber-200 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Delay (s)</label>
                          <Input
                            type="number"
                            value={delayMin}
                            onChange={e => setDelayMin(parseInt(e.target.value))}
                            className="h-10 rounded-lg border-amber-200 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Daily Cap</label>
                          <Input
                            type="number"
                            value={dailyLimit}
                            onChange={e => setDailyLimit(parseInt(e.target.value))}
                            className="h-10 rounded-lg border-amber-200 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogActions>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm font-medium text-muted-foreground">
              {selectedTemplate ? (
                <span>Ready to send to {selectedCount}</span>
              ) : (
                <span>Select a template to continue</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSend}
                disabled={!canSend || sending}
                className="rounded-xl px-8 py-2.5 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to {selectedCount}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
