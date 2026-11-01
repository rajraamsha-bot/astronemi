# Requirements Document: AstroFusion Production Readiness

## Introduction

This document defines the requirements for making the AstroFusion astrology application production-ready. The application is a React Native/Expo mobile app that provides kundli generation, astrologer consultations, horoscopes, and AI-powered astrology features. The current codebase has foundational infrastructure in place (Supabase client, AuthContext, Logger, ErrorBoundary) but requires production hardening across three phases: making it usable, reliable, and complete.

## Glossary

- **AstroFusion**: The React Native/Expo mobile application for astrology services
- **Supabase**: Backend-as-a-Service providing database, authentication, and real-time subscriptions
- **OTP**: One-Time Password used for phone-based authentication
- **Twilio**: SMS gateway provider for OTP delivery
- **Razorpay**: Payment gateway for Indian Rupee transactions
- **Agora**: Real-time communication platform for video/voice calls
- **Kundli**: Vedic birth chart generated from birth details (date, time, location)
- **VedAstro**: Free API service for kundli calculations (no API key required)
- **Sentry**: Error tracking and performance monitoring service
- **E2E Tests**: End-to-end tests that validate complete user flows
- **Staging Environment**: Pre-production environment for testing before release
- **Wallet**: In-app balance system for paying astrologers
- **Consultation**: Real-time interaction between user and astrologer (chat, call, or video)
- **ErrorBoundary**: React component that catches JavaScript errors in child components
- **Logger**: Structured logging service that routes to Sentry in production

---

## Phase 1: Make It Usable

### Requirement 1: Supabase Database Setup

**User Story:** As a developer, I want a properly configured Supabase database with all required tables, so that the application can store and retrieve user data reliably.

#### Acceptance Criteria

1. WHEN the Supabase migration is executed, THE Database SHALL contain tables for users, kundlis, astrologers, consultations, chat_messages, subscriptions, wallet_transactions, orders, notifications, referrals, kundli_matches, horoscopes, reviews, products, order_items, and astrologer_availability
2. THE Database SHALL have Row Level Security (RLS) policies enabled on all tables
3. WHEN a user queries their own data, THE RLS Policy SHALL allow access only to rows where the user_id matches the authenticated user
4. THE Database SHALL have indexes on frequently queried columns (user_id, astrologer_id, created_at, status)
5. WHEN a new user is created, THE Database SHALL automatically generate a unique referral_code
6. THE Database SHALL have foreign key constraints to maintain referential integrity

#### Correctness Properties

1. **Schema Completeness**: FOR ALL defined table types in database.types.ts, THE Database SHALL have corresponding tables with matching column definitions
2. **RLS Enforcement**: FOR ALL tables containing user data, WHEN a query is executed without authentication, THE Database SHALL return zero rows
3. **Referral Code Uniqueness**: FOR ALL users, THE referral_code SHALL be unique across the users table

---

### Requirement 2: SMS OTP Authentication

**User Story:** As a user, I want to authenticate using my phone number with SMS OTP, so that I can securely access my account without remembering passwords.

#### Acceptance Criteria

1. WHEN a user submits a valid 10-digit phone number, THE AuthSystem SHALL send a 6-digit OTP via SMS within 30 seconds
2. WHEN an invalid phone number is submitted, THE AuthSystem SHALL return an error message "Please enter a valid 10-digit mobile number"
3. WHEN a user requests OTP more than 3 times within 60 seconds, THE RateLimiter SHALL block the request and return "Too many OTP requests. Please try again later."
4. WHEN a valid OTP is submitted within 5 minutes of generation, THE AuthSystem SHALL authenticate the user and create a session
5. WHEN an invalid OTP is submitted, THE AuthSystem SHALL return "Invalid OTP. Please try again."
6. WHEN a user verifies OTP more than 5 times within 60 seconds, THE RateLimiter SHALL block the request
7. WHEN a user is authenticated on a new device, THE DeviceBindingService SHALL register the device with a limit of 2 devices per account
8. WHEN the device limit is exceeded, THE AuthSystem SHALL return "Access denied: Device limit exceeded. Please logout from another device."
9. THE OTP SHALL NOT be stored in client-side state or logged in production
10. WHEN Supabase Auth is unavailable, THE AuthSystem SHALL fall back to database-backed OTP storage

