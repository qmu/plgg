#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
echo "=== Running 'npm run examples' in packages/site ==="
cd $REPO_ROOT/packages/site && npm run examples
echo "\n=== All shell scripts have been executed successfully ==="
