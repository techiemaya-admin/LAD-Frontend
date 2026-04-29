import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Send, Loader2, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { CreateWabaTemplateModal } from './CreateWabaTemplateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
    // Auto-fill known contact fields with sentinels so the backend can personalize per-contact
    const params = template.parameters || [];
    const defaults = params.map((p) => {
      const key = p.toLowerCase();
      if (CONTACT_NAME_FIELDS.includes(key)) return '{member_name}';
      if (CONTACT_COMPANY_FIELDS.includes(key)) return '{member_company}';
      return '';
    });
    // For positional templates ({{1}}, {{2}}, …): default first param to name,
    // leave the rest as empty so user picks from the dropdown.
    if (defaults.length > 0 && defaults[0] === '' && !isNaN(Number(params[0]))) {
      defaults[0] = '{member_name}';
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
    onSend(
      selectedTemplate.name,
      selectedTemplate.language,
      paramValues.length > 0 ? paramValues : [],
      nameFormat,
      { batchSize, delayMin, delayRandom, dailyLimit },
      selectedTemplate.header_param_count ?? 0,
      selectedTemplate.header_type ?? '',
      headerMediaUrl,
    );
  }, [selectedTemplate, paramValues, nameFormat, batchSize, delayMin, delayRandom, onSend, headerMediaUrl]);

  // Whether any parameter is a name-type field (controls name format picker visibility)
  const hasNameParam = useMemo(() => {
    return (selectedTemplate?.parameters || []).some(p =>
      CONTACT_NAME_FIELDS.includes(p.toLowerCase())
    ) || paramValues.some(v => v === '{member_name}');
  }, [selectedTemplate, paramValues]);

  // Preview body with params filled in (lenient: handles {{name}}, {name}}, {name} etc.)
  const previewBody = useMemo(() => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;
    const params = selectedTemplate.parameters || [];
    paramValues.forEach((val, i) => {
      const placeholder = params[i] || String(i + 1);
      const sampleName = nameFormat === 'first' ? 'Naveen' : 'Naveen Reddy';
      const displayVal = val === '{member_name}' ? sampleName
        : val === '{member_company}' ? '[Company]'
        : (val || `{{${placeholder}}}`);
      // Lenient regex: match {+placeholder}+
      const re = new RegExp(`\\{+${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}+`, 'gi');
      body = body.replace(re, displayVal);
    });
    return body;
  }, [selectedTemplate, paramValues, nameFormat]);

  const canSend = selectedTemplate && (
    selectedTemplate.parameter_count === 0 ||
    paramValues.every((v) => v.trim().length > 0 && v !== '__custom__')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl sm:w-[90vw] sm:h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Send Template Message
            <Badge variant="secondary" className="text-xs">
              {selectedCount} conversation{selectedCount !== 1 ? 's' : ''}
            </Badge>
            {channel === 'waba' && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-6 text-[10px] px-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> New template
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <CreateWabaTemplateModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={() => {
            setShowCreateModal(false);
            setRefreshKey(k => k + 1);
          }}
        />

        {!selectedTemplate ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Template list */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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
                      className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{template.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 h-4',
                            categoryColors[template.category] || 'bg-gray-50 text-gray-600 border-gray-200'
                          )}
                        >
                          {template.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                          {template.language}
                        </Badge>
                        {template.quality_pending && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 bg-amber-50 text-amber-700 border-amber-200">
                            ⏳ Quality Pending
                          </Badge>
                        )}
                        {!template.quality_pending && template.quality_score && template.quality_score !== 'UNKNOWN' && (
                          <Badge variant="outline" className={cn(
                            'text-[10px] px-1.5 h-4',
                            template.quality_score === 'HIGH'   ? 'bg-green-50 text-green-700 border-green-200' :
                            template.quality_score === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          )}>
                            {template.quality_score}
                          </Badge>
                        )}
                        {template.parameter_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                            {template.parameter_count} param{template.parameter_count > 1 ? 's' : ''}
                          </Badge>
                        )}
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
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-4 pb-4">
              {/* Back button + template info */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <ChevronDown className="h-3 w-3 mr-1 rotate-90" />
                  Back
                </Button>
                <span className="text-sm font-medium">{selectedTemplate.name}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 h-4',
                    categoryColors[selectedTemplate.category] || ''
                  )}
                >
                  {selectedTemplate.category}
                </Badge>
              </div>

              {/* Parameter inputs */}
              {selectedTemplate.parameter_count > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Fill in template parameters:
                  </p>
                  {(selectedTemplate.parameters || []).map((paramName, i) => {
                    const currentVal  = paramValues[i] || '';
                    const isCustom    = !FIELD_OPTIONS.some(o => o.value !== '__custom__' && o.value === currentVal);
                    const selectedOpt = FIELD_OPTIONS.find(o => o.value === currentVal) ?? FIELD_OPTIONS[FIELD_OPTIONS.length - 1];
                    const label       = isNaN(Number(paramName)) ? `{{${paramName}}}` : `Parameter {{${paramName}}}`;
                    const ctx         = getParamContext(selectedTemplate.body, paramName);
                    return (
                      <div key={i} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-mono">{label}</p>
                        {ctx && (
                          <p className="text-[10px] text-muted-foreground font-mono bg-muted/40 rounded px-2 py-1 truncate">
                            {ctx}
                          </p>
                        )}
                        {/* Field picker dropdown */}
                        <select
                          value={FIELD_OPTIONS.find(o => o.value === currentVal) ? currentVal : '__custom__'}
                          onChange={e => {
                            const v = e.target.value;
                            handleParamChange(i, v === '__custom__' ? '' : v);
                          }}
                          className="w-full h-8 px-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {FIELD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
                          ))}
                        </select>
                        {/* Custom text input — shown only when Custom is selected */}
                        {(isCustom || currentVal === '__custom__' || currentVal === '') && (
                          <Input
                            placeholder={`Fixed value sent to everyone (e.g. "12")`}
                            value={FIELD_OPTIONS.some(o => o.value !== '__custom__' && o.value === currentVal) ? '' : currentVal}
                            onChange={e => handleParamChange(i, e.target.value)}
                            className="h-8 text-sm"
                          />
                        )}
                        {/* Hint for auto-resolved fields */}
                        {selectedOpt && selectedOpt.value !== '__custom__' && currentVal !== '' && currentVal !== '__custom__' && (
                          <p className="text-[10px] text-green-600">
                            ✓ Replaced automatically per contact — {selectedOpt.hint}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Media header — shown for image/document/video header templates */}
              {['image', 'document', 'video'].includes(selectedTemplate.header_type) && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground capitalize">
                    Header {selectedTemplate.header_type}
                  </p>
                  {resolvingMedia ? (
                    <div className="flex items-center gap-2 h-8 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Fetching image from Meta…
                    </div>
                  ) : (
                    <>
                      {selectedTemplate.header_type === 'image' && headerMediaUrl && (
                        <img
                          src={headerMediaUrl}
                          alt="Template header"
                          className="w-full max-h-32 object-cover rounded-md border border-border mb-1"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={headerMediaUrl}
                        onChange={e => setHeaderMediaUrl(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {headerMediaUrl
                          ? `✓ ${selectedTemplate.header_type} attached — edit URL to change`
                          : `Paste a public URL for the ${selectedTemplate.header_type} to attach`}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Name Format picker — only shown when template has a name variable */}
              {hasNameParam && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Name format for contacts:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNameFormat('first')}
                      className={cn(
                        'flex-1 h-8 rounded-md border text-xs font-medium transition-colors',
                        nameFormat === 'first'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      First name only
                      <span className="block text-[10px] font-normal opacity-70">e.g. &quot;Naveen&quot;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameFormat('full')}
                      className={cn(
                        'flex-1 h-8 rounded-md border text-xs font-medium transition-colors',
                        nameFormat === 'full'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      Full name
                      <span className="block text-[10px] font-normal opacity-70">e.g. &quot;Naveen Reddy&quot;</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Preview</p>
                <p className="text-sm whitespace-pre-wrap">{previewBody}</p>
              </div>
            </div>

              {/* Batch & Delay settings — always shown for bulk/group sends */}
              {(isBulkSend || selectedCount > 1) && (
                <div className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800">
                    Sending schedule {selectedCount > 0 ? `(${selectedCount} contacts)` : ''}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-700 font-medium">Batch size</label>
                      <Input
                        type="number"
                        min={1} max={10}
                        value={batchSize}
                        onChange={e => setBatchSize(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        onFocus={e => e.target.select()}
                        className="h-7 text-xs text-center"
                      />
                      <p className="text-[9px] text-amber-600 text-center">msgs / batch (max 10)</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-700 font-medium">Min delay</label>
                      <Input
                        type="number"
                        min={120} max={3600}
                        value={delayMin}
                        onChange={e => setDelayMin(Math.max(120, parseInt(e.target.value) || 120))}
                        onFocus={e => e.target.select()}
                        className="h-7 text-xs text-center"
                      />
                      <p className="text-[9px] text-amber-600 text-center">seconds (min 120)</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-700 font-medium">+Random</label>
                      <Input
                        type="number"
                        min={0} max={300}
                        value={delayRandom}
                        onChange={e => setDelayRandom(Math.max(0, parseInt(e.target.value) || 0))}
                        onFocus={e => e.target.select()}
                        className="h-7 text-xs text-center"
                      />
                      <p className="text-[9px] text-amber-600 text-center">0–N secs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-[10px] text-amber-700 font-medium whitespace-nowrap">Daily cap</label>
                      <Input
                        type="number"
                        min={1} max={250}
                        value={dailyLimit}
                        onChange={e => setDailyLimit(Math.min(250, Math.max(1, parseInt(e.target.value) || 1)))}
                        onFocus={e => e.target.select()}
                        className="h-7 text-xs text-center w-24"
                      />
                      <p className="text-[9px] text-amber-600">msgs / day (max 250)</p>
                    </div>
                    {selectedCount > 0 && dailyLimit < selectedCount && (
                      <p className="text-[9px] text-amber-700 font-medium">
                        Will send {dailyLimit} today, {selectedCount - dailyLimit} queued for next day
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-700">
                    ≈ {batchSize} messages, then wait {delayMin}s + random 0–{delayRandom}s before next batch
                  </p>
                </div>
              )}

              </div>

            <DialogFooter className="px-6 py-4 border-t border-border bg-gray-50/50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sending}
                className="px-6 border-gray-300 text-gray-700 h-11 font-medium"
              >
                {sending ? 'Keep running' : 'Cancel'}
              </Button>
              {/* Show "Run in Background" button while sending */}
              {sending && sendProgress?.running && (
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Run in background
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!canSend || sending}
                className="bg-[#0B1957] hover:bg-[#0B1957]/90 text-white px-8 h-11 font-bold shadow-md rounded-lg transition-all"
              >
                {sending && sendProgress?.running ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending {sendProgress?.sent ?? 0}/{sendProgress?.total ?? 0}...
                  </>
                ) : sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedCount} conversation{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
