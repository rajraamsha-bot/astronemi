# Supabase migrations

Apply the SQL files in this directory in filename order.

The canonical chain is `001_initial_schema.sql` through
`067_iap_subscription_passes.sql`. Files with suffixes such as `001b` and
`001c` are reconciliation migrations and must remain in the chain.

The Supabase GitHub integration runs migrations on the production branch when a
new commit is pushed or a pull request is merged. This README is a non-SQL file
used to trigger that deployment after connecting the repository; it is not a
migration.

Before deploying, confirm `supabase/config.toml` `project_id` matches the
connected Supabase project ref.
