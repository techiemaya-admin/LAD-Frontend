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

interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  parameter_count: number;
}

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSend: (templateName: string, languageCode: string, parameters: string[]) => void;
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
        if (data.success) setTemplates(data.data || []);
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
    // Auto-fill first parameter with {member_name} placeholder
    // The backend will substitute it with each contact's actual name
    const defaults = new Array(template.parameter_count).fill('');
    if (template.parameter_count > 0) {
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
    );
  }, [selectedTemplate, paramValues, onSend]);

  // Preview body with params filled in
  const previewBody = useMemo(() => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;
    paramValues.forEach((val, i) => {
      body = body.replace(`{{${i + 1}}}`, val || `{{${i + 1}}}`);
    });
    return body;
  }, [selectedTemplate, paramValues]);

  const canSend = selectedTemplate && paramValues.every((v, i) => {
    // All parameters must be filled
    return selectedTemplate.parameter_count === 0 || v.trim().length > 0;
  });

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
                  {Array.from({ length: selectedTemplate.parameter_count }, (_, i) => (
                    <Input
                      key={i}
                      placeholder={`Parameter {{${i + 1}}} — type {member_name} to auto-fill contact name`}
                      value={paramValues[i] || ''}
                      onChange={(e) => handleParamChange(i, e.target.value)}
                      className="h-8 text-sm"
                    />
                  ))}
                </div>
              )}

              {/* Preview */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Preview</p>
                <p className="text-sm whitespace-pre-wrap">{previewBody}</p>
              </div>
            </div>

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
