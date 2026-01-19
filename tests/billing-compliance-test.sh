#!/bin/bash

# LAD Billing Architecture Compliance Validation
# Tests all architectural rules are enforced

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 LAD Billing Architecture Compliance Validation"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "📋 Test 1: No direct fetch() in web billing components"
echo "------------------------------------------------------"
cd "$WORKSPACE_DIR/frontend/web/src/components"
FETCH_COUNT=$(grep -r "fetch(" . --include="*.tsx" --include="*.ts" 2>/dev/null | grep -E "(billing|wallet|credit)" | grep -v "// " | wc -l | tr -d ' ')
if [ "$FETCH_COUNT" -eq 0 ]; then
    check_pass "No direct fetch() calls in billing components"
else
    check_fail "Found $FETCH_COUNT fetch() calls in billing components"
    grep -rn "fetch(" . --include="*.tsx" --include="*.ts" 2>/dev/null | grep -E "(billing|wallet|credit)" | head -5
fi
echo ""

echo "📋 Test 2: No axios direct usage in web components"
echo "---------------------------------------------------"
AXIOS_COUNT=$(grep -r "axios\." "$WORKSPACE_DIR/frontend/web/src/components" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -E "(billing|wallet|credit)" | wc -l | tr -d ' ')
if [ "$AXIOS_COUNT" -eq 0 ]; then
    check_pass "No direct axios usage in billing components"
else
    check_fail "Found $AXIOS_COUNT axios direct calls in billing components"
fi
echo ""

echo "📋 Test 3: No service layer files in web directory"
echo "---------------------------------------------------"
SERVICE_FILES=$(find "$WORKSPACE_DIR/frontend/web/src" -type f -name "*billingService*" -o -name "*BillingService*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SERVICE_FILES" -eq 0 ]; then
    check_pass "No billing service files in web layer"
else
    check_fail "Found $SERVICE_FILES service files in web layer (wrong layer)"
    find "$WORKSPACE_DIR/frontend/web/src" -type f -name "*billingService*" -o -name "*BillingService*" 2>/dev/null
fi
echo ""

echo "📋 Test 4: All SDK hooks use React Query"
echo "-----------------------------------------"
cd "$WORKSPACE_DIR/frontend/sdk/features/billing"
HOOK_FILE="hooks.ts"
if [ -f "$HOOK_FILE" ]; then
    # Check hooks.ts imports useQuery or useMutation
    if grep -q "useQuery\|useMutation" "$HOOK_FILE"; then
        check_pass "SDK hooks use React Query"
    else
        check_fail "SDK hooks don't import React Query"
    fi
    
    # Check no useState/useEffect in hooks
    STATE_COUNT=$(grep -c "useState\|useEffect" "$HOOK_FILE" 2>/dev/null || echo 0)
    if [ "$STATE_COUNT" -eq 0 ]; then
        check_pass "SDK hooks don't use useState/useEffect"
    else
        check_warn "Found $STATE_COUNT useState/useEffect in SDK hooks (should use React Query)"
    fi
else
    check_fail "SDK hooks.ts not found"
fi
echo ""

echo "📋 Test 5: API client has hard tenant enforcement"
echo "--------------------------------------------------"
API_CLIENT="$WORKSPACE_DIR/frontend/sdk/shared/apiClient.ts"
if [ -f "$API_CLIENT" ]; then
    if grep -q "enforceTenantContext" "$API_CLIENT"; then
        check_pass "API client has enforceTenantContext method"
    else
        check_fail "API client missing enforceTenantContext method"
    fi
    
    if grep -q "X-Tenant-Id" "$API_CLIENT"; then
        check_pass "API client sets X-Tenant-Id header"
    else
        check_fail "API client doesn't set X-Tenant-Id header"
    fi
    
    if grep -q "throw new Error" "$API_CLIENT" | grep -q "Tenant context"; then
        check_pass "API client throws on missing tenant context"
    else
        check_warn "API client may not throw on missing tenant context"
    fi
else
    check_fail "API client not found at $API_CLIENT"
fi
echo ""

echo "📋 Test 6: Backend has repository pattern"
echo "------------------------------------------"
REPO_FILE="$WORKSPACE_DIR/backend/core/billing/repositories/billingRepo.js"
SERVICE_FILE="$WORKSPACE_DIR/backend/core/billing/services/billingService.js"

if [ -f "$REPO_FILE" ]; then
    check_pass "Billing repository exists"
    
    # Check repo has SQL queries
    QUERY_COUNT=$(grep -c "query(" "$REPO_FILE" 2>/dev/null || echo 0)
    if [ "$QUERY_COUNT" -gt 0 ]; then
        check_pass "Repository contains SQL queries ($QUERY_COUNT found)"
    else
        check_fail "Repository has no SQL queries"
    fi
else
    check_fail "Billing repository not found"
fi

if [ -f "$SERVICE_FILE" ]; then
    check_pass "Billing service exists"
    
    # Check service has no inline SQL (should delegate to repo)
    INLINE_SQL=$(grep -c "SELECT\|INSERT\|UPDATE\|DELETE" "$SERVICE_FILE" 2>/dev/null || echo 0)
    if [ "$INLINE_SQL" -eq 0 ]; then
        check_pass "Service has no inline SQL (delegates to repository)"
    else
        check_warn "Service contains $INLINE_SQL SQL statements (should use repository)"
    fi
else
    check_fail "Billing service not found"
fi
echo ""

