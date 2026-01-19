# Frontend Chat Issue - Fix Instructions

## 🐛 Problem
The frontend chat is showing **hardcoded/fixed responses** instead of calling the AI backend.

**Example**: User types "oil and gas, dubai" but sees "What industry are you targeting? (e.g., healthcare, fintech, technology, SaaS)"

## ✅ Solution

### Root Cause
The frontend is running with **cached code** and needs to be restarted to pick up the updated `mayaAIService`.

### Files That Were Updated
1. ✅ `lad_ui/src/services/mayaAIService.js` - Added expandKeywords method
2. ✅ `lad_ui/src/components/AIChatSection.jsx` - Added keyword chips display
3. ✅ Backend AI-ICP-Assistant - Enhanced with keyword expansion

### Fix Steps

#### 1. Restart Frontend (REQUIRED)
```bash
# Stop current frontend
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/lad_ui
# Press Ctrl+C in the terminal running npm run dev

# Start fresh
npm run dev
```

#### 2. Clear Browser Cache
- Open browser DevTools (F12)
- Right-click reload button → "Empty Cache and Hard Reload"
- Or use Incognito/Private mode

#### 3. Verify Backend is Running
```bash
# Check backend
curl http://localhost:3004/health

# Should return: {"status":"ok"}
```

#### 4. Test Chat Flow
1. Navigate to http://localhost:3000/scraper
2. Type: "healthcare SaaS companies in USA"
3. **Expected**: AI responds with ICP questions and eventually shows expanded keywords
4. **Wrong**: Fixed response asking "What industry are you targeting?"

---

## 🔍 How Chat Should Work

### Correct Flow:
```
User: "oil and gas, dubai"
     ↓
Frontend calls: mayaAIService.chat(message, history, [])
     ↓
Calls: POST http://localhost:3004/api/ai-icp-assistant/chat
     ↓
Backend AI processes message
     ↓
AI extracts: industry="oil and gas", location="dubai"
     ↓
AI expands keywords: "oil and gas, petroleum industry, energy sector..."
     ↓
Returns: { message: "Great! I found...", searchReady: true, searchParams: {...} }
     ↓
Frontend displays AI response with expanded keywords
```

### Current (Broken) Flow:
```
User: "oil and gas, dubai"
     ↓
Frontend uses OLD CACHED mayaAIService
     ↓
Shows hardcoded: "What industry are you targeting?"
     ❌ Never calls backend
```

---

## 🧪 Quick Test

### Test 1: Backend Endpoint
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.com", "password": "password123"}' | jq -r '.token')

# Test AI chat
curl -X POST http://localhost:3004/api/ai-icp-assistant/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "oil and gas companies in dubai"}' | jq '.'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Great! I can help you find oil and gas companies in Dubai...",
  "icpData": {
    "industry": "oil and gas",
    "location": "dubai"
  },
  "searchReady": false
}
```

### Test 2: Frontend (After Restart)
1. Open: http://localhost:3000/scraper
2. Open DevTools Console (F12)
3. Type message in chat
4. Check Console for:
   - `POST http://localhost:3004/api/ai-icp-assistant/chat` request
   - Response from backend
   - No errors

---

## 📋 Checklist

- [ ] Backend running on port 3004
- [ ] Backend has OpenAI API key configured
- [ ] Frontend restarted (npm run dev)
- [ ] Browser cache cleared
- [ ] Chat sends requests to `http://localhost:3004/api/ai-icp-assistant/chat`
- [ ] AI responses come from backend (not hardcoded)
- [ ] Expanded keywords display in chat (purple chips)

---

## 🔧 Troubleshooting

### Issue: Still showing hardcoded responses
**Solution**:
1. Fully stop frontend (Ctrl+C)
2. Delete `.next` folder: `rm -rf lad_ui/.next`
3. Restart: `cd lad_ui && npm run dev`
4. Hard refresh browser

### Issue: "Network Error" in console
**Solution**:
- Check backend is running: `lsof -ti:3004`
- Check backend logs: `tail -f /tmp/backend.log`
- Verify CORS settings in backend

### Issue: "Invalid token" error
**Solution**:
```bash
# Login to get fresh token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.com", "password": "password123"}'
```

### Issue: Keyword expansion not showing
**Solution**:
- Ensure `OPENAI_API_KEY` is set in `backend/.env`
- Check backend logs for "No AI API key configured"
- Restart backend if .env was updated

---

## 📊 Verification

### Success Indicators:
✅ DevTools Network tab shows POST to `/api/ai-icp-assistant/chat`  
✅ Chat responses are contextual (not fixed)  
✅ Expanded keywords show in purple chips  
✅ Search parameters extracted correctly  
✅ No "What industry are you targeting?" when already provided  

### Failure Indicators:
❌ Fixed "What industry..." response every time  
❌ No network requests in DevTools  
❌ Backend not receiving chat requests  
❌ Frontend console shows errors  

---

## 🚀 Next Steps After Fix

1. Test full chat → expand keywords → Apollo search flow
2. Verify keyword chips display correctly
3. Test lead enrichment feature
4. Run full test suite: `cd tests && ./run-all-tests.sh`

---

**Last Updated**: December 19, 2025  
**Status**: Awaiting frontend restart
