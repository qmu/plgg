#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc' in packages/plgg-fetch ==="
cd $REPO_ROOT/packages/plgg-fetch && npm run tsc
echo "\n=== All shell scripts have been executed successfully ==="
