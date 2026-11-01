#!/bin/bash

# ============================================
# AstroNemi Production Deployment Script
# ============================================
# This script handles production deployment with all necessary checks

set -e  # Exit on error

echo "🚀 AstroNemi Production Deployment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Pre-deployment Checks
# ============================================

echo ""
echo "📋 Running pre-deployment checks..."

# Check if staging environment exists
if [ ! -f .env.staging ]; then
  echo -e "${RED}❌ .env.staging not found${NC}"
  echo "Staging environment required before production deployment"
  exit 1
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
  echo -e "${RED}❌ .env.production not found${NC}"
  echo "Please create .env.production with production credentials"
  exit 1
fi

# Check if required environment variables are set
required_vars=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  "EXPO_PUBLIC_RAZORPAY_KEY_ID"
  "EXPO_PUBLIC_AGORA_APP_ID"
  "EXPO_PUBLIC_SENTRY_DSN"
)

for var in "${required_vars[@]}"; do
  if ! grep -q "^${var}=" .env.production; then
    echo -e "${RED}❌ Missing required variable: ${var}${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Create rollback script
echo ""
echo "🔄 Creating rollback script..."
cp .env .env.backup
echo "#!/bin/bash" > scripts/rollback.sh
echo "echo 'Rolling back deployment...'" >> scripts/rollback.sh
echo "cp .env.backup .env" >> scripts/rollback.sh
echo "echo 'Environment restored'" >> scripts/rollback.sh
chmod +x scripts/rollback.sh

echo -e "${GREEN}✅ Rollback script created${NC}"

# ============================================
# Run Tests
# ============================================

echo ""
echo "🧪 Running tests..."

npm run test -- --coverage --passWithNoTests

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Tests failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}"

# ============================================
# Run Linting
# ============================================

echo ""
echo "🔍 Running linter..."

npm run lint

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Linting warnings found${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}✅ Linting complete${NC}"

# ============================================
# Build Application
# ============================================

echo ""
echo "🏗️  Building application..."

# Copy production environment
cp .env.production .env

# Build for production
eas build --platform all --profile production --non-interactive

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# ============================================
# Deploy Supabase Functions
# ============================================

echo ""
echo "☁️  Deploying Supabase Edge Functions..."

FUNCTIONS=(
  "agora-token"
  "cancel-subscription"
  "create-razorpay-order"
  "daily-horoscope"
  "deduct-wallet"
  "health-check"
  "prokerala"
  "razorpay-webhook"
  "send-sms"
  "verify-iap-purchase"
  "verify-payment"
)

for FUNC in "${FUNCTIONS[@]}"; do
  echo "Deploying function: $FUNC..."
  if [ ! -d "supabase/functions/$FUNC" ]; then
    echo -e "${RED}❌ Function directory supabase/functions/$FUNC is absent!${NC}"
    exit 1
  fi
  supabase functions deploy "$FUNC"
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Function deployment failed for: $FUNC${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✅ Functions deployed${NC}"

# ============================================
# Run Database Migrations
# ============================================

echo ""
echo "🗄️  Running database migrations..."

supabase db push

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Migration failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Migrations applied${NC}"

# ============================================
# Submit to App Stores
# ============================================

echo ""
echo "📱 Submitting to app stores..."

eas submit --platform all --profile production --non-interactive

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  App store submission requires manual review${NC}"
fi

# ============================================
# Post-deployment Tasks
# ============================================

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📊 Next Steps:"
echo "1. Monitor Sentry for errors: https://sentry.io"
echo "2. Check analytics dashboard"
echo "3. Monitor server performance"
echo "4. Review user feedback"
echo ""
echo "🔗 Useful Links:"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Sentry Dashboard: https://sentry.io"
echo "- Razorpay Dashboard: https://dashboard.razorpay.com"
echo "- Expo Dashboard: https://expo.dev"
echo ""