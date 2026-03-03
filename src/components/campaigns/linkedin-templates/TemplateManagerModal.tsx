'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/app-toaster';
import {
  useLinkedInMessageTemplates,
  useUpdateLinkedInMessageTemplate,
  useDeleteLinkedInMessageTemplate,
} from '@lad/frontend-features/campaigns';
import {
  Settings2,
  Trash2,
  Star,
  StarOff,
  Loader2,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { LinkedInMessageTemplate } from '@lad/frontend-features/campaigns';

interface TemplateManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TemplateManagerModal({
  open,
  onClose,
}: TemplateManagerModalProps) {
  const { push } = useToast();
  const { data: templates, isLoading } = useLinkedInMessageTemplates();
  const updateMutation = useUpdateLinkedInMessageTemplate();
  const deleteMutation = useDeleteLinkedInMessageTemplate();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTemplates = templates?.filter((template) => {
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.category?.toLowerCase().includes(query)
    );
  });

  const handleSetDefault = async (template: LinkedInMessageTemplate) => {
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: { is_default: !template.is_default },
      });

      push({
        variant: 'success',
        title: template.is_default ? 'Default Removed' : 'Default Set',
        description: template.is_default
          ? `"${template.name}" is no longer the default template.`
          : `"${template.name}" is now the default template.`,
      });
    } catch (error: any) {
      push({
        variant: 'error',
        title: 'Update Failed',
        description: error?.message || 'Failed to update template.',
      });
    }
  };

  const handleToggleActive = async (template: LinkedInMessageTemplate) => {
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: { is_active: !template.is_active },
      });

      push({
        variant: 'success',
        title: template.is_active ? 'Template Deactivated' : 'Template Activated',
        description: `"${template.name}" has been ${template.is_active ? 'deactivated' : 'activated'}.`,
      });
    } catch (error: any) {
      push({
        variant: 'error',
        title: 'Update Failed',
        description: error?.message || 'Failed to update template.',
      });
    }
  };

  const handleDelete = async (template: LinkedInMessageTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(template.id);

      push({
        variant: 'success',
        title: 'Template Deleted',
        description: `"${template.name}" has been deleted successfully.`,
      });
    } catch (error: any) {
      push({
        variant: 'error',
        title: 'Delete Failed',
        description: error?.message || 'Failed to delete template.',
      });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Manage LinkedIn Message Templates
          </DialogTitle>
          <DialogDescription>
            View, edit, and organize your saved message templates
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Templates List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates && filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 space-y-3 transition-all ${
                  !template.is_active ? 'bg-gray-50 opacity-75' : 'bg-white'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">
                        {template.name}
                      </h3>
                      {template.is_default && (
                        <Badge variant="default" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {template.category && (
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(template.id)}
                      title={expandedId === template.id ? 'Hide Messages' : 'View Messages'}
                    >
                      {expandedId === template.id ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(template)}
                      disabled={updateMutation.isPending}
                      title={template.is_default ? 'Remove as Default' : 'Set as Default'}
                    >
                      {template.is_default ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(template)}
                      disabled={updateMutation.isPending}
                      title={template.is_active ? 'Deactivate' : 'Activate'}
                      className={!template.is_active ? 'text-green-600' : ''}
                    >
                      {template.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expandable Messages Preview */}
                {expandedId === template.id && (
                  <div className="space-y-2 pt-2 border-t">
                    {template.connection_message && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Connection Message ({template.connection_message.length}/300):
                        </p>
                        <p className="text-xs text-gray-800 bg-gray-50 p-2 rounded border">
                          {template.connection_message}
                        </p>
                      </div>
                    )}
                    {template.followup_message && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Followup Message:
                        </p>
                        <p className="text-xs text-gray-800 bg-gray-50 p-2 rounded border">
                          {template.followup_message}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span>Used {template.usage_count} times</span>
                  {template.last_used_at && (
                    <span>
                      Last used: {new Date(template.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  <span className="ml-auto">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? (
                <>No templates found matching "{searchQuery}"</>
              ) : (
                <>No templates saved yet. Create your first template!</>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {filteredTemplates?.length || 0} template(s)
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
