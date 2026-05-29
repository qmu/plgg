#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg-router ==="
cd $REPO_ROOT/packages/plgg-router && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
