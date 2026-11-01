#!/usr/bin/env bash
# scripts/consolidate-edge-functions.sh
#
# CRITICAL-3 from production readiness review:
#   Two parallel Edge Function trees exist:
#     - backend/supabase/functions/   (CI/CD deploys THIS one)
#     - supabase/functions/           (left over from local dev)
#   These have drifted apart. The CI deploys backend/supabase/functions/,
#   so supabase/functions/ is dead code that's lying to you.
#
# This script:
#   1. Verifies which tree is the source of truth
#   2. Archives the dead tree to .archive/ so it's still recoverable
#   3. Removes the dead tree
#   4. Leaves a marker file explaining what happened
#
# Run this from the repo root. The script refuses to run unless you
# pass --i-understand-this-deletes-files.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ "${1:-}" != "--i-understand-this-deletes-files" ]]; then
  echo "ERROR: refusing to run without confirmation flag." >&2
  echo "       Run: bash scripts/consolidate-edge-functions.sh --i-understand-this-deletes-files" >&2
  exit 2
fi

SOURCE_OF_TRUTH="backend/supabase/functions"
DEAD_TREE="supabase/functions"
ARCHIVE_DIR=".archive/edge-functions-supabase-$(date -u +%Y%m%dT%H%M%SZ)"

if [[ ! -d "$SOURCE_OF_TRUTH" ]]; then
  echo "ERROR: $SOURCE_OF_TRUTH does not exist. This is the CI-deployed tree." >&2
  echo "       Aborting — do not delete anything." >&2
  exit 3
fi

if [[ ! -d "$DEAD_TREE" ]]; then
  echo "INFO: $DEAD_TREE does not exist. Nothing to consolidate." >&2
  exit 0
fi

echo "==> Archiving $DEAD_TREE → $ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR"
cp -R "$DEAD_TREE"/. "$ARCHIVE_DIR"/

echo "==> Removing $DEAD_TREE"
rm -rf "$DEAD_TREE"

cat > "$DEAD_TREE/.consolidated" <<EOF
This directory was consolidated on $(date -u +%Y-%m-%dT%H:%M:%SZ).

The canonical Edge Function tree is now: backend/supabase/functions/

The original contents of this directory were archived to:
  $ARCHIVE_DIR

Reason: The two trees had drifted apart with different implementations
of verify-payment, razorpay-webhook, and credit_wallet calls. The CI/CD
pipeline (github.com/.../workflows/ci-cd.yml) deploys from
backend/supabase/functions/, so this tree was dead code.

If you need to recover the old functions, restore from the archive
directory and reconcile the differences with the canonical tree
manually.
EOF

# Make the marker file readable as a directory entry, not a real folder.
rmdir "$DEAD_TREE" 2>/dev/null || true

echo
echo "DONE. Source of truth: $SOURCE_OF_TRUTH"
echo "Archive:              $ARCHIVE_DIR"
echo
echo "Next steps:"
echo "  1. git add -A && git commit -m 'chore: consolidate edge function tree (CRITICAL-3)'"
echo "  2. Re-deploy functions: supabase functions deploy --project-ref \$SUPABASE_PROJECT_REF"
echo "  3. Verify deployment:    supabase functions list --project-ref \$SUPABASE_PROJECT_REF"