#### Correctness Properties

1. **OTP Rate Limiting**: FOR ALL phone numbers, WHEN OTP request count exceeds 3 within 60 seconds, THE RateLimiter SHALL reject subsequent requests
2. **OTP Expiration**: FOR ALL OTPs, WHEN the creation timestamp is more than 5 minutes old, THE OTP SHALL be considered expired
3. **Device Binding**: FOR ALL users, WHEN registered device count exceeds 2, THE AuthSystem SHALL reject new device registration
4. **Session Persistence**: WHEN a user closes and reopens the app, THE AuthSystem SHALL restore the session from secure storage

---

### Requirement 3: Astrologer Listings Database Connection

**User Story:** As a user, I want to browse real astrologer profiles from the database, so that I can make informed decisions about consultations.

#### Acceptance Criteria

1. WHEN the astrologers screen loads, THE AstrologersApi SHALL fetch astrologer data from the Supabase astrologers table
2. WHEN astrologers are displayed, THE UI SHALL show name, avatar, rating, specializations, languages, experience, and price per minute
3. WHEN a user applies filters (specialization, language, minRating), THE AstrologersApi SHALL return only matching astrologers
4. WHEN a user scrolls to the bottom of the list, THE AstrologersApi SHALL load the next page of 20 astrologers
5. WHEN the network is unavailable, THE UI SHALL display an error message with a retry button
6. WHEN a user pulls down on the list, THE UI SHALL refresh the astrologer data
7. THE AstrologersApi SHALL complete the fetch request within 3 seconds under normal network conditions

#### Correctness Properties

1. **Pagination Consistency**: FOR ALL page requests, WHEN page N and page N+1 are requested, THE combined data SHALL contain no duplicate astrologers
2. **Filter Correctness**: FOR ALL astrologers returned with a specialization filter, THE astrologer's specializations array SHALL contain the filter value
3. **Rating Filter**: FOR ALL astrologers returned with a minRating filter, THE astrologer's rating SHALL be greater than or equal to minRating

---

### Requirement 4: Real-Time Chat with Supabase Realtime

**User Story:** As a user, I want to chat with astrologers in real-time, so that I can get immediate responses to my questions.

#### Acceptance Criteria

1. WHEN a user sends a message, THE ChatSystem SHALL deliver the message to the astrologer within 2 seconds
2. WHEN a new message is received, THE ChatSystem SHALL update the UI in real-time without requiring a refresh
3. WHEN a chat session starts, THE BillingSystem SHALL deduct the astrologer's per-minute rate from the user's wallet every 60 seconds
4. WHEN the user's wallet balance falls below the per-minute rate, THE BillingSystem SHALL end the session and notify the user
5. WHEN a user ends a session, THE ChatSystem SHALL save the final duration and total cost to the consultation record
6. WHEN the network connection is lost, THE ChatSystem SHALL display "Reconnecting..." and automatically reconnect when available
7. THE ChatSystem SHALL store all messages in the chat_messages table with sender_type, sender_id, and timestamp
8. WHEN a message fails to send, THE UI SHALL display a retry option for that specific message

#### Correctness Properties

1. **Message Ordering**: FOR ALL messages in a consultation, WHEN sorted by created_at, THE order SHALL match the chronological order of sending
2. **Billing Accuracy**: FOR ALL active chat sessions, WHEN session duration is N minutes, THE total cost SHALL equal N × price_per_minute
3. **Wallet Depletion**: FOR ALL chat sessions, WHEN wallet balance reaches zero, THE session SHALL terminate within 60 seconds
4. **Real-Time Delivery**: FOR ALL messages sent, WHEN the recipient is online, THE message SHALL appear in the recipient's UI within 2 seconds

---

### Requirement 5: Razorpay Payment Integration

**User Story:** As a user, I want to add money to my wallet using Razorpay, so that I can pay for consultations.

#### Acceptance Criteria

