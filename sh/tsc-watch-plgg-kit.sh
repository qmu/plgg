#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc:watch' in src/plgg-kit ==="
cd $REPO_ROOT/src/plgg-kit && npm run tsc:watch
echo "\n=== All shell scripts have been executed successfully ==="
