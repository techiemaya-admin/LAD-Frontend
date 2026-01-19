#!/bin/bash

# Lead Enrichment Feature Test Script
# Tests AI-powered lead filtering and enrichment

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🎯 LEAD ENRICHMENT FEATURE TEST                        ║"
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

# Test 1: Analyze a website
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Test 1: Website Analysis"
echo "Testing: https://stripe.com"
echo ""

ANALYZE_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/lead-enrichment/analyze-website \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "website": "https://stripe.com",
    "icp": {
      "industry": "fintech",
      "keywords": "payment processing, financial technology"
    }
  }')

ANALYZE_SUCCESS=$(echo $ANALYZE_RESPONSE | jq -r '.success')

if [ "$ANALYZE_SUCCESS" == "true" ]; then
  RELEVANCE=$(echo $ANALYZE_RESPONSE | jq -r '.data.relevanceScore')
  echo "✅ Analysis successful"
  echo "📊 Relevance Score: $RELEVANCE/10"
  echo ""
  echo "💡 AI Reasoning:"
  echo $ANALYZE_RESPONSE | jq -r '.data.reasoning' | fold -w 70 -s | sed 's/^/   /'
else
  echo "❌ Analysis failed"
  echo $ANALYZE_RESPONSE | jq '.'
fi

echo ""
sleep 2

# Test 2: Enrich leads (small batch)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Test 2: Lead Enrichment (Batch)"
echo ""

ENRICH_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/lead-enrichment/enrich \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "id": "1",
        "name": "Stripe",
        "website": "https://stripe.com"
      },
      {
        "id": "2",
        "name": "Square",
        "website": "https://squareup.com"
      }
    ],
    "icp": {
      "industry": "fintech",
      "keywords": "payment processing, financial technology, digital payments"
    }
  }')

ENRICH_SUCCESS=$(echo $ENRICH_RESPONSE | jq -r '.success')

if [ "$ENRICH_SUCCESS" == "true" ]; then
  TOTAL=$(echo $ENRICH_RESPONSE | jq -r '.data.totalLeads')
  ENRICHED=$(echo $ENRICH_RESPONSE | jq -r '.data.enrichedCount')
  
  echo "✅ Enrichment successful"
  echo "📊 Processed: $ENRICHED/$TOTAL leads"
  echo ""
  echo "🎯 Enriched Leads:"
  echo $ENRICH_RESPONSE | jq -r '.data.enrichedLeads[] | "  - \(.name): Score \(.relevanceScore)/10"'
else
  echo "❌ Enrichment failed"
  echo $ENRICH_RESPONSE | jq '.'
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            ✅ LEAD ENRICHMENT TESTS COMPLETED                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
