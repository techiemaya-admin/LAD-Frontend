#!/bin/bash

# LAD Console Violations Fixer
# Systematically fixes console.log/error/warn violations in production code

echo "🔍 LAD Console Violations Fixer"
echo "================================"
echo ""

# Production directories (excluding scripts)
PROD_DIRS=(
  "backend/features"
  "backend/shared"
  "backend/core"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Count violations by type
count_violations() {
  local dir=$1
  local log_count=$(grep -r "console\.log" $dir --include="*.js" | wc -l)
  local error_count=$(grep -r "console\.error" $dir --include="*.js" | wc -l)
  local warn_count=$(grep -r "console\.warn" $dir --include="*.js" | wc -l)
  
  echo "$log_count $error_count $warn_count"
}

# Scan for violations
echo "📊 Scanning for console violations..."
echo ""

total_log=0
total_error=0
total_warn=0

for dir in "${PROD_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    read log_count error_count warn_count <<< $(count_violations $dir)
    total_log=$((total_log + log_count))
    total_error=$((total_error + error_count))
    total_warn=$((total_warn + warn_count))
    
    total=$((log_count + error_count + warn_count))
    if [ $total -gt 0 ]; then
      echo -e "${RED}❌ $dir${NC}"
      echo "   - console.log: $log_count"
      echo "   - console.error: $error_count"
      echo "   - console.warn: $warn_count"
      echo "   Total: $total"
      echo ""
    else
      echo -e "${GREEN}✅ $dir - Clean!${NC}"
      echo ""
    fi
  fi
done

grand_total=$((total_log + total_error + total_warn))

echo "================================"
echo "📈 TOTAL VIOLATIONS: $grand_total"
echo "   - console.log: $total_log"
echo "   - console.error: $total_error"
echo "   - console.warn: $total_warn"
echo ""

if [ $grand_total -eq 0 ]; then
  echo -e "${GREEN}🎉 All production code is console-free!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Production code has console violations${NC}"
  echo ""
  echo "🔧 To see detailed locations, run:"
  echo "   grep -rn 'console\\.log\\|console\\.error\\|console\\.warn' backend/features backend/shared backend/core --include='*.js'"
  echo ""
  echo "💡 Recommended: Replace with logger service"
  echo "   const logger = require('../../../core/utils/logger');"
  echo "   logger.info('message', { context });"
  exit 1
fi