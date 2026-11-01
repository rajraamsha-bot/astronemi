---
description: How to deploy AstroNemi to production
---

# 🚀 Deployment Guide: AstroNemi

Follow these steps to take your app from development to live on the App Store and Google Play.

## 1. Backend Setup (Supabase)

1.  **Create Project**: Go to [Supabase](https://supabase.com) and create a new project.
2.  **Run Migrations**:
    - Go to the **SQL Editor** in your Supabase dashboard.
    - Copy the contents of `supabase/migrations/001_initial_schema.sql` from your project.
    - Paste and **Run** the SQL to set up your tables and RLS policies.
3.  **Auth Configuration**:
    - Go to **Authentication > Providers**.
    - Enable **Phone** authentication.
    - Configure your SMS provider (Twilio or MessageBird) for OTP.
4.  **Storage**:
    - Create a public bucket named `astrologer-avatars`.
    - Create a public bucket named `product-images`.

## 2. Environment Variables

1.  Create a `.env` file in the root directory (copy from `.env.production`).
2.  Fill in the following:
    - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
    - `EXPO_PUBLIC_RAZORPAY_KEY_ID`: Your Razorpay Live/Test Key.
    - `EXPO_PUBLIC_GEMINI_API_KEY`: Your Google Gemini API Key.
    - `EXPO_PUBLIC_AGORA_APP_ID`: Your Agora App ID (for video calls).

## 3. Payment Gateway (Razorpay)

1.  Sign up at [Razorpay](https://razorpay.com).
2.  Generate **API Keys** from the Settings dashboard.
3.  Configure the **Webhook** to point to your Supabase Edge Function:
    - URL: `https://[your-project-ref].supabase.co/functions/v1/verify-payment`
    - Events: `payment.captured`, `order.paid`

## 4. Build and Distribute (EAS)

1.  **Install EAS CLI**: `npm install -g eas-cli`
2.  **Login**: `eas login`
3.  **Configure Project**: `eas build:configure`
4.  **Build for Android**:
    - `eas build --platform android --profile production`
5.  **Build for iOS**:
    - `eas build --platform ios --profile production`
6.  **Submit**:
    - Android: `eas submit --platform android`
    - iOS: `eas submit --platform ios`

## 5. Post-Deployment

1.  Monitor errors using **Sentry**.
2.  Track user engagement with **Mixpanel**.
3.  Update the **Privacy Policy** and **Terms** in `app/privacy-policy.tsx` and `app/terms.tsx`.

---

**Note**: Ensure you have tested the "verified" flag for astrologers in your database to show them on the home screen!
