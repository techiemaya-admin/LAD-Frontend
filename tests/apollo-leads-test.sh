#!/bin/bash

# Apollo Leads Feature Test Script
# Tests Apollo.io integration for lead generation

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🚀 APOLLO LEADS FEATURE TEST                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL=${BASE_URL:-"http://localhost:3004"}

# Get authentication token
if [ -f /tmp/test_token.txt ]; then
  TOKEN=$(cat /tmp/test_token.txt)
  echo "📝 Using saved token"
else
  echo "📝 Getting fresh token..."
  TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@demo.com", "password": "password123"}' | jq -r '.token')
fi

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Test 1: Search companies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Test 1: Company Search (Healthcare in USA)"
echo ""

SEARCH_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/apollo-leads/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["healthcare", "medical"],
    "location": "United States",
    "page": 1,
    "perPage": 5
  }')

SEARCH_SUCCESS=$(echo $SEARCH_RESPONSE | jq -r '.success')

if [ "$SEARCH_SUCCESS" == "true" ]; then
  COMPANY_COUNT=$(echo $SEARCH_RESPONSE | jq -r '.data.accounts | length')
  echo "✅ Search successful"
  echo "📊 Found $COMPANY_COUNT companies"
  echo ""
  
  if [ $COMPANY_COUNT -gt 0 ]; then
    echo "🏢 Sample Companies:"
    echo $SEARCH_RESPONSE | jq -r '.data.accounts[0:3][] | "  - \(.name) (\(.website_url // "no website"))"'
    
    # Save first company ID for next test
    COMPANY_ID=$(echo $SEARCH_RESPONSE | jq -r '.data.accounts[0].id')
    echo ""
    echo "💾 Sample Company ID: $COMPANY_ID"
  fi
else
  echo "❌ Search failed"
  echo $SEARCH_RESPONSE | jq '.'
  exit 1
fi

echo ""
sleep 2

# Test 2: Get company details (if we have an ID)
if [ ! -z "$COMPANY_ID" ] && [ "$COMPANY_ID" != "null" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📍 Test 2: Get Company Details"
  echo ""
  
  DETAIL_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/apollo-leads/company/${COMPANY_ID}" \
    -H "Authorization: Bearer $TOKEN")
  
  DETAIL_SUCCESS=$(echo $DETAIL_RESPONSE | jq -r '.success')
  
  if [ "$DETAIL_SUCCESS" == "true" ]; then
    echo "✅ Company details retrieved"
    echo ""
    echo $DETAIL_RESPONSE | jq -r '.data | "Company: \(.name)\nWebsite: \(.website_url // "N/A")\nLocation: \(.city // "N/A"), \(.state // "N/A")\nIndustry: \(.industry // "N/A")"'
  else
    echo "⚠️  Could not retrieve company details"
  fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ APOLLO LEADS TESTS COMPLETED                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
