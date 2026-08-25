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
import { fetchJson } from '@/lib/fetch-json';

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
  delayRandom: number;    // additional random 0-N seconds added to delay
  dailyLimit: number;     // maximum messages to send in a single day
}

export interface TemplatePickerProps {
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
  /** Visual theme variant: 'default' or 'whatsapp' (neutral zinc + emerald green) */
  variant?: 'default' | 'whatsapp';
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

const defaultCategoryColors: Record<string, string> = {
  MARKETING: 'bg-purple-50 text-purple-700 border-purple-200',
  UTILITY: 'bg-blue-50 text-blue-700 border-blue-200',
  AUTHENTICATION: 'bg-orange-50 text-orange-700 border-orange-200',
};

const waCategoryColors: Record<string, string> = {
  MARKETING: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  UTILITY: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  AUTHENTICATION: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
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
  variant = 'default',
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  /** Set when the template LOAD failed — distinct from "you have no templates". */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [resolvingMedia, setResolvingMedia] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [nameFormat, setNameFormat] = useState<NameFormat>('first');
  const [batchSize, setBatchSize] = useState(5);
  const [delayMin, setDelayMin] = useState(120);      // seconds - min 120 enforced
  const [delayRandom, setDelayRandom] = useState(30); // extra random seconds
  const [dailyLimit, setDailyLimit] = useState(250);  // max messages to send per day

  const isWA = variant === 'whatsapp';
  const categoryColors = isWA ? waCategoryColors : defaultCategoryColors;

  // Fetch templates when dialog opens (re-fetch if channel changes)
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedTemplate(null);
    setParamValues([]);
    setSearch('');
    const apiUrl = `${TEMPLATES_API}?channel=${channel}`;
    setLoadError(null);
    // `raw: true` because this route replies in two shapes — WABA sends
    // `data`, personal WA sends `templates` — so we need the whole envelope.
    fetchJson<{ data?: unknown[]; templates?: unknown[] }>(apiUrl, { raw: true })
      .then((data) => {
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
      })
      // Was `.catch(() => {})`. A failed load left `templates` empty, which the
      // list below renders as "No approved templates found" — telling the user
      // their account has no templates when we simply could not fetch them.
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Could not load templates');
      })
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
      // Exact match against a FIELD_OPTIONS sentinel - e.g. param "member_first_name" → '{member_first_name}'
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
      // handle is not a URL - ask the backend to resolve it via Meta Graph API
      setHeaderMediaUrl('');
      setResolvingMedia(true);
      try {
        const res = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/templates/resolve-media?handle=${encodeURIComponent(template.header_url)}`
        );
        const data = await res.json();
        if (data.url) setHeaderMediaUrl(data.url);
      } catch { /* silent - user can paste manually */ }
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
    // WABA handles rate-limiting server-side - pass zeroes so the backend sends
    // without artificial throttling. Personal WA uses the user-configured schedule
    // to avoid account restrictions from rapid bulk sends.
    // Guard against NaN values (a cleared number input puts NaN into state).
    // Fall back to the same defaults the useState hooks use above.
    const scheduleParams = channel === 'personal'
      ? {
          batchSize:   Number.isFinite(batchSize)   ? batchSize   : 5,
          delayMin:    Number.isFinite(delayMin)    ? delayMin    : 120,
          delayRandom: Number.isFinite(delayRandom) ? delayRandom : 30,
          dailyLimit:  Number.isFinite(dailyLimit)  ? dailyLimit  : 250,
        }
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
      <DialogContent
        className={cn(
          "sm:w-[90vw] sm:h-[90vh] flex flex-col p-0 overflow-hidden",
          isWA
            ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl"
            : ""
        )}
      >
        <DialogHeader className={cn(isWA ? "px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col items-start gap-1" : "")}>
          <DialogTitle className={cn("flex items-center gap-3", isWA ? "text-zinc-900 dark:text-zinc-100 font-semibold gap-2.5 text-base" : "")}>
            <MessageSquare className={cn("h-6 w-6", isWA ? "h-5 w-5 text-emerald-600 dark:text-emerald-400" : "text-orange-600")} />
            {isWA ? "Send WhatsApp Template" : "Send Template Message"}
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

        <div className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", isWA ? "bg-white dark:bg-zinc-900" : "")}>
          {!selectedTemplate ? (
            <>
              {/* Search */}
              <div className={cn("pt-6 pb-2 flex items-center gap-3", isWA ? "px-6 pt-5 pb-2" : "px-8")}>
                <div className="relative flex-1">
                  <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isWA ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground")} />
                  <Input
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      "pl-9 rounded-xl",
                      isWA
                        ? "h-10 bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                        : "h-11 bg-gray-50 dark:bg-[#2e2f2f] border-gray-100 dark:border-[#3d3d3d] dark:text-white dark:placeholder:text-[#8696a0]"
                    )}
                  />
                </div>
                {channel === 'waba' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs px-3.5 rounded-xl transition-all shrink-0 font-medium",
                      isWA
                        ? "h-10 border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-emerald-600 dark:hover:text-emerald-400"
                        : "h-11 border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/10"
                    )}
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className={cn("w-3.5 h-3.5 mr-1.5", isWA ? "text-emerald-600 dark:text-emerald-400" : "")} /> New template
                  </Button>
                )}
              </div>

              {/* Template list */}
              <div className={cn("flex-1 min-h-0 overflow-y-auto py-4", isWA ? "px-6 py-3 space-y-1.5" : "px-8")}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className={cn("h-5 w-5 animate-spin", isWA ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground")} />
                    <span className={cn("ml-2 text-sm", isWA ? "text-zinc-500 dark:text-zinc-400" : "text-muted-foreground")}>Loading templates...</span>
                  </div>
                ) : loadError ? (
                  // Distinct from "No approved templates found": that claims the
                  // account has none, which we have not established.
                  <div className="flex flex-col items-center justify-center py-12 text-center text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-60" />
                    <p className="text-sm font-medium">Couldn&apos;t load your templates</p>
                    <p className="text-xs opacity-80 max-w-[260px] mt-1">
                      This isn&apos;t &quot;no templates&quot; — {loadError}
                    </p>
                    <button
                      onClick={() => setRefreshKey((k) => k + 1)}
                      className="mt-3 text-xs underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className={cn("flex flex-col items-center justify-center py-12", isWA ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground")}>
                    <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">
                      {templates.length === 0
                        ? 'No approved templates found'
                        : 'No templates match your search'}
                    </p>
                  </div>
                ) : (
                  <div className={cn(isWA ? "space-y-1.5" : "space-y-1")}>
                    {filtered.map((template) => (
                      <div
                        key={`${template.name}-${template.language}`}
                        className={cn(
                          "cursor-pointer transition-all group",
                          isWA
                            ? "p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 shadow-2xs"
                            : "p-3 rounded-xl hover:bg-orange-50/50 dark:hover:bg-[#2e2f2f] border border-transparent hover:border-orange-100 dark:hover:border-[#3d3d3d]"
                        )}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-sm transition-colors",
                            isWA
                              ? "font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                              : "font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400"
                          )}>
                            {template.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold',
                              isWA ? 'px-2 py-0.5 font-medium rounded-md' : 'px-1.5 h-4',
                              categoryColors[template.category] || (isWA ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' : 'bg-gray-50 text-gray-600 border-gray-200')
                            )}
                          >
                            {template.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-medium',
                              isWA ? 'px-1.5 py-0.5 bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60' : 'px-1.5 h-4'
                            )}
                          >
                            {template.language}
                          </Badge>
                        </div>
                        <p className={cn("text-xs line-clamp-2", isWA ? "text-zinc-500 dark:text-zinc-400 leading-relaxed" : "text-muted-foreground")}>
                          {template.body || 'No body text'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={cn("flex-1 flex flex-col min-h-0 overflow-hidden py-6", isWA ? "px-6 py-5" : "px-8")}>
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Back button + template info */}
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  isWA
                    ? "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-800"
                    : "bg-gray-50 dark:bg-[#2e2f2f] border-gray-100 dark:border-[#3d3d3d]"
                )}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 shadow-sm",
                      isWA
                        ? "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-2xs"
                        : "hover:bg-gray-200/50 dark:hover:bg-[#3d3d3d]"
                    )}
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <ChevronDown className={cn("h-4 w-4 rotate-90 text-zinc-700 dark:text-zinc-200")} />
                  </Button>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-bold", isWA ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-gray-900 dark:text-white")}>{selectedTemplate.name}</span>
                    <span className={cn("text-[10px] font-medium uppercase tracking-wider", isWA ? "text-zinc-500 dark:text-zinc-400" : "text-muted-foreground")}>{selectedTemplate.category}</span>
                  </div>
                </div>

                {/* Parameter inputs */}
                {selectedTemplate.parameter_count > 0 && (
                  <div className="space-y-4">
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest", isWA ? "font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider" : "text-gray-400")}>Template Parameters</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {(selectedTemplate.parameters || []).map((paramName, i) => {
                        const currentVal  = paramValues[i] || '';
                        const isCustom    = !FIELD_OPTIONS.some(o => o.value !== '__custom__' && o.value === currentVal);
                        const label       = isNaN(Number(paramName)) ? `{{${paramName}}}` : `Parameter {{${paramName}}}`;
                        const ctx         = getParamContext(selectedTemplate.body, paramName);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "space-y-2 rounded-xl border shadow-sm",
                              isWA
                                ? "p-3.5 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30"
                                : "p-4 border-gray-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2e2f2f]"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn("text-xs font-mono", isWA ? "font-semibold text-zinc-700 dark:text-zinc-300" : "font-bold text-gray-700 dark:text-gray-200")}>{label}</span>
                              {ctx && <span className={cn("text-[10px] font-mono italic", isWA ? "text-zinc-400 dark:text-zinc-500 opacity-80" : "text-muted-foreground opacity-60")}>{ctx}</span>}
                            </div>
                            
                            <Select
                              value={FIELD_OPTIONS.find(o => o.value === currentVal) ? currentVal : '__custom__'}
                              onValueChange={v => handleParamChange(i, v === '__custom__' ? '' : v)}
                            >
                              <SelectTrigger className={cn(
                                "rounded-lg transition-colors",
                                isWA
                                  ? "h-9 text-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:ring-1 focus:ring-emerald-500/30"
                                  : "h-10 border-gray-100 bg-gray-50/50"
                              )}>
                                <SelectValue placeholder="Select data field..." />
                              </SelectTrigger>
                              <SelectContent className={cn(isWA ? "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" : "")}>
                                {FIELD_OPTIONS.map(o => (
                                  <SelectItem
                                    key={o.value}
                                    value={o.value}
                                    className={cn(
                                      isWA ? "focus:bg-zinc-100 focus:text-zinc-900 dark:focus:bg-zinc-700 dark:focus:text-zinc-100 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:text-white data-[state=checked]:focus:bg-emerald-700 dark:data-[state=checked]:focus:bg-emerald-700 data-[state=checked]:focus:text-white dark:data-[state=checked]:focus:text-white transition-colors [&_svg]:!text-white" : ""
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold">{o.label}</span>
                                      <span className="text-[10px]">{o.hint}</span>
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
                                className={cn(
                                  "rounded-lg",
                                  isWA
                                    ? "h-9 text-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/30"
                                    : "h-10"
                                )}
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
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest", isWA ? "font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider" : "text-gray-400")}>Header {selectedTemplate.header_type}</h4>
                    <div className={cn(
                      "p-4 rounded-xl border shadow-sm space-y-3",
                      isWA
                        ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30"
                        : "border-gray-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2e2f2f]"
                    )}>
                      {resolvingMedia ? (
                        <div className={cn("flex items-center gap-3 py-4 text-sm", isWA ? "text-xs text-zinc-500 dark:text-zinc-400" : "text-muted-foreground")}>
                          <Loader2 className={cn("h-5 w-5 animate-spin", isWA ? "h-4 w-4 text-emerald-600 dark:text-emerald-400" : "text-orange-500")} />
                          Resolving media from Meta...
                        </div>
                      ) : (
                        <>
                          {selectedTemplate.header_type === 'image' && headerMediaUrl && (
                            <div className="relative group">
                              <img
                                src={headerMediaUrl}
                                alt="Header preview"
                                className={cn("w-full h-40 object-cover rounded-lg border", isWA ? "border-zinc-200 dark:border-zinc-700 shadow-2xs" : "border-gray-100 shadow-inner")}
                              />
                            </div>
                          )}
                          <Input
                            placeholder="Enter public URL for media..."
                            value={headerMediaUrl}
                            onChange={e => setHeaderMediaUrl(e.target.value)}
                            className={cn(
                              "rounded-lg",
                              isWA
                                ? "h-9 text-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/30"
                                : "h-10"
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Name Format */}
                {hasNameParam && (
                  <div className="space-y-3">
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest", isWA ? "font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider" : "text-gray-400")}>Name Personalization</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNameFormat('first')}
                        className={cn(
                          "p-3 rounded-xl border transition-all text-left group",
                          isWA
                            ? nameFormat === 'first'
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500/30"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                            : nameFormat === 'first'
                              ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/40 ring-1 ring-orange-200 dark:ring-orange-500/30"
                              : "border-gray-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2e2f2f] hover:border-orange-200 dark:hover:border-orange-500/40"
                        )}
                      >
                        <span className={cn(
                          "block text-sm font-bold",
                          isWA
                            ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                            : nameFormat === 'first' ? "text-orange-700 dark:text-orange-400" : "text-gray-900 dark:text-white"
                        )}>First Name</span>
                        <span className={cn(
                          "text-[10px] font-medium uppercase tracking-tight",
                          isWA
                            ? "text-zinc-500 dark:text-zinc-400"
                            : nameFormat === 'first' ? "text-orange-600/80 dark:text-orange-300/80" : "text-muted-foreground dark:text-gray-400"
                        )}>e.g. Naveen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNameFormat('full')}
                        className={cn(
                          "p-3 rounded-xl border transition-all text-left group",
                          isWA
                            ? nameFormat === 'full'
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500/30"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                            : nameFormat === 'full'
                              ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/40 ring-1 ring-orange-200 dark:ring-orange-500/30"
                              : "border-gray-100 dark:border-[#3d3d3d] bg-white dark:bg-[#2e2f2f] hover:border-orange-200 dark:hover:border-orange-500/40"
                        )}
                      >
                        <span className={cn(
                          "block text-sm font-bold",
                          isWA
                            ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                            : nameFormat === 'full' ? "text-orange-700 dark:text-orange-400" : "text-gray-900 dark:text-white"
                        )}>Full Name</span>
                        <span className={cn(
                          "text-[10px] font-medium uppercase tracking-tight",
                          isWA
                            ? "text-zinc-500 dark:text-zinc-400"
                            : nameFormat === 'full' ? "text-orange-600/80 dark:text-orange-300/80" : "text-muted-foreground dark:text-gray-400"
                        )}>e.g. Naveen Reddy</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div className="space-y-3">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest", isWA ? "font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider" : "text-gray-400")}>Message Preview</h4>
                  <div className={cn(
                    "p-6 rounded-2xl relative overflow-hidden shadow-sm",
                    isWA
                      ? "p-5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs"
                      : "bg-white dark:bg-[#2e2f2f] border border-gray-100 dark:border-[#3d3d3d]"
                  )}>
                    <div className={cn("absolute top-0 left-0 w-1.5 h-full", isWA ? "bg-emerald-500" : "bg-orange-400")} />
                    <p className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap",
                      isWA ? "text-zinc-800 dark:text-zinc-200 font-normal" : "text-gray-800 dark:text-gray-200 font-medium"
                    )}>
                      {previewBody}
                    </p>
                  </div>
                </div>

                {/* Batch Settings */}
                {channel === 'personal' && (isBulkSend || selectedCount > 1) && (
                  <div className={cn("space-y-3 pt-4 border-t", isWA ? "border-zinc-200 dark:border-zinc-800" : "border-gray-100")}>
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest", isWA ? "font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider" : "text-gray-400")}>Delivery Schedule</h4>
                    <div className={cn(
                      "rounded-2xl space-y-4",
                      isWA
                        ? "bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 p-5 space-y-3"
                        : "bg-amber-50/50 border border-amber-100 p-6"
                    )}>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className={cn("text-[10px] font-bold uppercase tracking-wider", isWA ? "font-semibold text-zinc-600 dark:text-zinc-400" : "text-amber-700")}>Batch Size</label>
                          <Input
                            type="number"
                            value={Number.isFinite(batchSize) ? batchSize : ''}
                            onChange={e => {
                              const raw = e.target.value;
                              const n = parseInt(raw, 10);
                              setBatchSize(raw === '' || Number.isNaN(n) ? NaN : n);
                            }}
                            className={cn(
                              "rounded-lg",
                              isWA
                                ? "h-9 text-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500/30"
                                : "h-10 border-amber-200 bg-white"
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn("text-[10px] font-bold uppercase tracking-wider", isWA ? "font-semibold text-zinc-600 dark:text-zinc-400" : "text-amber-700")}>Delay (s)</label>
                          <Input
                            type="number"
                            value={Number.isFinite(delayMin) ? delayMin : ''}
                            onChange={e => {
                              const raw = e.target.value;
                              const n = parseInt(raw, 10);
                              setDelayMin(raw === '' || Number.isNaN(n) ? NaN : n);
                            }}
                            className={cn(
                              "rounded-lg",
                              isWA
                                ? "h-9 text-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500/30"
                                : "h-10 border-amber-200 bg-white"
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn("text-[10px] font-bold uppercase tracking-wider", isWA ? "font-semibold text-zinc-600 dark:text-zinc-400" : "text-amber-700")}>Daily Cap</label>
                          <Input
                            type="number"
                            value={Number.isFinite(dailyLimit) ? dailyLimit : ''}
                            onChange={e => {
                              const raw = e.target.value;
                              const n = parseInt(raw, 10);
                              setDailyLimit(raw === '' || Number.isNaN(n) ? NaN : n);
                            }}
                            className={cn(
                              "rounded-lg",
                              isWA
                                ? "h-9 text-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:ring-emerald-500/30"
                                : "h-10 border-amber-200 bg-white"
                            )}
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

        <DialogActions className={cn(isWA ? "border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/80 px-6 py-4" : "")}>
          <div className="flex items-center justify-between w-full">
            <div className={cn("text-sm font-medium", isWA ? "text-zinc-500 dark:text-zinc-400" : "text-muted-foreground")}>
              {selectedTemplate ? (
                <span>
                  Ready to send {selectedCount} {selectedCount === 1 ? 'conversation' : 'conversations'}.
                </span>
              ) : (
                <span>Select a template to continue</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSend}
                disabled={!canSend || sending}
                className={cn(
                  "rounded-xl font-bold shadow-lg transition-all disabled:opacity-50",
                  isWA
                    ? "px-7 py-2.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    : "px-8 py-2.5 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white"
                )}
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
