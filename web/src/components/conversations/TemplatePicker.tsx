import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Send, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  parameter_count: number;
  parameters: string[]; // e.g. ['name', '1', 'company']
}

type NameFormat = 'first' | 'full';

interface BatchOptions {
  batchSize: number;      // how many messages per batch
  delayMin: number;       // minimum delay between batches (seconds)
  delayRandom: number;    // additional random 0–N seconds added to delay
}

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSend: (templateName: string, languageCode: string, parameters: string[], nameFormat: NameFormat, batch: BatchOptions) => void;
  sending?: boolean;
}

const TEMPLATES_API = '/api/whatsapp-conversations/conversations/templates';

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
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [nameFormat, setNameFormat] = useState<NameFormat>('first');
  const [batchSize, setBatchSize] = useState(5);
  const [delayMin, setDelayMin] = useState(120);    // seconds
  const [delayRandom, setDelayRandom] = useState(30); // extra random seconds

  // Fetch templates when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedTemplate(null);
    setParamValues([]);
    setSearch('');
    fetchWithTenant(TEMPLATES_API)
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
                category: t.category || t.metadata?.channel_type || 'MESSAGE',
                body,
                parameter_count: params.length || t.parameter_count || 0,
                parameters: params,
              };
            });
          setTemplates(normalized);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

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

  const handleSelectTemplate = useCallback((template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    // Auto-fill known contact fields with sentinels so the backend can personalize per-contact
    const params = template.parameters || [];
    const defaults = params.map((p) => {
      const key = p.toLowerCase();
      if (CONTACT_NAME_FIELDS.includes(key)) return '{member_name}';
      if (CONTACT_COMPANY_FIELDS.includes(key)) return '{member_company}';
      return '';
    });
    // Fallback for positional-only templates: prefill {{1}} with {member_name}
    if (defaults.length > 0 && defaults[0] === '' && !isNaN(Number(params[0]))) {
      defaults[0] = '{member_name}';
    }
    setParamValues(defaults);
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
      { batchSize, delayMin, delayRandom },
    );
  }, [selectedTemplate, paramValues, nameFormat, batchSize, delayMin, delayRandom, onSend]);

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
    paramValues.every((v) => v.trim().length > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Send Template Message
            <Badge variant="secondary" className="text-xs">
              {selectedCount} conversation{selectedCount !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

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
            <ScrollArea className="flex-1 max-h-[400px]">
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
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Selected template detail */}
            <div className="space-y-4">
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
                    const isAutoFilled = paramValues[i] === '{member_name}' || paramValues[i] === '{member_company}';
                    const label = isNaN(Number(paramName)) ? `{{${paramName}}}` : `Parameter {{${paramName}}}`;
                    return (
                      <div key={i} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-mono">{label}</p>
                        <Input
                          placeholder={
                            isAutoFilled
                              ? 'Auto-filled per contact'
                              : `Enter value for ${label}`
                          }
                          value={paramValues[i] || ''}
                          onChange={(e) => handleParamChange(i, e.target.value)}
                          className={`h-8 text-sm ${isAutoFilled ? 'text-muted-foreground italic' : ''}`}
                        />
                        {isAutoFilled && (
                          <p className="text-[10px] text-green-600">
                            ✓ Will be replaced with each contact&apos;s name automatically
                          </p>
                        )}
                      </div>
                    );
                  })}
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

              {/* Batch & Delay settings */}
              {selectedCount > 1 && (
                <div className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800">Sending schedule ({selectedCount} contacts)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-700 font-medium">Batch size</label>
                      <Input
                        type="number"
                        min={1} max={50}
                        value={batchSize}
                        onChange={e => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-7 text-xs text-center"
                      />
                      <p className="text-[9px] text-amber-600 text-center">msgs / batch</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-700 font-medium">Min delay</label>
                      <Input
                        type="number"
                        min={10} max={3600}
                        value={delayMin}
                        onChange={e => setDelayMin(Math.max(10, parseInt(e.target.value) || 10))}
                        className="h-7 text-xs text-center"
                      />
                      <p className="text-[9px] text-amber-600 text-center">seconds</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-700 font-medium">+Random</label>
                      <Input
                        type="number"
                        min={0} max={300}
                        value={delayRandom}
                        onChange={e => setDelayRandom(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-7 text-xs text-center"
                      />
                      <p className="text-[9px] text-amber-600 text-center">0–N secs</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    ≈ {batchSize} messages, then wait {delayMin}s + random 0–{delayRandom}s before next batch
                  </p>
                </div>
              )}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!canSend || sending}
              >
                {sending ? (
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
