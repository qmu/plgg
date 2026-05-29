#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc:watch' in packages/plgg-server ==="
cd $REPO_ROOT/packages/plgg-server && npm run tsc:watch
