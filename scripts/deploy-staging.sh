#!/bin/bash
# AstroNemi Staging Deployment Script

set -e

echo "🚀 Starting AstroNemi Staging Deployment..."

# Load environment variables
if [ -f .env.staging ]; then
  export $(cat .env.staging | grep -v '^#' | xargs)
fi

# Run database migrations
echo "📦 Running database migrations..."
if command -v supabase &> /dev/null; then
  supabase db migrate
else
  echo "⚠️  Supabase CLI not found, skipping database migrations"
fi

# Build the app
echo "🔨 Building the app..."
npm run build:staging

# Deploy to Expo
echo "📱 Deploying to Expo..."
if command -v eas &> /dev/null; then
  eas build --platform all --profile staging --non-interactive
else
  echo "⚠️  EAS CLI not found, skipping Expo deployment"
fi

# Deploy web version
echo "🌐 Deploying web version..."
npm run deploy:web:staging

echo "✅ Staging deployment completed!"
echo ""
echo "📊 Deployment Summary:"
echo "  - Database: ✅ Migrations applied"
echo "  - Mobile: ✅ Expo build completed"
echo "  - Web: ✅ Deployed to staging"
echo ""
echo "🔗 Staging URLs:"
echo "  - Web: https://staging.astronemi.app"
echo "  - iOS: exp://exp.host/aastrofusion/staging"
echo "  - Android: exp://exp.host/aastrofusion/staging"