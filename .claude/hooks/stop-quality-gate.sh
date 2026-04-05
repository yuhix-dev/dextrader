#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

if command -v bun >/dev/null 2>&1; then
  if ! OUTPUT=$(bun run typecheck && bun test 2>&1); then
    echo "[Quality Gate] bun typecheck/test failed." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi
else
  # Fallback for environments without Bun.
  if ! OUTPUT=$(npx jest --runInBand --passWithNoTests 2>&1); then
    echo "[Quality Gate] jest fallback failed." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi
fi

exit 0
