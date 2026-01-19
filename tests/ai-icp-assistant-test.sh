#!/bin/bash

# AI ICP Assistant Test Script
# Tests conversational ICP definition

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          💬 AI ICP ASSISTANT FEATURE TEST                      ║"
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

# Test 1: Start conversation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Test 1: Start Conversation"
echo "User: 'I'm looking for healthcare SaaS companies'"
echo ""

CHAT1=$(curl -s -X POST ${BASE_URL}/api/ai-icp-assistant/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I am looking for healthcare SaaS companies in USA with 50-200 employees"}')

SUCCESS1=$(echo $CHAT1 | jq -r '.success')

if [ "$SUCCESS1" == "true" ]; then
  echo "✅ Chat successful"
  echo ""
  echo "🤖 AI Response:"
  echo $CHAT1 | jq -r '.message' | fold -w 70 -s | sed 's/^/   /'
  echo ""
  
  SEARCH_READY=$(echo $CHAT1 | jq -r '.searchReady')
  if [ "$SEARCH_READY" == "true" ]; then
    echo "✅ ICP Complete - Search Ready!"
    echo ""
    echo "📋 Search Parameters:"
    echo $CHAT1 | jq '.searchParams'
  else
    echo "ℹ️  ICP Incomplete - More information needed"
  fi
else
  echo "❌ Chat failed"
  echo $CHAT1 | jq '.'
  exit 1
fi

echo ""
sleep 2

# Test 2: Reset conversation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Test 2: Reset Conversation"
echo ""

RESET=$(curl -s -X POST ${BASE_URL}/api/ai-icp-assistant/reset \
  -H "Authorization: Bearer $TOKEN")

RESET_SUCCESS=$(echo $RESET | jq -r '.success')

if [ "$RESET_SUCCESS" == "true" ]; then
  echo "✅ Conversation reset successful"
else
  echo "❌ Reset failed"
  echo $RESET | jq '.'
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           ✅ AI ICP ASSISTANT TESTS COMPLETED                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
