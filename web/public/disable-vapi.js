/**
 * VAPI Emergency Disable Script
 * 
 * Run this in the browser console to immediately disable VAPI
 * without requiring a rebuild or deployment.
 */

// Force disable VAPI for this browser session
localStorage.setItem('disable_vapi', 'true');

// Clear any existing VAPI tokens or cache
localStorage.removeItem('vapi_token');
localStorage.removeItem('vapi_agent_id');

// Show current user info for debugging
const userEmail = localStorage.getItem('user_email') || localStorage.getItem('email') || 'unknown';
console.log('[VAPI] Current user:', userEmail);
console.log('[VAPI] VAPI has been emergency disabled for this session.');

// Note: To re-enable, run: localStorage.removeItem('disable_vapi')
console.log('[VAPI] To re-enable VAPI, run: localStorage.removeItem("disable_vapi")');

// Reload the page to apply changes
if (confirm('Reload page to apply VAPI disable?')) {
  window.location.reload();
}