1. WHEN a user initiates a wallet top-up, THE PaymentSystem SHALL create a Razorpay order with the specified amount
2. WHEN the payment is successful, THE PaymentSystem SHALL credit the wallet balance within 5 seconds
3. WHEN the payment is successful, THE PaymentSystem SHALL create a wallet_transactions record with type='credit' and source='topup'
4. WHEN the payment fails, THE PaymentSystem SHALL display the error message and NOT modify the wallet balance
5. WHEN a user cancels the payment, THE PaymentSystem SHALL not modify the wallet balance
6. THE PaymentSystem SHALL support amounts between ₹10 and ₹50,000
7. WHEN a payment is processed, THE PaymentSystem SHALL verify the Razorpay signature to prevent tampering
8. THE PaymentSystem SHALL use the Razorpay webhook for payment confirmation in addition to client-side callbacks

#### Correctness Properties

1. **Balance Consistency**: FOR ALL successful payments of amount A, THE wallet_balance SHALL increase by exactly A
2. **Transaction Record**: FOR ALL successful payments, THE wallet_transactions table SHALL contain exactly one record with matching amount and payment_id
3. **Idempotency**: FOR ALL duplicate webhook calls with the same payment_id, THE PaymentSystem SHALL process the payment exactly once
4. **Signature Verification**: FOR ALL payment verifications, WHEN the signature is invalid, THE PaymentSystem SHALL reject the payment

---

## Phase 2: Make It Reliable

### Requirement 6: Error Boundaries on All Screens

**User Story:** As a user, I want the app to gracefully handle errors without crashing, so that I can continue using other features.

#### Acceptance Criteria

1. WHEN a JavaScript error occurs in any screen, THE ErrorBoundary SHALL catch the error and display a fallback UI
2. THE ErrorBoundary fallback UI SHALL display "Something went wrong", an error description, a "Try Again" button, and a "Go Home" button
3. WHEN the "Try Again" button is pressed, THE ErrorBoundary SHALL reset its state and re-render the child components
4. WHEN the "Go Home" button is pressed, THE ErrorBoundary SHALL navigate to the home screen
5. WHEN an error is caught, THE ErrorBoundary SHALL log the error to the Logger service
6. IN DEVELOPMENT MODE, THE ErrorBoundary SHALL display the full error stack trace
7. IN PRODUCTION MODE, THE ErrorBoundary SHALL hide the error stack trace
8. THE App SHALL wrap all top-level screens with ErrorBoundary components
9. THE App SHALL wrap feature-specific components with FeatureErrorBoundary for granular error handling

#### Correctness Properties

1. **Error Isolation**: FOR ALL errors in a feature component wrapped in ErrorBoundary, THE error SHALL NOT crash the parent component
2. **Recovery**: FOR ALL ErrorBoundary instances, WHEN "Try Again" is pressed, THE component SHALL re-render without the previous error state
3. **Logging**: FOR ALL caught errors, THE Logger SHALL receive the error object and component stack

---

### Requirement 7: Structured Logging with Logger Service

**User Story:** As a developer, I want all application events logged through the Logger service, so that I can debug issues in production.

#### Acceptance Criteria

1. WHEN console.log is called in production code, THE Codebase SHALL be refactored to use Logger.info instead
2. WHEN console.warn is called in production code, THE Codebase SHALL be refactored to use Logger.warn instead
3. WHEN console.error is called in production code, THE Codebase SHALL be refactored to use Logger.error instead
4. IN DEVELOPMENT MODE, THE Logger SHALL output logs to the console with [DEBUG], [INFO], [WARN], [ERROR] prefixes
5. IN PRODUCTION MODE, THE Logger SHALL send errors to Sentry and add breadcrumbs for info/warn messages
6. WHEN Logger.error is called, THE Logger SHALL include the error object and any context in the Sentry report
7. WHEN Logger.action is called, THE Logger SHALL add a user_action breadcrumb for tracking user interactions
8. WHEN Logger.navigation is called, THE Logger SHALL add a navigation breadcrumb for tracking screen transitions
9. THE Codebase SHALL NOT contain any direct console.log/warn/error calls in production code files

