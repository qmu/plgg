#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in packages/plgg-sql ==="
cd $REPO_ROOT/packages/plgg-sql && npm run test:watch
