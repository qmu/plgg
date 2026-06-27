#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc' in packages/plgg-db-migration ==="
cd $REPO_ROOT/packages/plgg-db-migration && npm run tsc
echo "\n=== All shell scripts have been executed successfully ==="