#### Correctness Properties

1. **Console Replacement**: FOR ALL production source files, WHEN searched for console.(log|warn|error), THE count SHALL be zero (excluding node_modules and test files)
2. **Sentry Integration**: FOR ALL Logger.error calls in production, THE Sentry SHALL receive an exception or message
3. **Breadcrumb Trail**: FOR ALL user actions logged with Logger.action, THE Sentry breadcrumb count SHALL increase

---

### Requirement 8: Loading States Implementation

**User Story:** As a user, I want to see loading indicators while data is being fetched, so that I know the app is working and not frozen.

#### Acceptance Criteria

1. WHEN a screen is loading initial data, THE UI SHALL display an ActivityIndicator with a descriptive message
2. WHEN a button action is in progress, THE Button SHALL display a loading spinner and disable interaction
3. WHEN a list is loading more items, THE UI SHALL display a "Loading more..." indicator at the bottom
4. WHEN a form is submitting, THE Submit Button SHALL display "Saving..." and disable the form
5. WHEN an image is loading, THE Image SHALL display a placeholder or skeleton
6. WHEN a screen has multiple data sources, THE UI SHALL show skeleton loaders for each section independently
7. THE LoadingState component SHALL be used consistently across all screens
8. WHEN data loading fails, THE UI SHALL transition from loading state to error state

#### Correctness Properties

1. **Loading Indicator Presence**: FOR ALL async operations that take more than 200ms, THE UI SHALL display a loading indicator
2. **Button Disable State**: FOR ALL buttons with async actions, WHEN isLoading is true, THE button SHALL be disabled
3. **Skeleton Accuracy**: FOR ALL skeleton loaders, THE layout SHALL match the expected content layout

---

### Requirement 9: Sentry Error Tracking

**User Story:** As a developer, I want all production errors tracked in Sentry, so that I can identify and fix issues users encounter.

#### Acceptance Criteria

1. WHEN the app starts in production, THE SentryService SHALL initialize with the configured DSN
2. WHEN an unhandled error occurs, THE SentryService SHALL capture the exception with full stack trace
3. WHEN an error is captured, THE SentryService SHALL include user context (id, phone, subscription tier) if authenticated
4. WHEN an error is captured, THE SentryService SHALL include device context (OS, version, device name)
5. WHEN a user navigates between screens, THE SentryService SHALL add navigation breadcrumbs
6. WHEN a user performs an action, THE SentryService SHALL add user action breadcrumbs
7. WHEN an API call fails, THE SentryService SHALL add an HTTP breadcrumb with the endpoint and status code
8. THE SentryService SHALL NOT capture errors in development mode to avoid noise
9. WHEN an error occurs, THE SentryService SHALL sample performance transactions at 20% rate

#### Correctness Properties

1. **Error Capture**: FOR ALL unhandled errors in production, THE Sentry SHALL receive an event within 5 seconds
2. **User Context**: FOR ALL errors by authenticated users, THE Sentry event SHALL include user.id
3. **Breadcrumb Limit**: FOR ALL Sentry events, THE breadcrumb count SHALL be limited to the last 100 events

---

### Requirement 10: Push Notifications

**User Story:** As a user, I want to receive push notifications for important events, so that I don't miss consultations or updates.

#### Acceptance Criteria

1. WHEN a consultation is booked, THE NotificationService SHALL send a push notification to the astrologer
2. WHEN an astrologer accepts a consultation, THE NotificationService SHALL send a push notification to the user
3. WHEN a chat message is received while the app is in background, THE NotificationService SHALL display a notification with the message preview
4. WHEN a wallet top-up is successful, THE NotificationService SHALL send a confirmation notification
5. WHEN a subscription is about to expire in 3 days, THE NotificationService SHALL send a renewal reminder
6. WHEN a user taps a notification, THE App SHALL navigate to the relevant screen (chat, consultation, wallet)
7. WHEN a user disables notifications in settings, THE NotificationService SHALL stop sending notifications to that user
8. THE NotificationService SHALL request notification permissions on first launch
9. THE NotificationService SHALL store the device push token in the users table

