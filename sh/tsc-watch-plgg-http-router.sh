#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc:watch' in src/plgg-http-router ==="
cd $REPO_ROOT/src/plgg-http-router && npm run tsc:watch
