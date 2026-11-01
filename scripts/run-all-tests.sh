#!/bin/bash

# ============================================
# AstroNemi Comprehensive Testing Script
# ============================================

set -e

echo "🧪 Running Comprehensive Test Suite"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================
# Unit Tests
# ============================================

echo ""
echo "📦 Running Unit Tests..."

npm run test -- --coverage --testPathPattern="__tests__" --passWithNoTests

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Unit tests passed${NC}"
else
  echo -e "${RED}❌ Unit tests failed${NC}"
  exit 1
fi

# ============================================
# Integration Tests
# ============================================

echo ""
echo "🔗 Running Integration Tests..."

npm run test -- --testPathPattern="__tests__/integration" --passWithNoTests

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Integration tests passed${NC}"
else
  echo -e "${RED}❌ Integration tests failed${NC}"
  exit 1
fi

# ============================================
# E2E Tests
# ============================================

echo ""
echo "🎭 Running E2E Tests..."

npm run test -- --testPathPattern="e2e" --passWithNoTests

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ E2E tests passed${NC}"
else
  echo -e "${RED}❌ E2E tests failed${NC}"
  exit 1
fi

# ============================================
# Performance Tests
# ============================================

echo ""
echo "⚡ Running Performance Tests..."

npm run test -- --testPathPattern="__tests__/performance" --passWithNoTests

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Performance tests passed${NC}"
else
  echo -e "${YELLOW}⚠️  Performance tests had issues${NC}"
fi

# ============================================
# Test Summary
# ============================================

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "${GREEN}✅ All critical tests passed${NC}"
echo ""
echo "Coverage Report: ./coverage/index.html"
echo ""