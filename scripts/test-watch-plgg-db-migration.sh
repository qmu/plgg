#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in packages/plgg-db-migration ==="
cd $REPO_ROOT/packages/plgg-db-migration && npm run test:watch
