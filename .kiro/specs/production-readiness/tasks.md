# Implementation Tasks: AstroFusion Production Readiness

## Phase 1: Make It Usable

### Task 1.1: Supabase Database Setup
- [ ] Create SQL migration for all 16 tables (users, kundlis, astrologers, consultations, chat_messages, subscriptions, wallet_transactions, orders, notifications, referrals, kundli_matches, horoscopes, reviews, products, order_items, astrologer_availability)
- [ ] Implement Row Level Security (RLS) policies on all tables
- [ ] Create indexes on frequently queried columns (user_id, astrologer_id, created_at, status)
- [ ] Add foreign key constraints for referential integrity
- [ ] Create database functions for OTP storage/verification and device binding

### Task 1.2: SMS OTP Authentication
- [ ] Configure Twilio account and get API credentials
- [ ] Create Supabase Edge Function for SMS OTP delivery
- [ ] Update AuthContext to use Twilio for SMS delivery
- [ ] Implement database-backed OTP fallback for when Twilio is unavailable
- [ ] Add device binding service with 2-device limit
- [ ] Update rate limiter to enforce OTP request limits (3/60s) and verification limits (5/60s)

### Task 1.3: Astrologer Listings Database Connection
- [ ] Create Supabase table for astrologers with all required fields
- [ ] Update astrologersApi to fetch from Supabase instead of mock data
- [ ] Implement filtering by specialization, language, and minimum rating
- [ ] Add pagination support for infinite scrolling
- [ ] Implement offline caching with fallback to mock data

### Task 1.4: Real-Time Chat with Supabase Realtime
- [ ] Create chat_messages table with proper schema
- [ ] Implement Supabase Realtime subscription for real-time message delivery
- [ ] Create chat-service.ts for message handling and billing
- [ ] Implement per-minute billing deduction from wallet
- [ ] Add session management with automatic termination on wallet depletion
- [ ] Implement offline message queue with retry logic

### Task 1.5: Razorpay Payment Integration
- [ ] Create Razorpay account and get API credentials
- [ ] Create payment-service.ts for Razorpay integration
- [ ] Implement wallet top-up flow with Razorpay checkout
- [ ] Create webhook endpoint for payment confirmation
- [ ] Implement signature verification for webhook security
- [ ] Add wallet_transactions table for transaction history

## Phase 2: Make It Reliable

### Task 2.1: Error Boundaries on All Screens
- [ ] Wrap all tab screens with ErrorBoundary component
- [ ] Wrap feature-specific components with FeatureErrorBoundary
- [ ] Ensure ErrorBoundary logs errors to Logger service
- [ ] Test ErrorBoundary recovery with "Try Again" button
- [ ] Verify "Go Home" button navigates correctly

### Task 2.2: Structured Logging with Logger Service
- [ ] Replace all console.log calls with Logger.info
- [ ] Replace all console.warn calls with Logger.warn
- [ ] Replace all console.error calls with Logger.error
- [ ] Verify Logger routes to Sentry in production
- [ ] Add Logger.action calls for user interactions
- [ ] Add Logger.navigation calls for screen transitions

### Task 2.3: Loading States Implementation
- [ ] Create LoadingState component with ActivityIndicator
- [ ] Add loading states to all screens with data fetching
- [ ] Implement loading spinner on buttons with async actions
- [ ] Add skeleton loaders for list items
- [ ] Add "Loading more..." indicator for pagination
- [ ] Implement proper transition from loading to error state

### Task 2.4: Sentry Error Tracking
- [ ] Initialize Sentry in app entry point
- [ ] Configure Sentry with user context (id, phone, subscription tier)
- [ ] Configure Sentry with device context (OS, version, device name)
- [ ] Add navigation breadcrumbs for screen transitions
- [ ] Add user action breadcrumbs for key interactions
- [ ] Add API call breadcrumbs for error tracking

### Task 2.5: Push Notifications
- [ ] Configure Firebase Cloud Messaging (FCM)
- [ ] Create notification-service.ts for push notification handling
- [ ] Request notification permissions on first launch
- [ ] Store device push token in users table
- [ ] Implement notification types (consultation, subscription, wallet, horoscope, promo)
- [ ] Add deep linking for notification taps

## Phase 3: Make It Complete

### Task 3.1: Agora Video Call Integration
- [ ] Create Agora account and get App ID
- [ ] Create agora-service.ts for video/voice call management
- [ ] Implement channel joining with unique channel names per consultation
- [ ] Add local video preview and remote video display
- [ ] Implement mute, camera toggle, speaker switch, and end call buttons
- [ ] Add network quality indicator
- [ ] Implement billing sync for video consultations

### Task 3.2: Wallet Backend Connection
- [ ] Create wallet-service.ts for server-side balance management
- [ ] Implement credit_wallet and debit_wallet RPC functions
- [ ] Add wallet balance sync on app start
- [ ] Implement local cache for last 20 transactions
- [ ] Add "Sync pending" indicator when offline
- [ ] Implement transaction history with pagination

### Task 3.3: Kundli Data Cloud Sync
- [ ] Create kundli-service.ts for cloud operations
- [ ] Implement kundli save to Supabase on generation
- [ ] Implement kundli fetch on app start
- [ ] Add kundli match save to kundli_matches table
- [ ] Implement offline queue for kundli operations
- [ ] Add calculation_source field to kundli data

### Task 3.4: E2E Tests for Critical Flows
- [ ] Set up Detox for E2E testing
- [ ] Create E2E test for authentication flow (OTP send, verify, logout)
- [ ] Create E2E test for kundli generation flow
- [ ] Create E2E test for astrologer browsing flow
- [ ] Create E2E test for consultation booking flow
- [ ] Create E2E test for wallet top-up flow
- [ ] Create E2E test for chat flow
- [ ] Configure CI/CD to run E2E tests on staging

### Task 3.5: Staging Environment Setup
- [ ] Create separate Supabase project for staging
- [ ] Configure staging environment variables
- [ ] Set up Razorpay test mode for staging
- [ ] Configure separate Sentry project for staging
- [ ] Add "Staging" badge to staging app UI
- [ ] Configure CI/CD pipeline for staging deployment
- [ ] Seed staging database with test data

## Summary

This document defines 20 implementation tasks across 3 phases to make AstroFusion production-ready:

- **Phase 1 (Make It Usable)**: Database setup (1.1), SMS OTP (1.2), astrologer listings (1.3), real-time chat (1.4), and payments (1.5)
- **Phase 2 (Make It Reliable)**: Error boundaries (2.1), structured logging (2.2), loading states (2.3), Sentry (2.4), and push notifications (2.5)
- **Phase 3 (Make It Complete)**: Video calls (3.1), wallet sync (3.2), kundli cloud sync (3.3), E2E tests (3.4), and staging environment (3.5)