#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

if [ "${1:-}" = "--sql-consumer" ]; then
  exec "$REPO_ROOT/scripts/gate-sql-consumer.sh"
fi

echo "=== Running 'npm run test' in packages/plgg ==="
cd $REPO_ROOT/packages/plgg && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
