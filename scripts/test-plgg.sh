#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Explicit network gate for the live registry artifact; no workspace build.
if [ "${1:-}" = "--public-plgg-test" ]; then
  shift
  exec node "$REPO_ROOT/scripts/publicTestConsumer.ts" "$@"
fi

echo "=== Running 'npm run test' in packages/plgg ==="
cd $REPO_ROOT/packages/plgg && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
