/**
 * Apollo Phone Service - Frontend
 * 
 * PURPOSE:
 * Handles phone number reveal functionality for Apollo leads.
 * Integrates with backend phone enrichment service.
 * 
 * FEATURES:
 * - Decision maker phone lookup
 * - Bulk phone reveal
 * - Credit cost tracking (8 credits per phone)
 * - Error handling for insufficient credits
 */

const PHONE_SERVICE_URL = process.env.NEXT_PUBLIC_PHONE_SERVICE_URL || 'http://localhost:3006';

export interface PhoneRevealRequest {
  contacts: Array<{
    id: string;
    name: string;
    company?: string;
    title?: string;
  }>;
}

export interface PhoneRevealResponse {
  success: boolean;
  results: Array<{
    contact_id: string;
    phone?: string;
    error?: string;
    credits_used: number;
  }>;
  total_credits_used: number;
  credits_remaining: number;
}

/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || localStorage.getItem('auth_token');
}

/**
 * Reveal decision maker phone numbers for a list of contacts
 */
export async function getDecisionMakerPhones(
  request: PhoneRevealRequest
): Promise<PhoneRevealResponse> {
  try {
    const token = getAuthToken();
    
    const response = await fetch(`${PHONE_SERVICE_URL}/api/apollo/get-decision-maker-phones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        success: false,
        error: 'Unknown error'
      }));

      if (response.status === 402) {
        throw new Error(errorData.message || 'Insufficient credits to reveal phone numbers.');
      }

      throw new Error(errorData.message || `Phone reveal failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Phone reveal failed:', error);
    throw error;
  }
}

/**
 * Reveal a single phone number
 */
export async function revealSinglePhone(
  contactId: string,
  name: string,
  company?: string,
  title?: string
): Promise<string | null> {
  const response = await getDecisionMakerPhones({
    contacts: [{ id: contactId, name, company, title }]
  });

  if (response.results.length > 0) {
    const result = response.results[0];
    if (result.phone) {
      return result.phone;
    }
    if (result.error) {
      throw new Error(result.error);
    }
  }

  return null;
}

/**
 * Export as default for backward compatibility
 */
export default {
  getDecisionMakerPhones,
  revealSinglePhone
};
