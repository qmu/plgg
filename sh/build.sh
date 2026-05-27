#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run build' in src/plgg, src/plgg-kit, src/plgg-web, and src/plgg-view ==="
cd $REPO_ROOT/src/plgg && npm run build
cd $REPO_ROOT/src/plgg-kit && npm run build
cd $REPO_ROOT/src/plgg-web && npm run build
cd $REPO_ROOT/src/plgg-view && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
