/**
 * Instagram Message Templates - React Query Hooks
 *
 * Custom hooks using TanStack Query for data fetching and mutations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateInstagramTemplateRequest,
  UpdateInstagramTemplateRequest,
  InstagramTemplateFilters,
} from './types';
import {
  instagramMessageTemplateKeys,
  getMessageTemplatesQueryOptions,
  getMessageTemplateByIdQueryOptions,
  getDefaultMessageTemplateQueryOptions,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from './api';

/**
 * Hook to get all message templates
 */
export function useMessageTemplates(filters?: InstagramTemplateFilters) {
  return useQuery(getMessageTemplatesQueryOptions(filters));
}

/**
 * Hook to get single template by ID
 */
export function useMessageTemplate(id: string) {
  return useQuery(getMessageTemplateByIdQueryOptions(id));
}

/**
 * Hook to get default template
 */
export function useDefaultMessageTemplate() {
  return useQuery(getDefaultMessageTemplateQueryOptions());
}

/**
 * Hook to create new template
 */
export function useCreateMessageTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInstagramTemplateRequest) => createMessageTemplate(data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: instagramMessageTemplateKeys.lists() });
      if (newTemplate.is_default) {
        queryClient.invalidateQueries({ queryKey: instagramMessageTemplateKeys.default() });
      }
    },
  });
}

/**
 * Hook to update template
 */
export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstagramTemplateRequest }) =>
      updateMessageTemplate(id, data),
    onSuccess: (updatedTemplate) => {
      queryClient.setQueryData(
        instagramMessageTemplateKeys.detail(updatedTemplate.id),
        updatedTemplate
      );
      queryClient.invalidateQueries({ queryKey: instagramMessageTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instagramMessageTemplateKeys.default() });
    },
  });
}

/**
 * Hook to delete template
 */
export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMessageTemplate(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: instagramMessageTemplateKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: instagramMessageTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instagramMessageTemplateKeys.default() });
    },
  });
}

/**
 * Hook to personalize a message with lead data
 */
export function usePersonalizeMessage() {
  return (
    message: string | null,
    leadData: {
      first_name?: string;
      last_name?: string;
      username?: string;
      company?: string;
    }
  ): string | null => {
    if (!message) return null;

    let personalized = message;

    if (leadData.first_name) {
      personalized = personalized.replace(/\{\{first_name\}\}/gi, leadData.first_name);
    }
    if (leadData.last_name) {
      personalized = personalized.replace(/\{\{last_name\}\}/gi, leadData.last_name);
    }
    if (leadData.first_name && leadData.last_name) {
      const fullName = `${leadData.first_name} ${leadData.last_name}`;
      personalized = personalized.replace(/\{\{full_name\}\}/gi, fullName);
    }
    if (leadData.username) {
      personalized = personalized.replace(/\{\{username\}\}/gi, leadData.username);
    }
    if (leadData.company) {
      personalized = personalized.replace(/\{\{company\}\}/gi, leadData.company);
    }

    return personalized;
  };
}
