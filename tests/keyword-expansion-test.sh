#!/bin/bash

# Keyword Expansion Feature Test Script
# Tests the AI-powered keyword expansion functionality

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🧪 KEYWORD EXPANSION FEATURE TEST                       ║"
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
  echo "❌ Authentication failed. Run auth-test.sh first."
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Test cases
declare -a topics=("healthcare SaaS" "fintech startups" "e-commerce platforms" "AI/ML consulting" "cybersecurity services")

for topic in "${topics[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📍 Testing: '$topic'"
  echo ""
  
  RESPONSE=$(curl -s -X POST ${BASE_URL}/api/ai-icp-assistant/expand-keywords \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"topic\": \"$topic\"}")
  
  SUCCESS=$(echo $RESPONSE | jq -r '.success')
  
  if [ "$SUCCESS" == "true" ]; then
    KEYWORD_COUNT=$(echo $RESPONSE | jq -r '.keywords | length')
    echo "✅ Expansion successful"
    echo "📊 Generated $KEYWORD_COUNT keywords"
    echo ""
    echo "🎯 Top 10 Keywords:"
    echo $RESPONSE | jq -r '.keywords[0:10][]' | nl -w2 -s'. '
    
    if [ $KEYWORD_COUNT -lt 10 ]; then
      echo "⚠️  Warning: Less than 10 keywords generated"
    fi
  else
    echo "❌ Expansion failed"
    echo $RESPONSE | jq '.'
    exit 1
  fi
  
  echo ""
  sleep 1  # Rate limiting
done

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ ALL KEYWORD EXPANSION TESTS PASSED             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
