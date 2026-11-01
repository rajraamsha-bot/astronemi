#!/bin/bash

# AstroNemi Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="AstroNemi"
PACKAGE_NAME="com.astronemi.astronemi"

# Determine environment
ENV=${1:-staging}
echo -e "${BLUE}🚀 Deploying $APP_NAME to $ENV...${NC}"

# Load environment variables
if [ -f ".env.$ENV" ]; then
    echo -e "${YELLOW}Loading environment variables from .env.$ENV${NC}"
    export $(cat .env.$ENV | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env.$ENV file not found${NC}"
    exit 1
fi

# Check required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check npm/bun
    if command -v bun &> /dev/null; then
        PKG_MANAGER="bun"
    elif command -v npm &> /dev/null; then
        PKG_MANAGER="npm"
    else
        echo -e "${RED}No package manager found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Using $PKG_MANAGER${NC}"
    
    # Check Expo CLI
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}npx is not available${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    if [ "$PKG_MANAGER" = "bun" ]; then
        bun install
    else
        npm ci
    fi
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    
    if [ "$PKG_MANAGER" = "bun" ]; then
        bun test --passWithNoTests
    else
        npm test -- --passWithNoTests
    fi
    
    echo -e "${GREEN}✓ Tests passed${NC}"
}

# Run linter
run_linter() {
    echo -e "${YELLOW}Running linter...${NC}"
    
    if [ "$PKG_MANAGER" = "bun" ]; then
        bun lint
    else
        npm run lint
    fi
    
    echo -e "${GREEN}✓ Linting passed${NC}"
}

# Build the app
build_app() {
    echo -e "${YELLOW}Building app...${NC}"
    
    # Export for web (if applicable)
    # npx expo export --platform web
    
    # Build for Android
    if [ "$ENV" = "production" ]; then
        echo -e "${YELLOW}Building Android APK/AAB...${NC}"
        npx eas build --platform android --profile production
        
        echo -e "${YELLOW}Building iOS...${NC}"
        npx eas build --platform ios --profile production
    else
        echo -e "${YELLOW}Building Android preview...${NC}"
        npx eas build --platform android --profile preview
    fi
    
    echo -e "${GREEN}✓ Build complete${NC}"
}

# Submit to app stores
submit_to_stores() {
    if [ "$ENV" != "production" ]; then
        echo -e "${YELLOW}Skipping store submission for non-production environment${NC}"
        return
    fi
    
    echo -e "${YELLOW}Submitting to Google Play Store...${NC}"
    npx eas submit --platform android --latest
    
    echo -e "${YELLOW}Submitting to Apple App Store...${NC}"
    npx eas submit --platform ios --latest
    
    echo -e "${GREEN}✓ Submitted to app stores${NC}"
}

# Deploy backend (Supabase)
deploy_backend() {
    echo -e "${YELLOW}Deploying backend functions...${NC}"
    
    if command -v supabase &> /dev/null; then
        supabase functions deploy --env-file .env.$ENV
        echo -e "${GREEN}✓ Backend functions deployed${NC}"
    else
        echo -e "${YELLOW}Supabase CLI not found, skipping backend deployment${NC}"
    fi
}

# Update Sentry release
update_sentry() {
    if [ -z "$SENTRY_AUTH_TOKEN" ]; then
        echo -e "${YELLOW}Sentry not configured, skipping release creation${NC}"
        return
    fi
    
    echo -e "${YELLOW}Creating Sentry release...${NC}"
    
    VERSION=$(node -p "require('./package.json').version")
    
    # Create release
    npx sentry-cli releases new "astronemi@$VERSION"
    
    # Upload source maps
    npx sentry-cli releases files "astronemi@$VERSION" upload-sourcemaps ./dist
    
    # Finalize release
    npx sentry-cli releases finalize "astronemi@$VERSION"
    
    echo -e "${GREEN}✓ Sentry release created${NC}"
}

# Send deployment notification
send_notification() {
    echo -e "${YELLOW}Sending deployment notification...${NC}"
    
    VERSION=$(node -p "require('./package.json').version")
    
    # Slack webhook (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 $APP_NAME v$VERSION deployed to $ENV\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    echo -e "${GREEN}✓ Notification sent${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $APP_NAME Deployment Script${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    check_requirements
    install_dependencies
    run_linter
    run_tests
    build_app
    submit_to_stores
    deploy_backend
    update_sentry
    send_notification
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✅ Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main
