#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg-poc4b-coedit ==="
cd $REPO_ROOT/packages/plgg-poc4b-coedit && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
