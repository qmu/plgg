#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in src/plgg-fetch ==="
cd $REPO_ROOT/src/plgg-fetch && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
