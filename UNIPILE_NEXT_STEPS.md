# 🚀 Unipile API Update - Next Steps Checklist

## ✅ What's Been Done

### Backend Services Updated
- [x] `UnipileLeadSearchService.js` - Updated with correct API format
- [x] `searchCompanies()` - Now uses proper nested filter structure
- [x] `searchPeople()` - Enhanced with all supported filters
- [x] `lookupLocationId()` - Helper method to convert location names to IDs
- [x] `lookupSkillId()` - Helper method to convert skill names to IDs
- [x] Common location cache - Pre-loaded with major locations
- [x] Common skill cache - Pre-loaded with major skills

### Documentation Created
- [x] `UNIPILE_IMPLEMENTATION_GUIDE.md` - Complete implementation reference
- [x] `test-unipile-updated.sh` - Interactive testing script

---

## ⏳ Next Steps

### Phase 1: Restart Backend & Initial Test (5 minutes)

```bash
# 1. Restart your backend server
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/backend
npm run dev

# 2. Verify server starts without errors
# Look for: "Server running on port 3004"
# Look for: No syntax errors in UnipileLeadSearchService.js
```

**Success Indicator**: Server starts cleanly, no errors in console.

---

### Phase 2: Gather Required Information (10 minutes)

**You Need**:
1. **LinkedIn Account ID** - The numeric ID of the account connected to Unipile
   - Contact Unipile support to get this
   - Format: Some numeric ID (not the DSN)

2. **JWT Token** (for backend testing)
   - From your app's authentication system
   - Used to call backend endpoints

3. **Location IDs** (for filtering)
   - Pre-loaded locations available: Dubai, NYC, London, etc.
   - For other locations, use the location lookup endpoint

4. **Skill IDs** (for filtering)
   - Pre-loaded skills available: Python, JavaScript, Java, etc.
   - For other skills, system treats them as keywords

---

### Phase 3: Test Direct Unipile API (5-10 minutes)

```bash
# Option A: Using the automated test script
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/backend
./test-unipile-updated.sh
# Select: 1) Test Unipile API Connection
# Enter: Your account ID when prompted

# Option B: Manual curl test
curl --request POST \
  --url "https://api8.unipile.com:13811/api/v1/linkedin/search?account_id=YOUR_ACCOUNT_ID" \
  --header 'X-API-KEY: poLlMrjE.NIyt0ZpXx8uGfdjo+TGMrsohgnwvYYwRTKvp9zph2eg=' \
  --header 'Content-Type: application/json' \
  --data '{
    "api": "recruiter",
    "category": "companies",
    "keywords": "technology",
    "limit": 5
  }' | jq '.'
```

**Success Indicator**: 
- Response status is 200
- Response includes company data or empty results (not an error)

**Troubleshooting**:
- 401: Check API key is correct
- 404: Check account ID is correct
- 400: Check filter structure matches spec

---

### Phase 4: Test Backend Endpoints (5-10 minutes)

```bash
# Set up environment variables
export JWT_TOKEN="your_jwt_token"
export BACKEND_URL="http://localhost:3004"

# Option A: Using test script
./test-unipile-updated.sh
# Select: 2) Test Backend searchCompanies Endpoint
# Select: 3) Test Backend searchPeople Endpoint

# Option B: Manual curl
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/companies \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": "technology",
    "industry": "4",
    "location": "103644883",
    "accountId": "your_account_id",
    "limit": 5
  }' | jq '.'
```

**Success Indicator**:
- Response shows `"success": true`
- Response includes companies in results
- Count matches number of results

---

### Phase 5: Update Location Mappings (5 minutes)

If you need locations not in the pre-loaded cache:

```bash
# Look up a location ID from Unipile
curl --request GET \
  --url "https://api8.unipile.com:13811/api/v1/linkedin/search/parameters?type=LOCATION&keyword=San%20Francisco" \
  --header 'X-API-KEY: poLlMrjE.NIyt0ZpXx8uGfdjo+TGMrsohgnwvYYwRTKvp9zph2eg=' \
  --header 'accept: application/json' | jq '.'
```

