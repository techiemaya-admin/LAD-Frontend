/**
 * Email Templates — SDK Hooks
 * LAD Architecture: SDK Layer — React Query hooks ONLY, no fetch/axios
 *
 * web/ components import from here, never call api.ts directly.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  emailTemplateKeys,
  listEmailTemplates,
  getEmailTemplate,
  getDefaultEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from './api';
import type {
  EmailTemplate,
  EmailTemplateListFilters,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
} from './types';

/** List all email templates for the current tenant */
export function useEmailTemplates(filters?: EmailTemplateListFilters) {
  return useQuery({
    queryKey: emailTemplateKeys.list(filters),
    queryFn: () => listEmailTemplates(filters),
    staleTime: 60_000,
  });
}

/** Get a single email template by ID */
export function useEmailTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: emailTemplateKeys.detail(id ?? ''),
    queryFn: () => getEmailTemplate(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Get the default email template */
export function useDefaultEmailTemplate() {
  return useQuery({
    queryKey: emailTemplateKeys.default(),
    queryFn: getDefaultEmailTemplate,
    staleTime: 60_000,
  });
}

/** Create a new email template */
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmailTemplateInput) => createEmailTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
    },
  });
}

/** Update an email template */
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmailTemplateInput }) =>
      updateEmailTemplate(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(id) });
    },
  });
}

/** Delete an email template */
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
    },
  });
}
