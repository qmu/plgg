#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in src/plgg-view ==="
cd $REPO_ROOT/src/plgg-view && npm run test:watch
