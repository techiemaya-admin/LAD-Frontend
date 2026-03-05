'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLinkedInMessageTemplates } from '@lad/frontend-features/campaigns';
import { Settings2, Loader2 } from 'lucide-react';
import type { LinkedInMessageTemplate } from '@lad/frontend-features/campaigns';

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (template: LinkedInMessageTemplate | null) => void;
  onManageClick: () => void;
  className?: string;
}

export default function TemplateSelector({
  selectedTemplateId,
  onTemplateSelect,
  onManageClick,
  className = '',
}: TemplateSelectorProps) {
  const { data: templates, isLoading, error } = useLinkedInMessageTemplates({ is_active: true });

  const handleValueChange = (value: string) => {
    if (value === 'none') {
      onTemplateSelect(null);
    } else {
      const selected = templates?.find(t => t.id === value);
      if (selected) {
        onTemplateSelect(selected);
      }
    }
  };

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading templates. Please try again.
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LinkedIn Message Template
        </label>
        <Select
          value={selectedTemplateId || 'none'}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading templates...</span>
              </div>
            ) : (
              <SelectValue placeholder="Select a template or create custom messages" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              Custom Messages (Type your own)
            </SelectItem>
            {templates && templates.length > 0 && (
              <>
                <div className="border-t my-1" />
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{template.name}</span>
                      {template.description && (
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      )}
                      {template.is_default && (
                        <span className="text-xs text-blue-600 font-medium">
                          (Default)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        {templates && templates.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground mt-1">
            No saved templates yet. Type your messages below and save them for future use.
          </p>
        )}
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onManageClick}
        className="mt-6"
        title="Manage Templates"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