#### Correctness Properties

1. **Notification Delivery**: FOR ALL notification events, WHEN the user has notifications enabled, THE notification SHALL be delivered within 30 seconds
2. **Deep Linking**: FOR ALL notification taps, THE App SHALL navigate to the correct screen based on notification type
3. **Token Persistence**: FOR ALL users who grant notification permission, THE push token SHALL be stored in the database

---

## Phase 3: Make It Complete

### Requirement 11: Agora Video Call Integration

**User Story:** As a user, I want to have video consultations with astrologers, so that I can have a more personal interaction.

#### Acceptance Criteria

1. WHEN a user starts a video consultation, THE AgoraService SHALL join the video channel within 3 seconds
2. WHEN a video call is active, THE UI SHALL display both the user's local video preview and the astrologer's remote video
3. WHEN a user taps the mute button, THE AgoraService SHALL mute the local audio stream
4. WHEN a user taps the camera toggle, THE AgoraService SHALL disable the local video stream
5. WHEN a user taps the speaker button, THE AgoraService SHALL switch between speaker and earpiece audio output
6. WHEN a user taps the end call button, THE AgoraService SHALL leave the channel and update the consultation status
7. WHEN the network quality drops, THE AgoraService SHALL display a "Poor connection" indicator
8. WHEN the call duration reaches the wallet-depletion threshold, THE AgoraService SHALL display a low balance warning
9. WHEN a call ends, THE AgoraService SHALL release all video and audio resources
10. THE AgoraService SHALL generate a unique channel name and token for each consultation

#### Correctness Properties

1. **Channel Isolation**: FOR ALL consultations, THE Agora channel SHALL be unique and not shared with other consultations
2. **Resource Cleanup**: FOR ALL ended calls, THE AgoraService SHALL release camera and microphone resources
3. **Token Expiration**: FOR ALL Agora tokens, THE token SHALL be valid for the duration of the consultation plus 5 minutes buffer
4. **Billing Sync**: FOR ALL video consultations, THE billing rate SHALL match the astrologer's price_per_minute

---

### Requirement 12: Wallet Backend Connection

**User Story:** As a user, I want my wallet balance synced with the backend, so that I can access it from any device.

#### Acceptance Criteria

1. WHEN the app starts, THE WalletService SHALL fetch the current balance from the server
2. WHEN a transaction is made, THE WalletService SHALL update the server-side balance and return the new balance
3. WHEN a consultation is billed, THE WalletService SHALL call the debit_wallet RPC function on the server
4. WHEN a top-up is processed, THE WalletService SHALL call the credit_wallet RPC function on the server
5. WHEN the balance is updated, THE WalletService SHALL emit an event to update all subscribed components
6. WHEN a balance check fails, THE WalletService SHALL display the last known balance with a "Sync pending" indicator
7. THE WalletService SHALL maintain a local cache of the last 20 transactions for offline viewing
8. WHEN the user views transaction history, THE WalletService SHALL fetch from the server with pagination

#### Correctness Properties

1. **Balance Consistency**: FOR ALL wallet operations, THE server balance SHALL equal the sum of all transactions
2. **Transaction Atomicity**: FOR ALL debit operations, WHEN the operation fails, THE balance SHALL remain unchanged
3. **Cache Freshness**: FOR ALL cached transactions, WHEN the app comes online, THE WalletService SHALL refresh the cache

---

### Requirement 13: Kundli Data Cloud Sync

**User Story:** As a user, I want my kundli data synced to the cloud, so that I can access it from any device.

#### Acceptance Criteria

1. WHEN a kundli is generated, THE KundliService SHALL save it to the kundlis table in Supabase
2. WHEN the app starts, THE KundliService SHALL fetch all kundlis for the authenticated user
3. WHEN a kundli is deleted, THE KundliService SHALL remove it from the database
4. WHEN a kundli match is performed, THE KundliService SHALL save the match results to kundli_matches table
5. WHEN the network is unavailable, THE KundliService SHALL queue the operation for later sync
6. WHEN the network is restored, THE KundliService SHALL process the queued operations in order
7. THE KundliService SHALL include the calculation_source field indicating 'vedastro' or 'fallback'
8. WHEN a kundli is saved, THE KundliService SHALL include all planetary positions, ascendant, moon sign, sun sign, and mangal dosha status

