/**
 * Conversation Assignment Service
 *
 * Handles all API calls for conversation assignments and human intervention:
 * - Assigning conversations to team members
 * - Changing delivery modes (WhatsApp, inbox, both)
 * - Fetching assignment history and audit trail
 * - Managing team workload visibility
 * - Accessing user inbox for in-app messages
 */

import { fetchWithTenant } from '@/lib/fetch-with-tenant';

export interface Assignment {
  id: string;
  conversation_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  delivery_mode: 'whatsapp' | 'inbox' | 'both';
  is_active: boolean;
  reason?: string;
  metadata: Record<string, any>;
}

export interface AssignmentWithHistory {
  current: Assignment | null;
  history: Assignment[];
}

export interface TeamWorkload {
  user_id: string;
  active_count: number;
  total_count: number;
  last_assigned_at: string | null;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  contact_phone: string;
  contact_name: string;
  message_content: string;
  message_role: 'user' | 'assistant';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

export interface InboxResponse {
  success: boolean;
  data: InboxMessage[];
  count: number;
  unread_count: number;
}

const API_BASE = '/api/threads';

/**
 * Assign a conversation to a team member
 */
export async function assignConversation(
  conversationId: string,
  userId: string,
  deliveryMode: 'whatsapp' | 'inbox' | 'both' = 'both',
  reason?: string,
  assignmentContext?: string
): Promise<{ success: boolean; data?: Assignment; error?: string }> {
  try {
    const response = await fetchWithTenant(`${API_BASE}/${conversationId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        delivery_mode: deliveryMode,
        reason: reason || null,
        assignment_context: assignmentContext || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Failed to assign conversation' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Unassign a conversation (release back to AI)
 */
export async function unassignConversation(
  conversationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithTenant(`${API_BASE}/${conversationId}/unassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || null }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Failed to unassign conversation' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get current assignment and full history for a conversation
 */
export async function getAssignment(
  conversationId: string
): Promise<{ success: boolean; data?: AssignmentWithHistory; error?: string }> {
  try {
    const response = await fetchWithTenant(`${API_BASE}/${conversationId}/assignment`);

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch assignment' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get all conversations assigned to the current user
 */
export async function getMyAssignedConversations(
  limit: number = 50,
  offset: number = 0,
  activeOnly: boolean = true
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      active_only: String(activeOnly),
    });

    const response = await fetchWithTenant(`/api/me/assigned-conversations?${params}`);

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch assigned conversations' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get team member workload (for team management view)
 */
export async function getTeamWorkload(): Promise<{ success: boolean; data?: TeamWorkload[]; error?: string }> {
  try {
    const response = await fetchWithTenant(`${API_BASE}/team/workload`);

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch team workload' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Change the delivery mode for an active assignment
 */
export async function updateDeliveryMode(
  conversationId: string,
  newDeliveryMode: 'whatsapp' | 'inbox' | 'both'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithTenant(`${API_BASE}/${conversationId}/assignment/delivery-mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_mode: newDeliveryMode }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Failed to update delivery mode' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's inbox messages (in-app message delivery)
 */
export async function getUserInbox(
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<InboxResponse> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      unread_only: String(unreadOnly),
    });

    const response = await fetchWithTenant(`/api/me/inbox?${params}`);

    if (!response.ok) {
      return { success: false, data: [], count: 0, unread_count: 0 };
    }

    const data = await response.json();
    return { success: true, ...data };
  } catch (error) {
    return { success: false, data: [], count: 0, unread_count: 0 };
  }
}

/**
 * Mark an inbox message as read
 */
export async function markInboxMessageRead(inboxMessageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithTenant(`/api/inbox/${inboxMessageId}/read`, {
      method: 'PUT',
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to mark message as read' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reassign a conversation to a different user
 */
export async function reassignConversation(
  conversationId: string,
  newUserId: string,
  deliveryMode: 'whatsapp' | 'inbox' | 'both' = 'both',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  // First unassign, then reassign
  // In a real implementation, this might be an atomic operation on the backend
  const unassignResult = await unassignConversation(conversationId, `Reassigning to ${newUserId}`);

  if (!unassignResult.success) {
    return { success: false, error: 'Failed to unassign before reassignment' };
  }

  return assignConversation(conversationId, newUserId, deliveryMode, reason || 'Reassigned');
}

/**
 * Get assignment audit trail for a conversation
 */
export async function getAssignmentAuditTrail(
  conversationId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetchWithTenant(`${API_BASE}/${conversationId}/audit-trail?${params}`);

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch audit trail' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
