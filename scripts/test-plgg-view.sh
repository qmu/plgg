#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg-view ==="
cd $REPO_ROOT/packages/plgg-view && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
