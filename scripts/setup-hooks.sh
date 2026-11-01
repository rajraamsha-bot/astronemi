#!/bin/sh
#
# Setup git hooks path to use the version-controlled .githooks directory.
# Run this once after cloning the repo (or after adding new hooks).
#
# Usage: bash scripts/setup-hooks.sh
#

set -e

echo "🔧 Setting up git hooks..."

# Validate that hook files exist
HOOK_DIR=".githooks"
if [ ! -d "$HOOK_DIR" ]; then
  echo "❌ Error: $HOOK_DIR directory not found. Run this from the project root."
  exit 1
fi

if [ ! -f "$HOOK_DIR/pre-commit" ]; then
  echo "❌ Error: $HOOK_DIR/pre-commit not found."
  exit 1
fi

if [ ! -x "$HOOK_DIR/pre-commit" ]; then
  echo "⚠️  Warning: $HOOK_DIR/pre-commit is not executable. Run: chmod +x $HOOK_DIR/pre-commit"
fi

# Configure git to use .githooks directory instead of .git/hooks
git config core.hooksPath .githooks

echo "✅ Git hooks path set to .githooks/"
echo "   Pre-commit hook: TypeScript typecheck runs before each commit."
echo ""
echo "   To skip hooks for a commit: git commit --no-verify"
