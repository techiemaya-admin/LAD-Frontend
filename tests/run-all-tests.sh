#!/bin/bash

# Master Test Runner
# Executes all test scripts in sequence

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║              🧪 RUNNING ALL FEATURE TESTS                      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3004"}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export BASE_URL

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
SKIPPED=0

# Function to run a test
run_test() {
  local test_name=$1
  local test_script=$2
  
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "Running: $test_name"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  
  if [ -f "$test_script" ]; then
    bash "$test_script"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ $test_name PASSED${NC}"
      ((PASSED++))
    else
      echo -e "${RED}❌ $test_name FAILED${NC}"
      ((FAILED++))
    fi
  else
    echo -e "${YELLOW}⚠️  $test_name SKIPPED (script not found)${NC}"
    ((SKIPPED++))
  fi
  
  sleep 2
}

# Check if backend is running
echo "Checking backend availability..."
if curl -s -f "${BASE_URL}/health" > /dev/null 2>&1; then
  echo "✅ Backend is running at ${BASE_URL}"
else
  echo "⚠️  Backend health check failed at ${BASE_URL}"
  echo "   Make sure the backend is running on port 3004"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo "Starting test suite..."
sleep 2

# Run all tests in order
run_test "Authentication" "${SCRIPT_DIR}/auth-test.sh"
run_test "Keyword Expansion" "${SCRIPT_DIR}/keyword-expansion-test.sh"
run_test "AI ICP Assistant" "${SCRIPT_DIR}/ai-icp-assistant-test.sh"
run_test "Apollo Leads" "${SCRIPT_DIR}/apollo-leads-test.sh"
run_test "Lead Enrichment" "${SCRIPT_DIR}/lead-enrichment-test.sh"

# Summary
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║                   📊 TEST SUITE SUMMARY                        ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED ($PASSED/$TOTAL)${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED ($FAILED/$TOTAL)${NC}"
  exit 1
fi
