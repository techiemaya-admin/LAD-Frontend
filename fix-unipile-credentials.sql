-- Fix Unipile Account Status
-- This resets the account status from 'expired' back to 'active'
-- Run this after updating UNIPILE_TOKEN in your .env file

UPDATE lad_dev.social_linkedin_accounts 
SET 
  status = 'active',
  updated_at = CURRENT_TIMESTAMP
WHERE 
  provider_account_id = 'D96MaOAdRFmYnbKGStxCqg'
  AND status = 'expired';

-- Verify the update
SELECT 
  id,
  provider_account_id,
  status,
  updated_at
FROM lad_dev.social_linkedin_accounts
WHERE provider_account_id = 'D96MaOAdRFmYnbKGStxCqg';
