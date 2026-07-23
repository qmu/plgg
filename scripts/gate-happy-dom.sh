#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Canonical "no happy-dom" gate — happy-dom is shed for plgg-test's own
# in-house DOM environment (`// @plgg-test-environment dom`). Asserts happy-dom
# is gone as a DIRECT dependency of every package AND unreferenced in any
# package's source (no import, no `happyDOM` accessor, no legacy
# `@vitest-environment` pragma). One source of truth, reused by
# scripts/check-all.sh AND the run-tests CI workflow, so a PR reintroducing
# happy-dom fails both locally and in CI.
echo "=== Gate: no happy-dom references ==="
violations=$(
  {
    grep -rln '"happy-dom"' \
      packages/*/package.json 2>/dev/null
    grep -rln 'happy-dom\|happyDOM\|@vitest-environment' \
      packages/*/src 2>/dev/null
  } || true
)
if [ -n "$violations" ]; then
  echo "HAPPY-DOM GATE FAILED — happy-dom found in:"
  echo "$violations"
  exit 1
fi
echo "happy-dom gate passed (in-house DOM everywhere; happy-dom fully retired)"
