# Secret Rotation & Git History Cleanup

`.env.staging` was committed in `a3d310f` and removed in `889c7df`. Removing the
file does **not** remove it from git history, so every value that was ever in it
must be treated as compromised. This document lists what to rotate and how to
clean history. Values are intentionally not reproduced here.

## 1. Rotate first (do this before sharing the repository)

| Credential | Where to rotate |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → rotate JWT secret / service role key |
| `SUPABASE_ANON_KEY` | Rotated with the project JWT secret in the same step |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account & Settings → API Keys → regenerate |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Webhooks → update secret |
| `AGORA_APP_CERTIFICATE` | Agora Console → Project → App Certificate → regenerate |
| Firebase service account (`FCM_SERVICE_ACCOUNT_JSON`) | Google Cloud Console → IAM → Service Accounts → delete key and create a new one |
| Mixpanel / Google Analytics tokens | Provider dashboard → project settings |
| Sentry DSN / auth token | Sentry → Settings → Client Keys / Auth Tokens |

After rotating, update:

1. Supabase Edge Function secrets (`supabase secrets set ...`).
2. EAS environment variables/secrets (Project → Environment variables).
3. GitHub repository secrets used by `production-checks`.
4. Your local `.env`, `.env.development`, `.env.staging`, `.env.production`
   (these are gitignored; do not commit them).

Verify no secret is tracked:

```bash
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
git grep -nE 'SUPABASE_SERVICE_ROLE_KEY\s*=|RAZORPAY_KEY_SECRET\s*=' -- ':!*.md'
```

## 2. Purge repository history

Only do this after coordinating with everyone who has a clone. Rewriting
history changes every commit hash and requires a force-push.

```bash
# Install git-filter-repo once
pip install git-filter-repo

# Remove the file from all commits
git filter-repo --path .env.staging --invert-paths

# Add the remote back if filter-repo removed it
git remote add origin <your-remote-url>
git push --force --all
git push --force --tags
```

Everyone else must re-clone. Old clones still contain the secrets until deleted.

If the repository was ever public or shared outside the team, assume the
credentials were harvested even if you purge history now. Rotation is the only
remediation that matters; history cleanup limits future exposure.

## 3. Prevent recurrence

- `.gitignore` already excludes `.env`, `.env.*` (except `.env.example`),
  `google-service-account.json`, and keystores.
- CI runs a secret-pattern scan in `.github/workflows/ci.yml`.
- Do not add server-only values to `EXPO_PUBLIC_*` variables — Metro inlines
  them into the client bundle.
- Prefer EAS environment variables / Supabase secrets over committed files.
