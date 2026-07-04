#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Canonical vendor-boundary gate (ticket 20260704185201). Enforces the company
# vendor-isolation policy as a machine-checked rule: a third-party import
# (node:*, the tsc API, any bare non-plgg specifier — the repo has zero
# third-party npm RUNTIME deps) may appear in PRODUCTION code ONLY under a
# package's src/vendors/ or src/entrypoints/ (the anti-corruption boundary and
# the thin program checkpoints). A package with a violation must be listed in
# scripts/vendor-boundary-exemptions.txt; an exempted-but-clean package is a
# STALE exemption. plgg and plgg-db-migration pass unexempted.
#
# One source of truth, reused by scripts/check-all.sh AND the run-tests CI
# workflow (which invokes check-all.sh), so a PR that leaks a vendor import into
# an unexempted package's domain fails both locally and in CI.
#
# The analyzer uses the already-present `typescript` package (resolved from
# plgg-bundle) — zero new dependencies. If plgg-bundle's deps are not yet
# installed (a fresh tree where gates run before build.sh's own bootstrap),
# install them here, idempotently — mirroring scripts/build.sh.
echo "=== Gate: vendor boundary (third-party imports confined to vendors/ + entrypoints/) ==="
if [ ! -d "$REPO_ROOT/packages/plgg-bundle/node_modules/typescript" ]; then
  echo "=== Bootstrapping plgg-bundle deps (typescript, for the boundary analyzer) ==="
  cd "$REPO_ROOT/packages/plgg-bundle" && npm ci && cd "$REPO_ROOT"
fi

# 1. Prove the gate logic itself is sound (red on a violation / stale exemption,
#    green on a clean tree) every run — the self-test the ticket requires.
node scripts/vendor-boundary-analyzer.mjs --self-test

# 2. Enforce the boundary across every package against the exemption list.
node scripts/vendor-boundary-analyzer.mjs
