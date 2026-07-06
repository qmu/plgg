#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc:watch' in packages/plgg-domain ==="
cd $REPO_ROOT/packages/plgg-domain && npm run tsc:watch
