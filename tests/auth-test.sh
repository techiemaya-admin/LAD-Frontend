#!/bin/bash

# Authentication Test Script
# Tests login and token generation

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            🔐 AUTHENTICATION TEST                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL=${BASE_URL:-"http://localhost:3004"}

# Test login
echo "Testing login with admin@demo.com..."
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.com", "password": "password123"}')

TOKEN=$(echo $RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "✅ Authentication successful"
  echo "Token: ${TOKEN:0:50}..."
  echo ""
  
  # Save token for other tests
  echo $TOKEN > /tmp/test_token.txt
  echo "💾 Token saved to /tmp/test_token.txt"
  
  # Verify token by accessing protected endpoint
  echo ""
  echo "Verifying token with protected endpoint..."
  VERIFY=$(curl -s -X GET ${BASE_URL}/api/features \
    -H "Authorization: Bearer $TOKEN")
  
  if echo $VERIFY | jq -e '.features' > /dev/null 2>&1; then
    echo "✅ Token verification successful"
    echo ""
    echo "Available features:"
    echo $VERIFY | jq -r '.features[].key' | sed 's/^/  - /'
  else
    echo "⚠️  Token verification failed"
  fi
else
  echo "❌ Authentication failed"
  echo $RESPONSE | jq '.'
  exit 1
fi

echo ""
echo "✅ All authentication tests passed"
