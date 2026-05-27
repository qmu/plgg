#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc' in src/plgg-sql ==="
cd $REPO_ROOT/src/plgg-sql && npm run tsc
echo "\n=== All shell scripts have been executed successfully ==="
