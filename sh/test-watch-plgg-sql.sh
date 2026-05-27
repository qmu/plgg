#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in src/plgg-sql ==="
cd $REPO_ROOT/src/plgg-sql && npm run test:watch
