# How to Check Recording URL in Console

## Step-by-Step Guide

### 1. **Open Call Logs Page**
- Navigate to `/call-logs` in your application

### 2. **Click on a Call Log Entry**
- The Call Log Modal will open

### 3. **Open Browser Developer Console**
- Press `F12` or `Ctrl+Shift+I` (Windows)
- Press `Cmd+Option+I` (Mac)
- Go to the **Console** tab

### 4. **Look for These Log Messages**

#### **Initial Call Details Fetch:**
```
[CallLogModal] Fetching call log details
{
  id: "call-id-123"
}
```

#### **Call Log Response Received:**
```
[CallLogModal] Call log response received
{
  id: "call-id-123",
  hasData: true,
  fields: ["call_log_id", "agent_name", "lead_name", "recording_url", ...],
  recordingUrls: {
    signed_recording_url: "https://storage.googleapis.com/...truncated",
    recording_url: "https://storage.googleapis.com/...truncated",
    call_recording_url: "gs://bucket/path/to/recording.wav"
  }
}
```

#### **Signed URL Resolution Started:**
```
[CallLogModal] Recording URL resolution started
{
  callId: "voice-call-123"
}
```

#### **Signed URL Fetch Attempt:**
```
[CallLogModal] Fetching signed recording URL
{
  callId: "voice-call-123"
}
```

#### **Signed URL Response:**
```
[CallLogModal] Signed URL response
{
  callId: "voice-call-123",
  success: true,
  hasSigned_url: true,
  signed_url: "https://storage.googleapis.com/...truncated with signature params"
}
```

#### **Final URL Selected:**
```
[CallLogModal] Final recording URL selected
{
  hasUrl: true,
  urlPreview: "https://storage.googleapis.com/...or gs://...truncated"
}
```

---

## API Endpoints Being Called

### **1. Get Call Log Details**
```
GET /api/voice-agent/calllogs/{id}
```

**Response includes:**
- `signed_recording_url` - Pre-signed HTTPS URL
- `recording_url` - Recording URL
- `call_recording_url` - Alternative recording URL format
- `transcripts` - Call transcription
- `analysis` - Call analysis data

### **2. Get Signed Recording URL** (fallback)
```
GET /api/voice-agent/calls/{callId}/recording-signed-url
```

**Response:**
```json
{
  "success": true,
  "signed_url": "https://storage.googleapis.com/bucket/path?signature=..."
}
```

---

## URL Priority (Fallback Order)

When clicking a log, the modal tries to get the recording URL in this order:

1. ✅ **Signed URL Endpoint**: `/api/voice-agent/calls/{callId}/recording-signed-url`
   - Most secure, shortest expiration
   - Used if above fails

2. ✅ **signed_recording_url** from call log response
   - Pre-signed URL included in main response

3. ✅ **recording_url** from call log response
   - Standard recording URL

4. ✅ **call_recording_url** from call log response
   - Alternative field name

5. ❌ **None** - "No recording available"

---

## What You'll See in Console

### **Success Example:**
```
[CallLogModal] Fetching call log details {id: "abc123"}
[CallLogModal] Call log response received {
  id: "abc123",
  hasData: true,
  recordingUrls: {
    signed_recording_url: "https://storage.googleapis.com/my-bucket/...",
    recording_url: "https://storage.googleapis.com/my-bucket/...",
    call_recording_url: "gs://my-bucket/..."
  }
}
[CallLogModal] Recording URL resolution started {callId: "xyz789"}
[CallLogModal] Fetching signed recording URL {callId: "xyz789"}
[CallLogModal] Signed URL response {
  success: true,
  hasSigned_url: true,
  signed_url: "https://storage.googleapis.com/my-bucket/...?X-Goog-Signature=..."
}
[CallLogModal] Using signed URL from endpoint {callId: "xyz789"}
[CallLogModal] Final recording URL selected {
  hasUrl: true,
  urlPreview: "https://storage.googleapis.com/...truncated"
}
```

### **Error Example (Fallback Used):**
```
[CallLogModal] Fetching call log details {id: "abc123"}
[CallLogModal] Call log response received {hasData: true, ...}
[CallLogModal] Recording URL resolution started {callId: "xyz789"}
[CallLogModal] Fetching signed recording URL {callId: "xyz789"}
[CallLogModal] Signed URL response {success: false}
[CallLogModal] Failed to fetch signed recording URL, using fallback
[CallLogModal] Using signed_recording_url from response
[CallLogModal] Final recording URL selected {hasUrl: true, ...}
```

---

## Filter Console Logs

In the Console tab, type this to filter for Call Log Modal logs:

```javascript
console.clear(); // Clear previous logs
// Then click a call log to see new logs
```

Or filter by typing in the search box:
```
CallLogModal
```

---

## Export Data Check

When you export call logs to CSV:

1. **Recording URL (GCP HTTPS)** - Converted from GCS format
   - Example: `https://storage.googleapis.com/my-bucket/path/recording.wav`

2. **Recording Proxy URL** - Backend proxy for secure access
   - Example: `http://localhost:3000/api/recording-proxy?url=https%3A%2F%2Fstorage.googleapis.com%2F...`

3. **Analysis** - Automated insights
   - Example: `Good engagement (1-5 min) | Call completed | Outbound call`

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No recording available" | No recording URL in response | Check backend response has recording_url fields |
| Empty console logs | Logger not working | Check if logger is imported and configured |
| URL truncated in console | Normal behavior | Click the URL to expand it in console |
| Wrong URL format | Multiple formats being returned | Check priority order above |

