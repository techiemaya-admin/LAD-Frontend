# Cloud Tasks Retry Loop Fix

## Issue Description

Cloud Tasks are executing follow-up calls more than the intended 2 retry limit, causing the same phone numbers to be called multiple times. This happens because the Cloud Tasks queue was created without proper retry configuration.

## Root Cause

1. **Default Cloud Tasks Behavior**: By default, Cloud Tasks queues allow up to 100 retries with exponential backoff
2. **Missing Queue Configuration**: The queue was created with basic settings without retry limits:
   ```bash
   gcloud tasks queues create follow-up-calls --location=us-central1
   ```

3. **Logs Evidence**: The logs show the same `bookingId` being executed multiple times:
   ```
   2026-01-07 17:35:53 - Executing follow-up call: bookingId="028cd161-e942-4f99-a125-5eb699a3223c"
   2026-01-07 17:35:53 - Voice call started successfully
   2026-01-07 17:35:53 - Follow-up call executed successfully
   [Multiple more executions of the same booking]
   ```

## Solution

### Step 1: Configure Cloud Tasks Queue Retry Limits

Run the provided script to update the queue configuration:

```bash
# Make the script executable
chmod +x fix-cloud-tasks-retry.sh

# Run the script to configure retry limits
./fix-cloud-tasks-retry.sh
```

This will configure the queue with:
- **Maximum attempts**: 3 (1 initial + 2 retries)
- **Maximum retry duration**: 5 minutes
- **Backoff range**: 60-120 seconds
- **Maximum doublings**: 3

### Step 2: Verify Queue Configuration

Check that the queue is properly configured:

```bash
gcloud tasks queues describe follow-up-voag-calls --location=us-central1
```

You should see output like:
```yaml
retryConfig:
  maxAttempts: 3
  maxRetryDuration: 300s
  minBackoff: 60s
  maxBackoff: 120s
  maxDoublings: 3
```

### Step 3: Monitor for Fixed Behavior

After applying the fix:
1. Create a test follow-up booking
2. Monitor the logs to ensure only 1 initial execution + max 2 retries occur
3. Verify that failed tasks don't loop indefinitely

## Additional Safeguards

### Idempotency Protection

The system already has idempotency protection in place:

```javascript
// In executeFollowUpCall service
if (booking.task_status === 'executed') {
  await client.query('COMMIT');
  
  logger.info('Follow-up call already executed (idempotent):', {
    tenantId,
    bookingId,
    executedAt: booking.executed_at
  });

  return {
    success: true,
    alreadyExecuted: true,
    executedAt: booking.executed_at,
    message: 'Call already executed'
  };
}
```

This ensures that even if Cloud Tasks retries, the call won't be duplicated.

### Monitoring

Monitor these metrics to ensure the fix is working:
- **Task execution count per booking**: Should be max 3 (1 + 2 retries)
- **Call duplication**: No multiple calls to the same phone number for the same booking
- **Queue depth**: Tasks should not accumulate in the queue

## Verification Commands

```bash
# Check current queue status
gcloud tasks queues describe follow-up-voag-calls --location=us-central1

# List pending tasks
gcloud tasks list --queue=follow-up-voag-calls --location=us-central1

# Monitor logs for specific booking
gcloud logs read "resource.type=cloud_run_revision" \
  --filter='textPayload:"bookingId"' \
  --limit=50

# Check for task retry attempts
gcloud logs read "resource.type=cloud_run_revision" \
  --filter='textPayload:"execution_attempts"' \
  --limit=20
```

## Prevention

To prevent this issue in the future:

1. **Always configure retry limits** when creating Cloud Tasks queues
2. **Test retry behavior** in staging environment
3. **Monitor task execution metrics** in production
4. **Use proper idempotency keys** for all Cloud Tasks

### Updated Queue Creation Command

For future queue creation, use:

```bash
gcloud tasks queues create follow-up-voag-calls \
  --location=us-central1 \
  --max-attempts=3 \
  --max-retry-duration=300s \
  --min-backoff=60s \
  --max-backoff=120s \
  --max-doublings=3
```

## Implementation Status

- ✅ **Root cause identified**: Missing Cloud Tasks retry configuration
- ✅ **Fix script created**: `fix-cloud-tasks-retry.sh`
- ✅ **Idempotency verified**: Already implemented in the code
- ⏳ **Queue configuration**: Run the fix script
- ⏳ **Testing**: Verify behavior after applying fix
- ⏳ **Monitoring**: Track metrics to confirm resolution