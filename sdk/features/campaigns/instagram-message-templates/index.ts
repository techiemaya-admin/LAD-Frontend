/**
 * Instagram Message Templates Feature - SDK Exports
 *
 * Export all public APIs, types, and hooks for the Instagram message templates feature.
 */

// Types
export type {
  InstagramMessageTemplate,
  CreateInstagramTemplateRequest,
  UpdateInstagramTemplateRequest,
  InstagramTemplateFilters,
} from './types';

export {
  INSTAGRAM_MESSAGE_VARIABLES,
  INSTAGRAM_DM_RECOMMENDED_MAX_LENGTH,
} from './types';

// API Functions
export {
  instagramMessageTemplateKeys,
  getMessageTemplates,
  getMessageTemplatesQueryOptions,
  getMessageTemplateById,
  getMessageTemplateByIdQueryOptions,
  getDefaultMessageTemplate,
  getDefaultMessageTemplateQueryOptions,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from './api';

// React Hooks
export {
  useMessageTemplates,
  useMessageTemplate,
  useDefaultMessageTemplate,
  useCreateMessageTemplate,
  useUpdateMessageTemplate,
  useDeleteMessageTemplate,
  usePersonalizeMessage,
} from './hooks';
