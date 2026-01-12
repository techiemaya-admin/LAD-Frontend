#!/bin/bash

###############################################################################
# LAD Path Guard - Architecture Rules Enforcement
# 
# Validates:
# - Allowed/forbidden paths (no infra, cloudbuild, web changes)
# - File size limits (400 lines max)
# - Feature isolation (no cross-feature imports)
# - Feature-prefixed API routes
# - Proper feature structure
# - SDK framework independence
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 LAD Path Guard - Architecture Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Track violations
VIOLATIONS=0

# Get changed files in this PR
CHANGED_FILES=$(git diff --name-only origin/develop...HEAD 2>/dev/null || git diff --name-only HEAD~1...HEAD)

if [ -z "$CHANGED_FILES" ]; then
  echo -e "${YELLOW}⚠️  No changed files detected${NC}"
  exit 0
fi

echo -e "${BLUE}📝 Changed files:${NC}"
echo "$CHANGED_FILES" | head -10
if [ $(echo "$CHANGED_FILES" | wc -l) -gt 10 ]; then
  echo "   ... and $(( $(echo "$CHANGED_FILES" | wc -l) - 10 )) more"
fi
echo ""

###############################################################################
# Rule 0: Path Restrictions (Allowed/Forbidden Paths)
###############################################################################

echo -e "${BLUE}0️⃣  Checking path restrictions...${NC}"

FORBIDDEN_PATTERNS=(
  "^infra/"
  "^cloudbuild"
  "^frontend/web/"
  "^lad-sandbox/"
  "\.sandbox\."
  "\.local\."
)

ALLOWED_PATTERNS=(
  "^backend/features/"
  "^frontend/sdk/features/"
  "^frontend/sdk/shared/"
  "^docs/"
  "^lad-docs/"
  "^scripts/"
  "^\.github/"
  "^tests/"
  "README\.md"
  "package\.json"
  "\.gitignore"
)

for file in $CHANGED_FILES; do
  # Check forbidden patterns first
  is_forbidden=false
  for forbidden in "${FORBIDDEN_PATTERNS[@]}"; do
    if [[ "$file" =~ $forbidden ]]; then
      echo -e "${RED}   ✗ Forbidden path: $file${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
      is_forbidden=true
      break
    fi
  done
  
  # If forbidden, skip to next file
  if [ "$is_forbidden" = true ]; then
    continue
  fi
  
  # Check if file matches allowed patterns
  is_allowed=false
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if [[ "$file" =~ $pattern ]]; then
      is_allowed=true
      break
    fi
  done
  
  if [ "$is_allowed" = false ]; then
    echo -e "${RED}   ✗ File not in allowed paths: $file${NC}"
    echo -e "${YELLOW}      Allowed: backend/features/, frontend/sdk/features/, docs/, scripts/, etc.${NC}"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ All files in allowed paths${NC}"
fi
echo ""

###############################################################################
# Rule 1: File Size Limit (400 lines)
###############################################################################

echo -e "${BLUE}1️⃣  Checking file size limits (400 lines max)...${NC}"

for file in $CHANGED_FILES; do
  # Skip deleted files, non-code files
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Only check code files
  if [[ "$file" =~ \.(js|ts|jsx|tsx)$ ]]; then
    line_count=$(wc -l < "$file" | xargs)
    
    if [ "$line_count" -gt 400 ]; then
      echo -e "${RED}   ✗ $file: $line_count lines (exceeds 400)${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ All files within 400 line limit${NC}"
fi
echo ""

###############################################################################
# Rule 2: Feature Isolation (No cross-feature imports)
###############################################################################

echo -e "${BLUE}2️⃣  Checking feature isolation...${NC}"

for file in $CHANGED_FILES; do
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Check backend features
  if [[ "$file" =~ backend/features/([^/]+)/ ]]; then
    feature="${BASH_REMATCH[1]}"
    
    # Look for imports from other features
    if grep -E "from ['\"].*features/(?!$feature)[^'\"]*['\"]" "$file" > /dev/null 2>&1; then
      echo -e "${RED}   ✗ $file: Cross-feature import detected${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
  
  # Check SDK features
  if [[ "$file" =~ frontend/sdk/features/([^/]+)/ ]]; then
    feature="${BASH_REMATCH[1]}"
    
    # Look for imports from other features
    if grep -E "from ['\"].*features/(?!$feature)[^'\"]*['\"]" "$file" > /dev/null 2>&1; then
      echo -e "${RED}   ✗ $file: Cross-feature import detected${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ Feature isolation maintained${NC}"
