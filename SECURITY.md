# Security Policy

## Supported Versions

AstroNemi is currently in pre-launch (v1.0.0). Security updates will be
provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in AstroNemi, please report it
privately. **Do not** open a public GitHub issue.

### How to report

Email: **security@astronemi.app**

Include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact (e.g., data exposure, RCE, privilege escalation)
- Any proof-of-concept code (if available)
- Your name / handle (for credit in the security acknowledgements)

### What to expect

| Timeline | Action |
| -------- | ------ |
| Within 24 hours | Acknowledgement of your report |
| Within 72 hours | Initial triage and severity classification |
| Within 7 days | Status update and proposed remediation timeline |
| Within 30 days (critical) | Patch released and deployed |
| Within 90 days (high) | Patch released and deployed |

We follow **coordinated disclosure**. Please give us a reasonable amount
of time to fix the issue before disclosing it publicly.

### What we will NOT do

- We will not threaten legal action against security researchers acting
  in good faith.
- We will not pursue DMCA takedowns against legitimate security research.
- We will not ban or restrict your account for reporting a bug.

### Out of scope

The following are explicitly out of scope for our security programme:
- Denial-of-service attacks against our infrastructure
- Social engineering of staff or users
- Physical attacks against our offices or data centres
- Issues in third-party libraries that are not exploitable through our code

## Severity Classification

We use CVSS v3.1 to classify reported vulnerabilities:

| Severity | CVSS Score | Examples |
| -------- | ---------- | -------- |
| Critical | 9.0–10.0   | Remote code execution, full database compromise |
| High     | 7.0–8.9    | Authentication bypass, payment fraud, PII exposure |
| Medium   | 4.0–6.9    | Stored XSS in admin contexts, vertical privilege escalation |
| Low      | 0.1–3.9    | Reflected XSS, information disclosure of non-sensitive data |

## Recognition

We maintain a [Security Hall of Fame](docs/SECURITY_HALL_OF_FAME.md) for
researchers who have helped improve AstroNemi's security.

## Security Architecture Summary

AstroNemi's security model (as of v1.0.0):

- **Authentication**: Phone OTP via Supabase Auth. CSPRNG device IDs
  (`expo-crypto`). Server-enforced two-device cap via the `public.devices`
  table and `bind_device()` / `revoke_device()` RPCs (migration 036). Login
  fails closed if binding fails; the client cannot clear a local list to
  bypass the limit.
- **Authorization**: Server-enforced `is_admin` / `is_super_admin` boolean
  columns on the `users` table. RLS policies call the `is_admin(uid)`
  SECURITY DEFINER function. **There is no client-side role check** —
  subscription tier does NOT grant admin.
- **Payments**: Razorpay with HMAC-SHA256 signature verification and
  constant-time comparison. Idempotency via the `payment_id` column.
  Two parallel paths: client `verify-payment` (fast path) and
  `razorpay-webhook` (source of truth).
- **Wallet**: All credit/debit operations go through server-side
  `credit_wallet` / `debit_wallet` RPCs. No client-side mutation.
- **Secrets**: Server-side secrets (`RAZORPAY_KEY_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, etc.) live in Supabase Edge Function
  secrets, never in the client bundle.
- **Audit**: `audit_logs` table populated via the `log_audit()` RPC.
  Readable only by super_admins.
- **Rate limiting**: Server-side via the `rate_limit_hits` table.
  Client-side via the `RateLimiter` service (defence in depth).
- **PII**: Error reporting sanitizes sensitive fields (password, token,
  key, otp, authorization, bearer, credit_card, cvv, pin).

## Contact

- Security email: security@astronemi.app
- General support: support@astronemi.app
- GPG key: <https://astronemi.app/.well-known/security.txt>
