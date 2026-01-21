# Recording URL API Request/Response Examples

## 1. Fetch Call Log Details

### Request
```
GET /api/voice-agent/calllogs/abc-123-def-456
Authorization: Bearer <jwt-token>
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "call_log_id": "abc-123-def-456",
    "id": "abc-123-def-456",
    "call_id": "voice-call-789",
    "voice_call_id": "voice-call-789",
    "agent_name": "Agent Smith",
    "lead_first_name": "John",
    "lead_last_name": "Doe",
    "lead_name": "John Doe",
    "direction": "outbound",
    "call_type": "outbound",
    "status": "completed",
    "started_at": "2026-01-20T10:30:00.000Z",
    "duration_seconds": 245,
    "call_duration": 245,
    "cost": 0.75,
    "call_cost": 0.75,
    "batch_status": "completed",
    "batch_id": "batch-xyz-123",
    "lead_category": "Hot Lead",
    "organization_id": "org-123",
    
    "signed_recording_url": "https://storage.googleapis.com/lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...&X-Goog-Date=20260120T103000Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=...",
    
    "recording_url": "https://storage.googleapis.com/lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav",
    
    "call_recording_url": "gs://lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav",
    
    "transcripts": "[{\"speaker\":\"agent\",\"text\":\"Hello, how can I help you?\",\"timestamp\":0},{\"speaker\":\"customer\",\"text\":\"I need assistance with my account\",\"timestamp\":2}]",
    
    "transcription": "[{\"speaker\":\"agent\",\"text\":\"Hello, how can I help you?\",\"timestamp\":0}]",
    
    "analysis": {
      "sentiment": "positive",
      "summary": "Customer called about account issues. Agent resolved query successfully.",
      "key_points": [
        "Account balance confirmed",
        "Password reset initiated",
        "Follow-up scheduled"
      ],
      "duration_engagement": "Good engagement",
      "call_quality": "Clear",
      "next_steps": "Customer to receive email confirmation"
    }
  }
}
```

---

## 2. Fetch Signed Recording URL

### Request
```
GET /api/voice-agent/calls/voice-call-789/recording-signed-url
Authorization: Bearer <jwt-token>
```

### Response (200 OK)
```json
{
  "success": true,
  "signed_url": "https://storage.googleapis.com/lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-service-account%40project.iam.gserviceaccount.com&X-Goog-Date=20260120T130000Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=abc123def456ghi789..."
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "Recording not found"
}
```

### Response (500 Server Error)
```json
{
  "success": false,
  "error": "Failed to generate signed URL"
}
```

---

## 3. Backend Processing Flow

### Step 1: Extract Recording URL from Database
```
Database Query:
SELECT call_recording_url, signed_recording_url, recording_url 
FROM call_logs 
WHERE call_log_id = 'abc-123-def-456'

Result:
{
  call_recording_url: 'gs://lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav',
  signed_recording_url: 'https://storage.googleapis.com/...',
  recording_url: 'https://storage.googleapis.com/...'
}
```

### Step 2: Generate Signed URL (if needed)
```typescript
// Pseudocode
const gcsUrl = "gs://lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav";
const signedUrl = await storage.bucket('lad-voice-recordings').file(
  'recordings/2026-01-20/voice-call-789.wav'
).getSignedUrl({
  version: 'v4',
  action: 'read',
  expires: Date.now() + 3600 * 1000, // 1 hour
});
// Result: https://storage.googleapis.com/...?X-Goog-Signature=...
```

---

## 4. URL Format Conversions

### Original GCS Format
```
gs://lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav
```

### Converted to HTTPS
```
https://storage.googleapis.com/lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav
```

### With Signature (Signed URL)
```
https://storage.googleapis.com/lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...&X-Goog-Date=...&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=...
```

### Via Proxy Endpoint
```
http://localhost:3000/api/recording-proxy?url=https%3A%2F%2Fstorage.googleapis.com%2Flad-voice-recordings%2Frecordings%2F2026-01-20%2Fvoice-call-789.wav
```

---

## 5. Frontend Code Flow

### In call-log-modal.tsx (Line ~565)

```typescript
// Step 1: Fetch call log
const res = await apiGet(`/api/voice-agent/calllogs/${id}`);
const l = res.data || res.log;

// Step 2: Extract call ID
const callId = l?.call_id ?? l?.callId ?? l?.voice_call_id ?? l?.id;

// Step 3: Try to fetch signed URL endpoint
try {
  const signedRes = await apiGet(
    `/api/voice-agent/calls/${callId}/recording-signed-url`
  );
  if (signedRes?.success && signedRes?.signed_url) {
    audioUrl = signedRes.signed_url; // ✅ Use this first
  }
} catch (error) {
  logger.warn('Signed URL fetch failed, using fallback');
}

// Step 4: Fallback to URLs from main response
if (!audioUrl && l?.signed_recording_url) {
  audioUrl = l.signed_recording_url; // ✅ Use this second
}
if (!audioUrl && l?.recording_url) {
  audioUrl = l.recording_url; // ✅ Use this third
}
if (!audioUrl && l?.call_recording_url) {
  audioUrl = l.call_recording_url; // ✅ Use this fourth (may be gs://)
}

// Step 5: Set for audio player
setSignedRecordingUrl(audioUrl);
```

---

## 6. Export Data Processing

### Input: Call Log Object
```json
{
  "id": "abc-123-def-456",
  "assistant": "Agent Smith",
  "lead_name": "John Doe",
  "duration": 245,
  "signed_recording_url": "https://storage.googleapis.com/...",
  "recording_url": "https://storage.googleapis.com/...",
  "call_recording_url": "gs://lad-voice-recordings/..."
}
```

### Processing in exportToExcel.ts
```typescript
// 1. Get recording URL
const recordingUrl = convertGcsToHttps(
  item.signed_recording_url || 
  item.recording_url || 
  item.call_recording_url
);
// Result: "https://storage.googleapis.com/..."

// 2. Convert to proxy URL
const recordingProxyUrl = convertToProxyUrl(recordingUrl);
// Result: "http://localhost:3000/api/recording-proxy?url=..."

// 3. Generate analysis
const analysis = generateAnalysis(item);
// Result: "Good engagement (1-5 min) | Call completed | Outbound call"
```

### Output: CSV Row
```
abc123...,Agent Smith,John Doe,Outbound,Completed,2026-01-20 10:30:00,4:05,245,$0.75,Hot,Good engagement (1-5 min) | Call completed | Outbound call,https://storage.googleapis.com/...,http://localhost:3000/api/recording-proxy?url=...,batch-xyz-123
```

---

## 7. Test with cURL

### Get Call Log
```bash
curl -X GET "http://localhost:3000/api/voice-agent/calllogs/abc-123-def-456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Signed URL
```bash
curl -X GET "http://localhost:3000/api/voice-agent/calls/voice-call-789/recording-signed-url" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Check Recording File Size
```bash
curl -I "https://storage.googleapis.com/lad-voice-recordings/recordings/2026-01-20/voice-call-789.wav" \
  -H "Authorization: Bearer YOUR_GCS_TOKEN"

# Response Headers:
# content-length: 2097152 (2MB example)
# content-type: audio/wav
# cache-control: private
```

