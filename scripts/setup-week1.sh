#!/bin/bash

# Week 1 Setup Script
# Automates installation of required dependencies

set -e

echo "🚀 AstroNemi Week 1 Setup"
echo "============================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Installing dependencies..."
echo ""

# Install Razorpay
echo "1️⃣ Installing Razorpay..."
npm install react-native-razorpay
echo "✅ Razorpay installed"
echo ""

# Install Sentry
echo "2️⃣ Installing Sentry..."
npm install @sentry/react-native
echo "✅ Sentry installed"
echo ""

# Install Testing Libraries
echo "3️⃣ Installing testing libraries..."
npm install --save-dev @testing-library/react-native @testing-library/jest-native
echo "✅ Testing libraries installed"
echo ""

# Install React Query
echo "4️⃣ Installing React Query..."
npm install @tanstack/react-query
echo "✅ React Query installed"
echo ""

echo "🎉 All dependencies installed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Run Sentry wizard: npx @sentry/wizard -i reactNative"
echo "2. Configure environment variables in .env.production"
echo "3. Add GitHub secrets for CI/CD"
echo "4. Test payment integration"
echo "5. Run accessibility audit"
echo ""
echo "📖 See docs/WEEK_1_CHECKLIST.md for detailed instructions"