#### Correctness Properties

1. **Data Integrity**: FOR ALL saved kundlis, THE kundli_data JSON SHALL contain all required planetary positions
2. **User Ownership**: FOR ALL kundlis, THE user_id SHALL match the authenticated user
3. **Round-Trip Preservation**: FOR ALL kundlis, WHEN saved and re-fetched, THE kundli_data SHALL be equivalent to the original
4. **Match Score Consistency**: FOR ALL kundli matches, THE total_score SHALL equal the sum of all individual guna scores

---

### Requirement 14: E2E Tests for Critical Flows

**User Story:** As a developer, I want automated E2E tests for critical user flows, so that I can catch regressions before release.

#### Acceptance Criteria

1. THE TestSuite SHALL include an E2E test for the authentication flow (send OTP, verify OTP, logout)
2. THE TestSuite SHALL include an E2E test for the kundli generation flow (enter birth details, generate kundli, view results)
3. THE TestSuite SHALL include an E2E test for the astrologer browsing flow (view list, filter, view profile)
4. THE TestSuite SHALL include an E2E test for the consultation booking flow (select astrologer, choose time, confirm)
5. THE TestSuite SHALL include an E2E test for the wallet top-up flow (enter amount, complete payment, verify balance)
6. THE TestSuite SHALL include an E2E test for the chat flow (send message, receive response, end session)
7. WHEN the E2E tests are run, THE TestRunner SHALL execute against a staging environment
8. WHEN an E2E test fails, THE TestRunner SHALL capture a screenshot and logs
9. THE E2E tests SHALL run on both iOS and Android simulators

#### Correctness Properties

1. **Test Coverage**: FOR ALL critical user flows defined, THE TestSuite SHALL contain at least one E2E test
2. **Test Isolation**: FOR ALL E2E tests, WHEN a test completes, THE test data SHALL be cleaned up
3. **Assertion Reliability**: FOR ALL E2E test assertions, WHEN the assertion fails, THE failure message SHALL clearly indicate what was expected vs actual

---

### Requirement 15: Staging Environment Setup

**User Story:** As a developer, I want a staging environment that mirrors production, so that I can test changes before releasing to users.

#### Acceptance Criteria

1. WHEN a pull request is created, THE CI/CD Pipeline SHALL deploy to the staging environment
2. THE Staging Environment SHALL use a separate Supabase project with its own database
3. THE Staging Environment SHALL use Razorpay test mode for payment testing
4. THE Staging Environment SHALL use Agora's test app ID for video call testing
5. THE Staging Environment SHALL have its own Sentry project for error tracking
6. WHEN deployed to staging, THE App SHALL display a "Staging" badge in the UI
7. THE Staging Environment SHALL be accessible via Expo Go or a staging build
8. WHEN a release is created, THE CI/CD Pipeline SHALL promote staging to production after manual approval
9. THE Staging Database SHALL be seeded with test data (test users, astrologers, consultations)

#### Correctness Properties

1. **Environment Isolation**: FOR ALL staging resources, THE configuration SHALL NOT reference production resources
2. **Data Isolation**: FOR ALL staging database tables, THE data SHALL be separate from production data
3. **Deployment Consistency**: FOR ALL staging deployments, THE code and configuration SHALL match what would be deployed to production

---

## Summary

This requirements document defines 15 requirements across 3 phases to make AstroFusion production-ready:

- **Phase 1 (Make It Usable)**: Database setup, SMS OTP authentication, astrologer listings, real-time chat, and payment integration
- **Phase 2 (Make It Reliable)**: Error boundaries, structured logging, loading states, error tracking, and push notifications
- **Phase 3 (Make It Complete)**: Video calls, wallet sync, kundli cloud sync, E2E tests, and staging environment

Each requirement follows EARS patterns and includes acceptance criteria with measurable conditions. Correctness properties are defined for property-based testing where applicable.