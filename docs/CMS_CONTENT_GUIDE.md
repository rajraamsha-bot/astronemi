# AstroNemi CMS content guide

All long-form content in the app (blog posts, news, videos, podcasts,
courses, meditations, mantras) is served from a single Supabase table:
`public.cms_entries`. Seven screens read from this table through
`services/cms.ts` and the `useCmsEntries` hook. There is no separate CMS
application to deploy — you add rows to Supabase and the app picks them
up on the next React Query refetch (5-minute stale time).

## Table shape

Run `supabase/migrations/003_cms_content.sql` once against every
environment. Key columns:

| Column              | Meaning                                                              |
|---------------------|----------------------------------------------------------------------|
| `kind`              | `blog` · `news` · `video` · `podcast` · `course` · `meditation` · `mantra` |
| `slug`              | URL-safe identifier, unique across all kinds                         |
| `title`             | Required                                                             |
| `summary`           | Shown in list cards                                                  |
| `body`              | Long-form content (blog / news)                                      |
| `image_url`         | Cover image (https URL)                                              |
| `media_url`         | Audio / video source for podcasts and videos                         |
| `author_name`       | Blog / news byline                                                   |
| `channel_name`      | Video channel                                                        |
| `host_name`         | Podcast host                                                         |
| `instructor_name`   | Course instructor                                                    |
| `category`          | Filter chip label (e.g. `Transit`, `Beginner`, `Daily`)              |
| `level`             | `Beginner` / `Intermediate` / `Advanced` (courses, meditations)      |
| `duration_seconds`  | Playback / read duration                                             |
| `lessons_count`     | Courses                                                              |
| `episode_number`    | Podcasts                                                             |
| `price_inr`         | 0 for free, else integer rupees                                      |
| `is_premium`        | Locks behind subscription                                             |
| `is_published`      | Toggle to hide drafts without deleting                                |
| `is_featured`       | Hero card on the blog screen                                          |
| `is_trending`       | Trending row on the news screen                                       |
| `metadata`          | JSONB for kind-specific extras                                        |

### Per-kind `metadata` contract

- **Mantra**: `{ "sanskrit": "…", "benefits": ["…", "…"] }`
- All other kinds: free-form; add keys as needed, the hook exposes
  `entry.metadata` unchanged.

## Adding content

Two supported flows:

1. **Supabase Studio (recommended for small batches).** Open the
   `cms_entries` table, click "Insert row", fill the fields. Set
   `is_published = true` when ready.
2. **SQL script / CSV import** for bulk seed. See the `INSERT INTO …`
   block at the bottom of `003_cms_content.sql` for the canonical row
   shape. Re-running the migration is safe — it uses
   `ON CONFLICT (slug) DO NOTHING`.

RLS:

- Any authenticated or anon session can `SELECT` rows where
  `is_published = true`.
- Only admins (users matched by the `is_admin(auth.uid())` helper from
  migration 002) can `INSERT`, `UPDATE`, or `DELETE`.
- Service-role clients bypass RLS and can do anything, which is what
  the Supabase dashboard uses.

## Cache behaviour

- `useCmsEntries(kind, options)` wraps React Query with a 5-minute
  `staleTime` and 15-minute `gcTime`. Content published through the
  dashboard becomes visible to existing clients within 5 minutes, or
  immediately on pull-to-refresh if the screen supports it.
- The hook accepts `category`, `limit`, `onlyFeatured`, and `search`
  options. Search uses a Postgres `ILIKE` on `title` + `summary`.

## Cleanup & deprecation

The seven screens no longer depend on hardcoded `mock*` arrays. If you
ever need to regenerate the initial corpus for a fresh environment,
re-run the migration or call:

```sql
TRUNCATE TABLE public.cms_entries;
-- then re-run the INSERT block in 003_cms_content.sql
```

## Future extensions

- Full-text search: add a `tsvector` column and a GIN index on
  `to_tsvector('english', title || ' ' || summary || ' ' || body)` if
  the ILIKE performance stops being acceptable.
- Localisation: add a `locale` column (default `'en'`) and filter on it
  in `listCmsEntries`. Multiple rows per slug, one per locale.
- Drafts + scheduling: already possible via `is_published = false` and
  `published_at` in the future — the list query already orders on
  `published_at DESC`, just add a `.lte('published_at', now())` filter
  when scheduling is needed.
