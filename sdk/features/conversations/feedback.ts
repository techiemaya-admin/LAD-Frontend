/**
 * Conversations Feature - agent-response feedback
 *
 * Thumbs up/down on what the AI said, and on a thumbs-down, what it should
 * have said instead. Corrections are appended to the tenant's WABA system
 * prompt on the next turn, so a dislike changes behaviour without anyone
 * editing the prompt.
 *
 * Kept in its own module rather than api.ts: that file is already ~600 lines
 * of message/conversation CRUD, and this is a self-contained concern.
 */
import { proxyClient } from '../../shared/proxyClient';

export type FeedbackRating = 'like' | 'dislike';

export interface MessageFeedback {
  id: string;
  message_id: string;
  rating: FeedbackRating;
  actual_response: string | null;
  expected_response: string | null;
  submitted_by: string | null;
  is_active: boolean;
}

export interface SubmitFeedbackRequest {
  conversationId: string;
  messageId: string;
  rating: FeedbackRating;
  /**
   * Which agent is being corrected. Defaults to the WhatsApp/WABA endpoint.
   * 'linkedin' appends ?channel=linkedin, which the conversations proxy routes
   * to LAD_backend's /api/linkedin-conversations. Corrections are scoped per
   * channel server-side, so a LinkedIn correction only ever trains LinkedIn.
   */
  channel?: 'waba' | 'linkedin';
  /** What the agent SHOULD have said. Only meaningful on a dislike. */
  expectedResponse?: string;
  /**
   * What it actually said. Optional - the backend falls back to the stored
   * message text, so the caller does not have to echo it back.
   */
  actualResponse?: string;
  submittedBy?: string;
}

export interface SubmitFeedbackResponse {
  id: string;
  rating: FeedbackRating;
  is_active: boolean;
  /**
   * False when a dislike carried no expected response. The feedback is
   * recorded, but nothing was learned - surface this so the reviewer knows
   * the agent will keep making the same mistake.
   */
  willTrain: boolean;
}

export const feedbackKeys = {
  all: ['conversation-feedback'] as const,
  byConversation: (conversationId: string) =>
    [...feedbackKeys.all, conversationId] as const,
};

export async function submitMessageFeedback(
  req: SubmitFeedbackRequest
): Promise<SubmitFeedbackResponse> {
  // proxyClient wraps the response body in `.data`, so the service payload
  // is at response.data.* - matching every other call in this feature.
  const response = await proxyClient.post<{
    success: boolean;
    data: { id: string; rating: FeedbackRating; is_active: boolean };
    will_train: boolean;
  }>(
    `/api/whatsapp-conversations/conversations/${req.conversationId}/messages/${req.messageId}/feedback` +
      (req.channel === 'linkedin' ? '?channel=linkedin' : ''),
    {
      rating: req.rating,
      expected_response: req.expectedResponse,
      actual_response: req.actualResponse,
      submitted_by: req.submittedBy,
    }
  );
  return { ...response.data.data, willTrain: response.data.will_train };
}

export async function getConversationFeedback(
  conversationId: string
): Promise<MessageFeedback[]> {
  const response = await proxyClient.get<{ success: boolean; data: MessageFeedback[] }>(
    `/api/whatsapp-conversations/conversations/${conversationId}/feedback`
  );
  return response.data.data ?? [];
}

/** One correction in the management panel. */
export interface LearnedCorrection {
  id: string;
  conversation_id: string;
  message_id: string;
  actual_response: string | null;
  expected_response: string | null;
  submitted_by: string | null;
  is_active: boolean;
  /**
   * Whether this correction actually reaches the prompt. Only the newest
   * `max_in_prompt` ACTIVE ones do - an active correction past that cap is
   * stored and visible but has no effect, and the panel must say so rather
   * than let someone believe it applies.
   */
  in_prompt: boolean;
  created_at: string | null;
}

export async function listLearnedCorrections(): Promise<{
  corrections: LearnedCorrection[];
  maxInPrompt: number;
}> {
  const response = await proxyClient.get<{
    success: boolean;
    data: LearnedCorrection[];
    max_in_prompt: number;
  }>('/api/whatsapp-conversations/conversations/feedback/corrections');
  return {
    corrections: response.data.data ?? [],
    maxInPrompt: response.data.max_in_prompt ?? 0,
  };
}

/** Switch a correction on or off. Takes effect on the very next message. */
export async function setCorrectionActive(
  feedbackId: string,
  isActive: boolean
): Promise<void> {
  await proxyClient.patch(
    `/api/whatsapp-conversations/conversations/feedback/${feedbackId}`,
    { is_active: isActive }
  );
}
