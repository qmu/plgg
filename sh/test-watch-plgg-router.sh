#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in src/plgg-router ==="
cd $REPO_ROOT/src/plgg-router && npm run test:watch
