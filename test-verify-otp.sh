#!/bin/bash

# Test script for LinkedIn OTP verification endpoint
# Usage: ./test-verify-otp.sh <otp_code> [account_id]

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3004"
PLATFORM="linkedin"

# Check if OTP is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: OTP code is required${NC}"
    echo "Usage: $0 <otp_code> [account_id]"
    echo ""
    echo "Example:"
    echo "  $0 123456"
    echo "  $0 123456 d435cc94-6141-4cca-b5e0-9dcc9aa6126f"
    echo "  $0 123456 4i_CCkI4RKi65CP_H7KBbw"
    exit 1
fi

OTP_CODE="$1"
ACCOUNT_ID="$2"

# Default test credentials (adjust as needed)
EMAIL="admin@demo.com"
PASSWORD="password123"

echo -e "${YELLOW}=== LinkedIn OTP Verification Test ===${NC}"
echo ""

# Step 1: Get auth token
echo -e "${YELLOW}Step 1: Getting authentication token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}Failed to get authentication token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo ""

# Step 2: Get LinkedIn accounts (if account_id not provided)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${YELLOW}Step 2: Getting LinkedIn accounts...${NC}"
    ACCOUNTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/social-integration/linkedin/accounts" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Accounts response:"
    echo "$ACCOUNTS_RESPONSE" | jq '.'
    echo ""
    
    # Try to find a checkpoint account
    CHECKPOINT_ACCOUNT_ID=$(echo "$ACCOUNTS_RESPONSE" | jq -r '.accounts[]? | select(.status == "checkpoint") | .id // .provider_account_id // empty' | head -1)
    
    if [ -n "$CHECKPOINT_ACCOUNT_ID" ]; then
        ACCOUNT_ID="$CHECKPOINT_ACCOUNT_ID"
        echo -e "${GREEN}✓ Found checkpoint account: $ACCOUNT_ID${NC}"
    else
        # Use first account if available
        FIRST_ACCOUNT_ID=$(echo "$ACCOUNTS_RESPONSE" | jq -r '.accounts[0]?.id // .accounts[0]?.provider_account_id // empty')
        if [ -n "$FIRST_ACCOUNT_ID" ]; then
            ACCOUNT_ID="$FIRST_ACCOUNT_ID"
            echo -e "${YELLOW}⚠ No checkpoint account found, using first account: $ACCOUNT_ID${NC}"
        else
            echo -e "${RED}Error: No accounts found. Please provide account_id manually.${NC}"
            exit 1
        fi
    fi
    echo ""
fi

# Step 3: Verify OTP
echo -e "${YELLOW}Step 3: Verifying OTP...${NC}"
echo "OTP Code: $OTP_CODE"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Prepare request body
REQUEST_BODY=$(jq -n \
  --arg otp "$OTP_CODE" \
  --arg account_id "$ACCOUNT_ID" \
  '{otp: $otp, account_id: $account_id}')

echo "Request:"
echo "$REQUEST_BODY" | jq '.'
echo ""

VERIFY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/social-integration/$PLATFORM/verify-otp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")

HTTP_STATUS=$(echo "$VERIFY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '/HTTP_STATUS/d')

echo -e "${YELLOW}Response (HTTP $HTTP_STATUS):${NC}"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ OTP verification successful!${NC}"
    
    # Check if it was actually successful
    SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success // false')
    if [ "$SUCCESS" == "true" ]; then
        echo -e "${GREEN}✓ Account verified and activated${NC}"
    fi
else
    echo -e "${RED}✗ OTP verification failed${NC}"
    
    # Extract error message
    ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null)
    echo -e "${RED}Error: $ERROR_MSG${NC}"
fi

echo ""