echo "📋 Test 7: Credits-based naming in public SDK"
echo "----------------------------------------------"
SDK_INDEX="$WORKSPACE_DIR/frontend/sdk/features/billing/index.ts"
if [ -f "$SDK_INDEX" ]; then
    if grep -q "useCreditsBalance\|CreditsBalance" "$SDK_INDEX"; then
        check_pass "SDK exports credits-based names"
    else
        check_fail "SDK doesn't export credits-based names"
    fi
    
    if grep -q "useWalletBalance.*useCreditsBalance\|WalletBalance.*CreditsBalance" "$SDK_INDEX"; then
        check_pass "SDK provides backward compatibility aliases"
    else
        check_warn "SDK may not provide backward compat aliases"
    fi
else
    check_fail "SDK index.ts not found"
fi
echo ""

echo "📋 Test 8: AuthContext has tenant features split"
echo "-------------------------------------------------"
AUTH_CONTEXT="$WORKSPACE_DIR/frontend/web/src/contexts/AuthContext.tsx"
if [ -f "$AUTH_CONTEXT" ]; then
    if grep -q "tenantFeatures" "$AUTH_CONTEXT"; then
        check_pass "AuthContext has tenantFeatures"
    else
        check_fail "AuthContext missing tenantFeatures"
    fi
    
    if grep -q "capabilities.*string\[\]" "$AUTH_CONTEXT"; then
        check_pass "AuthContext has capabilities array"
    else
        check_fail "AuthContext missing capabilities"
    fi
    
    if grep -q "hasFeature\|hasCapability" "$AUTH_CONTEXT"; then
        check_pass "AuthContext has feature/capability check methods"
    else
        check_fail "AuthContext missing check methods"
    fi
    
    if grep -q "activeTenantId\|switchTenant" "$AUTH_CONTEXT"; then
        check_pass "AuthContext supports multi-tenant switching"
    else
        check_warn "AuthContext may not support tenant switching"
    fi
else
    check_fail "AuthContext not found"
fi
echo ""

echo "📋 Test 9: Guard components exist"
echo "----------------------------------"
if [ -f "$WORKSPACE_DIR/frontend/web/src/components/RequireCapability.tsx" ]; then
    check_pass "RequireCapability guard component exists"
else
    check_fail "RequireCapability guard component missing"
fi

if [ -f "$WORKSPACE_DIR/frontend/web/src/components/RequireFeature.tsx" ]; then
    check_pass "RequireFeature guard component exists"
else
    check_fail "RequireFeature guard component missing"
fi
echo ""

echo "📋 Test 10: Required UI components exist"
echo "-----------------------------------------"
if [ -f "$WORKSPACE_DIR/frontend/web/src/components/billing/PricingCatalog.tsx" ]; then
    check_pass "PricingCatalog component exists"
else
    check_fail "PricingCatalog component missing"
fi

if [ -f "$WORKSPACE_DIR/frontend/web/src/components/billing/UsageBreakdown.tsx" ]; then
    check_pass "UsageBreakdown component exists"
else
    check_fail "UsageBreakdown component missing"
fi

if [ -f "$WORKSPACE_DIR/frontend/web/src/components/billing/TransactionHistory.tsx" ]; then
    check_pass "TransactionHistory component exists"
else
    check_fail "TransactionHistory component missing"
fi
echo ""

echo "📋 Test 11: Usage events store pricing snapshot"
echo "------------------------------------------------"
MIGRATION_FILE="$WORKSPACE_DIR/backend/migrations/20251227_001_create_billing_tables.sql"
if [ -f "$MIGRATION_FILE" ]; then
    if grep -q "usage_items.*JSONB" "$MIGRATION_FILE"; then
        check_pass "Usage events have JSONB usage_items column"
    else
        check_fail "Usage events missing usage_items JSONB column"
    fi
    
    if grep -q "unit_price.*cost" "$MIGRATION_FILE" | head -1 | grep -q "usage_items"; then
        check_pass "Usage items schema includes pricing snapshot (unit_price, cost)"
    else
        check_warn "Verify usage_items stores unit_price and cost for historical accuracy"
    fi
else
    check_fail "Billing migration file not found"
fi

# Check service actually stores unit_price
if grep -q "unitPrice.*price.unitPrice" "$SERVICE_FILE" 2>/dev/null; then
    check_pass "Billing service stores unitPrice in usage events"
else
    check_warn "Verify billing service stores unitPrice"
fi
echo ""

echo "📋 Test 12: Backend validates tenant context"
echo "---------------------------------------------"
ROUTES_FILE="$WORKSPACE_DIR/backend/core/billing/routes/billing.routes.js"
if [ -f "$ROUTES_FILE" ]; then
    if grep -q "requireTenantContext" "$ROUTES_FILE"; then
        check_pass "Billing routes use requireTenantContext middleware"
    else
        check_fail "Billing routes missing tenant context middleware"
    fi
    
    if grep -q "requireBillingView\|requireBillingAdmin" "$ROUTES_FILE"; then
        check_pass "Billing routes have capability guards"
    else
        check_warn "Billing routes may be missing capability guards"
    fi
else
    check_fail "Billing routes file not found"
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Validation Summary"
echo "=================================================="
TOTAL=$((PASS + FAIL))
PASS_RATE=$((PASS * 100 / TOTAL))

echo -e "${GREEN}PASS: $PASS${NC}"
echo -e "${RED}FAIL: $FAIL${NC}"
echo "TOTAL: $TOTAL"
echo "PASS RATE: ${PASS_RATE}%"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✅ All compliance checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAIL compliance check(s) failed${NC}"
    echo ""
    echo "Review the failures above and fix architectural violations."
    exit 1
fi
