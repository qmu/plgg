#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in src/example-view ==="
cd $REPO_ROOT/src/example-view && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
