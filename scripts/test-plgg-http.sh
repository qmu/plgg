#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg-http ==="
cd $REPO_ROOT/packages/plgg-http && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
