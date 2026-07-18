#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plggmatic-example ==="
cd $REPO_ROOT/packages/plggmatic-example && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
