#!/bin/bash
# @file test/e2e/check-pages.sh
# @desc Simple HTTP test for all HTML pages

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSED=0
FAILED=0

check_page() {
  local path="$1"
  local name="$2"
  local url="${BASE_URL}${path}"

  status=$(curl -sL -o /dev/null -w "%{http_code}" "$url")

  if [ "$status" = "200" ]; then
    echo -e "\033[32m✓\033[0m $name ($status)"
    ((PASSED++))
  else
    echo -e "\033[31m✗\033[0m $name ($status)"
    ((FAILED++))
  fi
}

echo "🔍 Checking pages at $BASE_URL"
echo ""

check_page "/" "Root Landing"
check_page "/index.html" "Root Index"
check_page "/test/index.html" "Test Runner"
check_page "/test/chat.html" "Chat Room"
check_page "/test/e2e/dual-client.html" "Dual Client"
check_page "/test/e2e/client.html" "Client"
check_page "/sandbox/index.html" "Sandbox"

echo ""
echo "────────────────────────────────────"
echo -e "\033[32m$PASSED passed\033[0m, \033[31m$FAILED failed\033[0m"

exit $FAILED
