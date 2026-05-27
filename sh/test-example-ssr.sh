#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in src/example-ssr ==="
cd $REPO_ROOT/src/example-ssr && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
