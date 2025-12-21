/**
 * Apollo Phone Service
 * Handles decision maker phone number reveals via Cloud Run webhook service
 */

import { PHONE_SERVICE_URL } from '../config/apolloPhoneConfig';

/**
 * Trigger phone number reveal for a company
 * @param {string} companyDomain - Company domain (e.g., "microsoft.com")
 * @param {string} companyName - Company name (e.g., "Microsoft")
 * @returns {Promise<{requestId: string, status: string}>}
 */
export const triggerPhoneReveal = async (companyDomain, companyName) => {
  try {
    console.log(`📞 Requesting phone for: ${companyName} (${companyDomain})`);
    
    const response = await fetch(`${PHONE_SERVICE_URL}/api/apollo/get-decision-maker-phones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyDomain,
        companyName,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Phone reveal triggered. Request ID: ${data.requestId}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error triggering phone reveal:', error);
    throw error;
  }
};

/**
 * Check status of phone reveal request
 * @param {string} requestId - Request ID from triggerPhoneReveal
 * @returns {Promise<{status: string, data?: object}>}
 */
export const checkPhoneRevealStatus = async (requestId) => {
  try {
    const response = await fetch(`${PHONE_SERVICE_URL}/api/apollo/phone-reveals/${requestId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error checking phone reveal status:', error);
    throw error;
  }
};

/**
 * Check if phone number already exists for a company
 * Uses LOCAL backend to check database first
 * @param {string} companyDomain - Company domain
 * @returns {Promise<object|null>} Existing phone data or null
 */
export const checkExistingPhone = async (companyDomain) => {
  try {
    console.log(`🔍 Checking LOCAL database for phone: ${companyDomain}`);
    
    // Call backend endpoint
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
    const response = await fetch(`${BACKEND_URL}/api/apollo-leads/check-phone/${encodeURIComponent(companyDomain)}`);
    
    if (response.status === 404) {
      console.log('ℹ️ No existing phone found in database');
      return null; // No existing phone
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.status === 'completed' && (data.data?.phoneNumber || data.data?.phone || data.phoneNumber)) {
      console.log(`✅ Found existing phone in LOCAL database: ${data.phoneNumber || data.data?.phoneNumber}`);
      return data;
    }
    
    return null;
  } catch (error) {
    console.log('⚠️ Error checking local database (will trigger new reveal):', error.message);
    return null; // On error, proceed with new reveal
  }
};

/**
 * Get decision maker phone number for a company (with polling)
 * Checks LOCAL database first, then triggers Cloud Run if needed
 * @param {string} companyDomain - Company domain
 * @param {string} companyName - Company name
 * @param {Function} onUpdate - Callback for status updates
 * @returns {Promise<object>} Phone data
 */
export const getDecisionMakerPhone = async (companyDomain, companyName, onUpdate) => {
  // STEP 1: Check LOCAL database first
  console.log('📞 Requesting phone for:', companyName, '(', companyDomain, ')');
  const existingPhone = await checkExistingPhone(companyDomain);
  
  if (existingPhone) {
    console.log('🎯 Using existing phone number from LOCAL database');
    if (onUpdate) {
      onUpdate({ 
        status: 'completed', 
        message: 'Phone number retrieved from database!',
        data: existingPhone.data || existingPhone
      });
    }
    return existingPhone.data || existingPhone;
  }
  
  // STEP 2: No phone in database - trigger Cloud Run for new Apollo reveal
  console.log('📞 No existing phone found in database, triggering Apollo reveal via Cloud Run...');
  const { requestId } = await triggerPhoneReveal(companyDomain, companyName);
  
  if (onUpdate) {
    onUpdate({ status: 'processing', message: 'Getting phone number... (3-5 mins)' });
  }

  // STEP 3: Poll for result every 10 seconds
  return new Promise((resolve, reject) => {
    const maxAttempts = 36; // 36 attempts * 10 seconds = 6 minutes max
    let attempts = 0;

    const checkInterval = setInterval(async () => {
      attempts++;
      console.log(`⏳ Checking phone reveal status (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        const statusData = await checkPhoneRevealStatus(requestId);
        
        if (statusData.status === 'completed') {
          clearInterval(checkInterval);
          console.log('✅ Phone reveal completed!');
          
          if (onUpdate) {
            onUpdate({ 
              status: 'completed', 
              message: 'Phone number received!',
              data: statusData.data 
            });
          }
          
          resolve(statusData.data);
        } else if (statusData.status === 'failed') {
          clearInterval(checkInterval);
          console.log('❌ Phone reveal failed');
          reject(new Error('Phone reveal failed'));
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.log(`❌ Timeout after ${attempts} attempts (${attempts * 10} seconds)`);
          reject(new Error('Timeout waiting for phone number. Phone may still be processing - check back in a few minutes.'));
        }
      } catch (error) {
        clearInterval(checkInterval);
        console.log('❌ Error during polling:', error.message);
        reject(error);
      }
    }, 10000); // Check every 10 seconds
  });
};

export default {
  triggerPhoneReveal,
  checkPhoneRevealStatus,
  getDecisionMakerPhone,
};