fi
echo ""

###############################################################################
# Rule 3: Additional Forbidden File Patterns
###############################################################################

echo -e "${BLUE}3️⃣  Checking for forbidden file patterns...${NC}"

FORBIDDEN_FILE_PATTERNS=(
  "**/test-pages/"
  ".env.local"
  ".env.production"
  "**/*.backup"
  "**/.DS_Store"
)

violation_found=false
for file in $CHANGED_FILES; do
  for pattern in "${FORBIDDEN_FILE_PATTERNS[@]}"; do
    if [[ "$file" == $pattern ]]; then
      echo -e "${RED}   ✗ $file: Forbidden file pattern${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
      violation_found=true
    fi
  done
done

if [ "$violation_found" = false ]; then
  echo -e "${GREEN}   ✓ No forbidden file patterns detected${NC}"
fi
echo ""

###############################################################################
# Rule 4: Feature-Prefixed API Routes (Backend)
###############################################################################

echo -e "${BLUE}4️⃣  Checking API route prefixes...${NC}"

for file in $CHANGED_FILES; do
  if [[ "$file" =~ backend/features/([^/]+)/routes/ ]]; then
    feature="${BASH_REMATCH[1]}"
    
    if [ -f "$file" ]; then
      # Check for routes that don't match feature prefix
      if grep -E "router\.(get|post|put|delete|patch)\(['\"]/" "$file" | grep -v "/$feature" > /dev/null 2>&1; then
        echo -e "${RED}   ✗ $file: Routes must be prefixed with /$feature${NC}"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ API routes properly prefixed${NC}"
fi
echo ""

###############################################################################
# Rule 5: Feature Structure Validation
###############################################################################

echo -e "${BLUE}5️⃣  Validating feature structure...${NC}"

# Check if any feature folders are being modified
for file in $CHANGED_FILES; do
  # Backend features must have manifest.js
  if [[ "$file" =~ backend/features/([^/]+)/ ]]; then
    feature="${BASH_REMATCH[1]}"
    manifest_path="backend/features/$feature/manifest.js"
    
    if [ ! -f "$manifest_path" ]; then
      echo -e "${RED}   ✗ Backend feature '$feature' missing manifest.js${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
  
  # SDK features must have index.ts
  if [[ "$file" =~ frontend/sdk/features/([^/]+)/ ]]; then
    feature="${BASH_REMATCH[1]}"
    index_path="frontend/sdk/features/$feature/index.ts"
    
    if [ ! -f "$index_path" ]; then
      echo -e "${RED}   ✗ SDK feature '$feature' missing index.ts${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ Feature structure valid${NC}"
fi
echo ""

###############################################################################
# Rule 6: No Next.js Imports in SDK
###############################################################################

echo -e "${BLUE}6️⃣  Checking SDK framework independence...${NC}"

for file in $CHANGED_FILES; do
  if [[ "$file" =~ frontend/sdk/ ]] && [ -f "$file" ]; then
    # Check for Next.js imports
    if grep -E "from ['\"]next[/'\"]" "$file" > /dev/null 2>&1; then
      echo -e "${RED}   ✗ $file: Next.js import detected in SDK${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
    
    # Check for React component JSX (SDK should not have UI components)
    if [[ "$file" =~ \.(tsx|jsx)$ ]]; then
      echo -e "${RED}   ✗ $file: JSX file in SDK (UI components not allowed)${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ SDK maintains framework independence${NC}"
fi
echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✅ All architecture rules passed!${NC}"
  echo -e "${GREEN}   No violations detected${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "${RED}❌ Architecture validation failed!${NC}"
  echo -e "${RED}   Total violations: $VIOLATIONS${NC}"
  echo ""
  echo -e "${YELLOW}📚 Please refer to:${NC}"
  echo -e "${YELLOW}   - lad-docs/FEATURE_REPOSITORY_RULES.md${NC}"
  echo -e "${YELLOW}   - lad-docs/lad-feature-developer-playbook.md${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
