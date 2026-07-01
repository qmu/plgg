#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Canonical "no direct vite" gate — vite is shed for the in-house bundler.
# Asserts vite is gone as a DIRECT dependency / config / build import across
# EVERY package, the guide included: now that the guide is built by plgg-press
# (VitePress removed), there is no transitive vite anywhere left to exempt. One
# source of truth, reused by scripts/check-all.sh AND the run-tests CI workflow,
# so a PR reintroducing a direct vite dep fails both locally and in CI.
echo "=== Gate: no direct vite references ==="
vite_violations=$(
  {
    grep -rln '"vite"\|"vite-plugin-dts"' \
      packages/*/package.json 2>/dev/null
    find packages -name 'vite.config.*' \
      -not -path '*/node_modules/*' 2>/dev/null
    grep -rln 'from "vite"' \
      packages/*/src 2>/dev/null
  } || true
)
if [ -n "$vite_violations" ]; then
  echo "VITE GATE FAILED — direct vite found in:"
  echo "$vite_violations"
  exit 1
fi

# VitePress is fully retired: assert neither vitepress nor its TypeDoc theme
# lingers as a dependency in ANY package.json (a reintroduction would drag vite
# back in transitively, defeating the gate above).
vitepress_violations=$(
  grep -rln '"vitepress"\|"typedoc-vitepress-theme"' \
    packages/*/package.json 2>/dev/null || true
)
if [ -n "$vitepress_violations" ]; then
  echo "VITE GATE FAILED — vitepress / typedoc-vitepress-theme found in:"
  echo "$vitepress_violations"
  exit 1
fi
echo "vite gate passed (direct vite shed everywhere; vitepress fully retired)"
