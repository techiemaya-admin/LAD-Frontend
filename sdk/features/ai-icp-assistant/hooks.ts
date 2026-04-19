/**
 * AI ICP Assistant Hooks
 *
 * Re-exports all hooks from this feature.
 * Clean public API - no logic.
 */

// Existing hooks
export { useItem } from './hooks/useItem';
export { useItems } from './hooks/useItems';
export { useConversation } from './hooks/useConversation';
export { useSaveChatMessages } from './hooks/useSaveChatMessages';
export type { SaveChatMessagesState } from './hooks/useSaveChatMessages';

// New API-centralized hooks
export { useLinkedInSearch } from './hooks/useLinkedInSearch';
export type { LeadTargeting, LeadProfile, LinkedInSearchState } from './hooks/useLinkedInSearch';

export { useAIChat } from './hooks/useAIChat';
export type { ChatMessage, AIChatState } from './hooks/useAIChat';

export { useCampaignCreation } from './hooks/useCampaignCreation';
export type { CampaignStep, CampaignPayload, CampaignCreationState } from './hooks/useCampaignCreation';

export { useVoiceAgent } from './hooks/useVoiceAgent';
export type { VoiceAgent, PhoneNumber, VoiceAgentState } from './hooks/useVoiceAgent';

export { useBilling } from './hooks/useBilling';
export type { WalletData, BillingState } from './hooks/useBilling';
