# Astrologer onboarding and seed data

`supabase/migrations/004_seed_astrologers.sql` populates 12 starter
profiles in `public.astrologers` so the directory is not empty for demos
or screenshots. Every seeded row has `user_id = NULL`, which is the
convention that marks it as a placeholder.

## Running the seed

```bash
# Against your local / staging project
supabase db push
```

The seed uses `ON CONFLICT (id) DO NOTHING`, so re-running the
migration is safe.

## Replacing a seed row with a real astrologer

When you onboard a real practitioner:

1. Create their account (they sign up in-app, which creates their
   `public.users` row automatically).
2. Promote the user to astrologer by linking the seed row to their
   user id, or by creating a brand-new astrologer row.

Example: promote an existing user and wire them to the premium seed
slot.

```sql
UPDATE public.astrologers
   SET user_id = '<the users.id uuid>',
       name = 'Real Name',
       avatar = 'https://...',
       bio = '...',
       upi_id = 'real@upi',
       -- leave other fields if you want to keep the seed pricing
       updated_at = NOW()
 WHERE id = '11111111-1111-1111-1111-111111111101';
```

Or insert a fresh row instead of replacing a seed slot:

```sql
INSERT INTO public.astrologers
  (user_id, name, avatar, bio, experience_years, specializations, languages,
   price_per_minute, is_verified, is_available)
VALUES
  ('<users.id>', 'Real Name', 'https://...', 'Bio...',
   10, ARRAY['Vedic','Career'], ARRAY['English','Hindi'],
   50.00, true, true);
```

## Removing seed data before production

Seed rows are easy to spot via `user_id IS NULL`:

```sql
-- Preview what would be deleted
SELECT id, name FROM public.astrologers WHERE user_id IS NULL;

-- Delete all seed rows (once you have real astrologers onboarded)
DELETE FROM public.astrologers WHERE user_id IS NULL;
```

> Do this only after you have real astrologers in the directory. An
> empty `astrologers` table will break the home screen carousel and the
> Astrologers tab.

## Field reference

| Column               | Notes                                                        |
|----------------------|--------------------------------------------------------------|
| `user_id`            | Leave NULL for seed rows. Set when linking to a real account.|
| `name`, `avatar`, `bio` | Public-facing card content.                               |
| `experience_years`   | Integer; shown on profile and influences default sort.       |
| `specializations`    | `text[]` filter chips on the directory.                      |
| `languages`          | `text[]` — filter and used for auto-matching.                |
| `price_per_minute`   | Decimal in INR. Drives chat/call/video billing.              |
| `discount_price`     | Optional promo price. When set, UI shows it crossed out.     |
| `rating`, `total_reviews`, `total_consultations` | Denormalised social proof. |
| `is_verified`        | Green-check badge on the card.                               |
| `is_online`          | Real-time status (set by app heartbeat on the astrologer side). |
| `is_available`       | Manual "accept new consultations" toggle.                    |
| `skills`             | Long-form tags (e.g. specific techniques).                   |
| `certifications`     | Text array; rendered on the profile page.                    |
| `bank_account`, `upi_id` | Payout info, NEVER return to clients; admin/server only. |

## RLS reminders

`public.astrologers` has these policies (from migration 001):

- `Public view astrologers` — anyone can `SELECT`.
- `Astrologers update own` — only the linked `user_id` can `UPDATE`.

Because seed rows have `user_id = NULL`, they cannot be modified from
the app. Only service-role clients (Supabase Studio, server-side
Edge Functions) can change them. That is intentional.
