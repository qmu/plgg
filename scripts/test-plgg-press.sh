#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg-press ==="
cd $REPO_ROOT/packages/plgg-press && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
