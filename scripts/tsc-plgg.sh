#!/bin/sh -eu
# Explicit release-shaped family consumer gate (requires Node 24 + network).
if [ "${1:-}" = "--public-consumer" ]; then
  exec "$(dirname "$0")/gate-public-consumer.sh"
fi
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc' in packages/plgg ==="
cd $REPO_ROOT/packages/plgg && npm run tsc
echo "\n=== All shell scripts have been executed successfully ==="
