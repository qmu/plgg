#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Canonical "no direct vite" gate — vite is shed for the in-house bundler.
# Asserts vite is gone as a DIRECT dependency / config / build import across the
# migrated packages, scoped to EXCLUDE packages/guide (its VitePress brings vite
# in transitively, intentionally retained — a naive "zero vite anywhere" gate
# would false-positive on it). One source of truth, reused by
# scripts/check-all.sh AND the run-tests CI workflow, so a PR reintroducing a
# direct vite dep fails both locally and in CI.
echo "=== Gate: no direct vite references ==="
vite_violations=$(
  {
    grep -rln '"vite"\|"vite-plugin-dts"' \
      packages/*/package.json 2>/dev/null
    find packages -name 'vite.config.*' \
      -not -path '*/node_modules/*' \
      -not -path '*/guide/*' 2>/dev/null
    grep -rln 'from "vite"' \
      packages/*/src 2>/dev/null
  } | grep -v '/guide/' || true
)
if [ -n "$vite_violations" ]; then
  echo "VITE GATE FAILED — direct vite found in:"
  echo "$vite_violations"
  exit 1
fi
echo "vite gate passed (direct vite shed; guide's transitive VitePress retained)"
