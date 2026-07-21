#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg-ir-thesis ==="
cd $REPO_ROOT/packages/plgg-ir-thesis && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
