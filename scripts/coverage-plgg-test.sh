#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run coverage' in packages/plgg-test ==="
cd $REPO_ROOT/packages/plgg-test && npm run coverage
echo "\n=== All shell scripts have been executed successfully ==="
