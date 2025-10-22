#!/bin/bash
# Installation Verification Script for Read/Write Operations System

echo "======================================================"
echo "  AI Read & Write Operations System - Verification"
echo "======================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
FILES_OK=0
FILES_MISSING=0

# Function to check file exists
check_file() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    ((FILES_OK++))
  else
    echo -e "${RED}✗${NC} $description - MISSING"
    echo "    Expected: $file"
    ((FILES_MISSING++))
  fi
}

# Function to check content in file
check_content() {
  local file=$1
  local content=$2
  local description=$3
  
  if grep -q "$content" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $description"
    ((FILES_OK++))
  else
    echo -e "${RED}✗${NC} $description - NOT FOUND"
    ((FILES_MISSING++))
  fi
}

echo "Checking Backend Files..."
echo "========================"
check_file "auth-backend/src/models/WhitelistManager.js" "WhitelistManager Model"
check_file "auth-backend/src/controllers/whitelistController.js" "Whitelist Controller"
check_file "auth-backend/src/routes/whitelistRoutes.js" "Whitelist Routes"

echo ""
echo "Checking Updated Backend Files..."
echo "=================================="
check_content "auth-backend/src/utils/aiClient.js" "isWriteOperation" "aiClient.js - Write support"
check_content "auth-backend/src/utils/aiClient.js" "extractTableFromSql" "aiClient.js - Table extraction"
check_content "auth-backend/src/controllers/assistantController.js" "WhitelistController" "assistantController.js - Whitelist integration"
check_content "auth-backend/src/controllers/assistantController.js" "confirmWriteOperation" "assistantController.js - Confirm write endpoint"
check_content "auth-backend/src/routes/assistantRoutes.js" "confirm-write" "assistantRoutes.js - Confirm write route"
check_content "auth-backend/src/routes/databaseRoutes.js" "whitelistRoutes" "databaseRoutes.js - Whitelist routes"

echo ""
echo "Checking Frontend Files..."
echo "=========================="
check_file "frontend/src/components/WhitelistManager.jsx" "WhitelistManager Component"
check_file "frontend/src/components/WhitelistManager.css" "WhitelistManager Styles"
check_file "frontend/src/components/WriteConfirmation.jsx" "WriteConfirmation Component"
check_file "frontend/src/components/WriteConfirmation.css" "WriteConfirmation Styles"

echo ""
echo "Checking Documentation..."
echo "========================="
check_file "READ_WRITE_SYSTEM_DOCUMENTATION.md" "Complete Documentation"
check_file "QUICK_START_GUIDE.md" "Quick Start Guide"
check_file "AI_DATABASE_INTEGRATION_ANALYSIS.md" "Integration Analysis"

echo ""
echo "======================================================"
echo "Results:"
echo "--------"
echo -e "Files OK: ${GREEN}$FILES_OK${NC}"
echo -e "Files Missing: ${RED}$FILES_MISSING${NC}"
echo ""

if [ $FILES_MISSING -eq 0 ]; then
  echo -e "${GREEN}✓ All files installed correctly!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Set WHITELIST_ADMIN_PASSWORD in auth-backend/.env"
  echo "2. Restart backend server: npm start"
  echo "3. Test whitelist manager in frontend dashboard"
  echo ""
  echo "See QUICK_START_GUIDE.md for detailed instructions"
else
  echo -e "${RED}✗ Some files are missing!${NC}"
  echo ""
  echo "Please ensure all backend and frontend files are properly created."
  echo "Check the file paths above and verify they match your project structure."
fi

echo "======================================================"
