-- Clean up existing duplicate follow-up bookings before applying constraint
-- Keep the oldest booking for each duplicate set and mark others as cancelled

WITH duplicate_bookings AS (
  SELECT 
    id,
    tenant_id,
    lead_id,
    scheduled_at,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, lead_id, date_trunc('minute', scheduled_at) 
      ORDER BY created_at ASC
    ) as rn
  FROM lad_dev.lead_bookings
  WHERE booking_type IN ('auto_followup', 'manual_followup', 'follow_up', 'scheduled_followup')
    AND task_status IN ('pending', 'scheduled')
    AND status IN ('scheduled', 'confirmed')
)
UPDATE lad_dev.lead_bookings 
SET 
  task_status = 'cancelled',
  status = 'cancelled',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicate_bookings WHERE rn > 1
);

-- Show how many duplicates were cleaned up
SELECT 
  'Cancelled duplicate bookings' as action,
  COUNT(*) as count
FROM lad_dev.lead_bookings 
WHERE task_status = 'cancelled' 
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Now apply the constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_bookings_prevent_rapid_duplicates
ON lad_dev.lead_bookings (tenant_id, lead_id, date_trunc('minute', scheduled_at))
WHERE booking_type IN ('auto_followup', 'manual_followup', 'follow_up', 'scheduled_followup')
  AND task_status IN ('pending', 'scheduled')
  AND status IN ('scheduled', 'confirmed');

COMMENT ON INDEX idx_lead_bookings_prevent_rapid_duplicates IS 
'Prevents duplicate follow-up bookings for same lead within the same minute while allowing legitimate multiple callbacks at different times';