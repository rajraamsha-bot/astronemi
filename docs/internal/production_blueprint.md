# AstroNemi: Production-Grade System Architecture & Blueprint

This document outlines the expert-level architecture and implementation plan for the AstroNemi Astrology Platform, designed for 10,000+ concurrent users with high security, reliability, and scalability.

## 1. System Architecture Design

### Components Overview
- **Mobile App**: Expo (React Native) for iOS and Android. 100% code sharing.
- **Web Frontend**: Expo Web (React Native Web) hosted on Vercel or Cloudflare Pages for global edge performance.
- **Backend (BaaS)**: Supabase (PostgreSQL + Auth + Storage + Realtime).
- **Custom Business Logic**: Hono on Supabase Edge Functions or AWS Lambda (providing low-latency tRPC/Hono API layer).
- **Astrology Engine**: Distributed microservice to handle complex planetary calculations (e.g., Swiss Ephemeris based).
- **Cache Layer**: Redis for session caching and transient astrology data snapshots.
- **CDN**: Cloudflare for static assets, DDoS protection, and edge caching of API responses.

### Reliability & Scalability
- **Load Balancing**: Supabase handles connection pooling (PgBouncer); Cloudflare handles global traffic distribution.
- **Auto-Scaling**: Serverless architecture for Edge Functions ensures scaling with zero-touch infrastructure.
- **No Single Point of Failure (SPOF)**: Multi-region Supabase replication (Enterprise) and globally distributed CDNs.

---

## 2. Environment Setup & Deployment

### Environment Tiers
| Environment | Purpose | Push Strategy |
| :--- | :--- | :--- |
| **Development** | Local testing & feature branches | Local & PR previews |
| **Staging** | QA, UAT, & Integration tests | Merge to `main` (auto-deploy to staging) |
| **Production** | Live Users | Tagged release (`vX.Y.Z`) after Staging sign-off |

### CI/CD Pipeline (GitHub Actions)
- **Quality Gates**: Pre-merge Linting, Type-checking (TSC), and Unit Testing (Jest).
- **Automated Builds**: EAS Build for Mobile (.aab / .ipa); Vercel for Web.
- **Canary Deployments**: Roll out edge functions to a subset of users before full traffic.

---

## 3. Database Safety & Integrity

- **Schema Evolution**: Using strict Supabase Migrations (`supabase/migrations`).
- **Data Protection**:
    - **Backups**: Daily automated snapshots (Standard) + Point-in-Time Recovery (PITR) for Production.
    - **Soft Deletes**: Implementing `deleted_at` timestamps on critical tables (Users, Bookings, Wallet Transactions) to prevent accidental data loss.
    - **Rollback Strategy**: Always include `down` migrations or have verified clones for rapid recovery.
- **Constraints**: Database-level triggers for integrity (e.g., wallet balance cannot be negative).

---

## 4. Authentication & Security (Production Hardened)

- **Auth System**: Supabase Auth (JWT based) with PKCE flow for mobile.
- **Access Control**: Strict **Row Level Security (RLS)**. No direct "bypass RLS" keys in the client.
- **Bot Mitigation**:
    - **Rate Limiting**: IP-based limiting on Edge Functions via `upstash` or Redis.
    - **WAF**: Cloudflare Web Application Firewall to block common SQLi and XSS patterns.
- **Secrets Management**: No `.env` in Git; use GitHub Secrets + Supabase Vault.

---

## 5. Payment Safety (Razorpay/Stripe Flow)

- **Idempotency**: All payment requests use unique `idempotency-key` to prevent double-charging.
- **Server-to-Server Webhooks**: Verified using SHA-256 signatures to confirm payments.
- **Transaction States**: `PENDING` -> `PROCESSING` -> `COMPLETED` | `FAILED`.
- **Auto-Refunds**: Logic for failedPoojas or unfulfilled consultations to trigger automatic credits.

---

## 6. Error Handling & Monitoring

- **Observability**: **Sentry** integrated for both Frontend (Exception tracking) and Backend (Edge function logs).
- **Performance**: **PostHog** for session recording and conversion funnel analysis.
- **Uptime Monitoring**: **UptimeRobot** checking heartbeats of APIs every 60 seconds.
- **Critical Alerts**: Webhook integration with Slack/PagerDuty for any 5xx errors or server crashes.

---

## 7. Performance & Load Testing

- **Caching Strategy**: Redis layer for Panchang data (which changes daily/hourly but not per user).
- **Image Optimization**: Supabase Image Transformation / Cloudflare Images for high-res astrologer avatars.
- **Load Simulation**: Using `k6` to simulate 10,000 concurrent user spikes during "Grand Pooja" events.

---

## 8. Mobile Responsiveness & Connectivity

- **Offline Mode**: Core planetary data available via local SQLite/AsyncStorage.
- **Resilience**: Exponential backoff for API retries on patchy 4G/5G networks.
- **Mobile-First UI**: 100% responsiveness testing on multiple viewports (iPhone SE to large iPads).

---

## 9. USER Data Protection (Privacy First)

- **GDPR/DPDP Compliance**:
    - Encrypting sensitive Birth Details (exact birth time/lat/long) using AES-256 at the application layer.
    - PII scrubbing in logs.
    - Right-to-forget (Delete Account) deletes all associated S3 storage objects.

---

## 10. Process Management (PM2/Edge)

- **Self-Healing**: Supabase Edge Functions auto-isolate crashes.
- **Zero-Downtime**: Blue-Green deployments via EAS/Store release channels.

---

## 11. Final Pre-Launch Checklist

- [ ] **Security**: RLS verified for all tables; Secrets rotated.
- [ ] **Payments**: Real transactions tested on Production gateways (Stripe/Razorpay).
- [ ] **Backups**: Restore test performed.
- [ ] **E2E Tests**: Critical flows (Login -> Book Pooja -> Payment -> Receipt) passing on CI.
- [ ] **App Stores**: Metadata, Privacy Policy, and App Clip configurations ready.
- [ ] **SLA**: 99.9% uptime target defined and monitoring set.

---

# Tech Stack Summary
- **UI**: React Native (Expo) + Tamagui/Vanilla CSS
- **Backend**: Supabase + Hono (TypeScript)
- **Database**: PostgreSQL (PostGIS for location awareness)
- **Payments**: Razorpay (India) / Stripe (Global)
- **Monitoring**: Sentry + UptimeRobot + PostHog
- **Infrastructure**: Vercel (Web) + Supabase Edge (API) + Cloudflare (DNS)
