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
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center justify-center w-10 h-10">
              <Settings2 className="h-5 w-5 stroke-[2.5px]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle>Manage LinkedIn Message Templates</DialogTitle>
              <DialogDescription>
                View, edit, and organize your saved message templates
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-8 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, category, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 rounded-xl border-gray-100 bg-gray-50/50"
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto px-8 py-2 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates && filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`border rounded-xl p-4 space-y-3 transition-all ${
                  !template.is_active ? 'bg-gray-50 opacity-75' : 'bg-white'
                } border-gray-100 hover:border-blue-200 hover:shadow-md`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-gray-900 truncate">
                        {template.name}
                      </h3>
                      {template.is_default && (
                        <Badge variant="default" className="text-[10px] font-bold bg-blue-600">
                          Default
                        </Badge>
                      )}
                      {template.category && (
                        <Badge variant="outline" className="text-[10px] font-bold text-gray-500 border-gray-200">
                          {template.category}
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg h-8 w-8 p-0"
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
                      className="rounded-lg h-8 w-8 p-0"
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
                      className="rounded-lg h-8 w-8 p-0"
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
                      className="rounded-lg h-8 w-8 p-0"
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
                  <div className="space-y-2 pt-2 border-t border-gray-50">
                    {template.connection_message && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Connection Message ({template.connection_message.length}/300)
                        </p>
                        <p className="text-xs text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          {template.connection_message}
                        </p>
                      </div>
                    )}
                    {template.followup_message && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Followup Message
                        </p>
                        <p className="text-xs text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          {template.followup_message}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Stats */}
                <div className="flex items-center gap-4 text-[10px] font-medium text-gray-400 pt-2 border-t border-gray-50 uppercase tracking-wider">
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
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 rounded-full bg-gray-50 w-fit mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-200" />
              </div>
              <p className="font-bold text-gray-900">No templates found</p>
              <p className="text-sm mt-1">
                {searchQuery ? `No matches for "${searchQuery}"` : "Create your first template to get started!"}
              </p>
            </div>
          )}
        </div>

        <DialogActions>
          <div className="flex-1 text-sm font-medium text-gray-500">
            {filteredTemplates?.length || 0} template(s)
          </div>
          <Button 
            onClick={onClose}
            className="rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            Close
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
