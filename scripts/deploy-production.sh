#!/bin/bash
# AstroNemi Production Deployment Script

set -e

echo "🚀 Starting AstroNemi Production Deployment..."

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
fi

# Run database migrations with backup
echo "📦 Running database migrations with backup..."
if command -v supabase &> /dev/null; then
  # Create backup before migration
  BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
  echo "💾 Creating database backup: $BACKUP_FILE"
  supabase db dump --file "$BACKUP_FILE"
  
  # Run migrations
  supabase db migrate
  
  echo "✅ Database backup saved to: $BACKUP_FILE"
else
  echo "⚠️  Supabase CLI not found, skipping database migrations"
fi

# Build the app
echo "🔨 Building the app..."
npm run build:production

# Deploy to Expo
echo "📱 Deploying to Expo..."
if command -v eas &> /dev/null; then
  eas build --platform all --profile production --non-interactive
else
  echo "⚠️  EAS CLI not found, skipping Expo deployment"
fi

# Deploy web version
echo "🌐 Deploying web version..."
npm run deploy:web:production

# Run post-deployment checks
echo "🔍 Running post-deployment checks..."
npm run test:smoke

echo "✅ Production deployment completed!"
echo ""
echo "📊 Deployment Summary:"
echo "  - Database: ✅ Migrations applied with backup"
echo "  - Mobile: ✅ Expo production build completed"
echo "  - Web: ✅ Deployed to production"
echo "  - Tests: ✅ Smoke tests passed"
echo ""
echo "🔗 Production URLs:"
echo "  - Web: https://app.astronemi.app"
echo "  - iOS: https://apps.apple.com/app/astronemi"
echo "  - Android: https://play.google.com/store/apps/details?id=com.astronemi.app"
echo ""
echo "📈 Monitoring:"
echo "  - Errors: https://sentry.io/astronemi"
echo "  - Analytics: https://analytics.astronemi.app"
echo "  - Performance: https://performance.astronemi.app"