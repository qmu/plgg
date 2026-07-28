#!/bin/sh -eu
# Gate: the plgg-test SCHEDULER behaves identically on Node, Deno and Bun.
#
# The mission's hard constraint is cross-runtime parity — it is why the runner
# uses promises and child processes and never `worker_threads`, `cluster`, or a
# native addon. A constraint nothing executes is a comment, so this runs the
# scheduler for real on every runtime present and fails if any disagrees.
#
# The smoke (packages/plgg-test/fixtures/crossRuntimeSmoke.ts) drives a fixture
# that exercises the whole contract: independent tests overlap, a
# `suite.serial` block stays indivisible, and the report keeps registration
# order regardless. It exits non-zero if any of that does not hold.
#
# NODE IS THE RUNTIME THAT NEEDS HELP HERE, not the other two. Node cannot
# resolve the `./x.js` specifiers TypeScript source uses without plgg-test's
# own `--import` resolver hook; Deno and Bun both do it natively. So the Node
# invocation carries flags and the others do not — the opposite of what
# "cross-runtime support" usually looks like.
#
# Deno and Bun are OPTIONAL: absent, they are reported as skipped rather than
# failing the gate, so a machine without them still runs check-all. Node is
# mandatory.
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

PKG="$REPO_ROOT/packages/plgg-test"
SMOKE="fixtures/crossRuntimeSmoke.ts"
REGISTER="file://$PKG/src/Resolve/register.mjs"

echo "=== Gate: cross-runtime scheduler parity ==="

FAILED=""

echo "--- node ---"
( cd "$PKG" && node --experimental-strip-types --no-warnings \
    --import "$REGISTER" "$SMOKE" ) || FAILED="$FAILED node"

if command -v deno >/dev/null 2>&1; then
  echo "--- deno ---"
  ( cd "$PKG" && deno run -A "$SMOKE" ) || FAILED="$FAILED deno"
else
  echo "--- deno: not installed, skipped ---"
fi

if command -v bun >/dev/null 2>&1; then
  echo "--- bun ---"
  ( cd "$PKG" && bun "$SMOKE" ) || FAILED="$FAILED bun"
else
  echo "--- bun: not installed, skipped ---"
fi

if [ -n "$FAILED" ]; then
  echo "cross-runtime gate FAILED on:$FAILED" >&2
  exit 1
fi

echo "cross-runtime gate passed"
