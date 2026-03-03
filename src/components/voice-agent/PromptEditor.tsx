import React from 'react';
import { Copy, Sparkles, RotateCcw, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CharacterCounter } from './CharacterCounter';
import { cn } from '@/lib/utils';
import { useToast } from '../../hooks/use-toast';

interface PromptEditorProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
  rows?: number;
  samplePrompt?: string;
}

export function PromptEditor({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  disabled = false,
  rows = 6,
  samplePrompt,
}: PromptEditorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleGenerateSample = () => {
    if (samplePrompt) {
      onChange(samplePrompt);
      toast({ title: 'Sample prompt generated' });
    }
  };

  const handleReset = () => {
    onChange('');
    toast({ title: 'Prompt cleared' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!value || disabled}
            className="h-8 w-8 p-0"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          {samplePrompt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateSample}
              disabled={disabled}
              className="h-8 px-2 gap-1"
              title="Generate sample prompt"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Sample</span>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!value || disabled}
            className="h-8 w-8 p-0"
            title="Clear prompt"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "prompt-textarea",
          error && "border-destructive focus:ring-destructive/50"
        )}
      />

      <div className="flex items-center justify-between">
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : (
          <span />
        )}
        <CharacterCounter current={value.length} max={maxLength} />
      </div>
    </div>
  );
}