Then update `UnipileLeadSearchService.js`:
1. Find the `commonLocations` object in `lookupLocationId()`
2. Add your new location: `"san francisco": "xxxxxxx"`
3. Restart backend

---

### Phase 6: Update Frontend (15-30 minutes)

1. **Update campaign builder** to use new API parameters:
   - Show pre-loaded location options
   - Show pre-loaded skill options
   - Or allow free-text entry for location/skill lookup

2. **Update API calls** to pass correct parameters:
   - `accountId` (required - the LinkedIn account ID)
   - `keywords` (optional - search keywords)
   - `industry` (optional - use ID "4" for Technology)
   - `location` (optional - use location ID or name for lookup)
   - `limit` (optional - default 50)

3. **Example Frontend Integration**:
```javascript
const searchResults = await fetch('/api/apollo-leads/unipile/search/companies', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    accountId: 'your-account-id',
    keywords: userInput.keywords,
    industry: '4',
    location: '103644883',  // or lookup first
    limit: 25
  })
});
```

---

## 📋 Testing Checklist

Use this checklist to track your testing:

- [ ] Backend server restarts cleanly
- [ ] Backend has no JavaScript errors on load
- [ ] Unipile direct API test returns 200 status
- [ ] Unipile direct API returns company data (or empty array)
- [ ] Backend searchCompanies endpoint returns `"success": true`
- [ ] Backend searchCompanies returns company objects with data
- [ ] Backend searchPeople endpoint returns `"success": true`
- [ ] Backend searchPeople returns people objects with data
- [ ] Location lookup works for at least one location
- [ ] Skill lookup works for at least one skill
- [ ] Frontend displays results from API
- [ ] Campaign creation with Unipile filters works

---

## 🐛 Debugging

If tests fail, check:

### 1. Backend Server Issues
```bash
# Check server is running
curl http://localhost:3004/health

# Check for errors
npm run dev 2>&1 | grep -i error
```

### 2. API Key/Account ID Issues
```bash
# Verify API key is in .env
grep UNIPILE_API_KEY /Users/naveenreddy/Desktop/AI-Maya/LAD/backend/.env

# Verify account ID format
echo "Your account ID should be a number like: 123456789"
```

### 3. Filter Structure Issues
Check that:
- Industry is: `{include: ["4"]}` not just `"4"`
- Location is: `[{id: "103644883", priority: "CAN_HAVE"}]` not just `"103644883"`
- Skills can be: `{id: "185"}` or `{keywords: "Python"}`

### 4. Response Issues
```bash
# Check actual response from Unipile
# Add verbose logging to backend:
DEBUG=unipile:* npm run dev
```

---

## 📞 Support Resources

### If API Returns Errors

**404 Error**: Wrong location ID
- Use `./test-unipile-updated.sh` → Option 4 to lookup location
- Or check Unipile documentation for correct location IDs

**400 Error**: Wrong filter structure
- Check `UNIPILE_IMPLEMENTATION_GUIDE.md` for exact format
- Verify `industry.include`, `location` object structure

**401 Error**: Wrong API key
- Check key in backend/.env
- Contact Unipile to regenerate if needed

**No Results**: Filters too restrictive
- Try removing industry filter first
- Use just keywords to test basic search

### Contact Unipile
- Get account ID: support@unipile.com
- Get location IDs: documentation or API lookup
- API issues: help@unipile.com

---

## 📊 After Testing is Complete

Once all tests pass:

1. **Update Frontend** to use new search parameters
2. **Test end-to-end** campaign creation → search → results
3. **Monitor in production** for any API issues
4. **Update documentation** if you change filter logic
5. **Keep location/skill caches** updated as you discover new IDs

---

## 📝 File Reference

- `UnipileLeadSearchService.js` - Main service with updated methods
- `UNIPILE_IMPLEMENTATION_GUIDE.md` - Detailed implementation docs
- `test-unipile-updated.sh` - Automated testing script
- `UNIPILE_RECRUITER_API_SPEC.md` - Official API specification

---

**Status**: ✅ Backend Code Updated - Ready for Testing
**Last Updated**: January 18, 2026
**Time to Complete All Phases**: ~30-45 minutes
