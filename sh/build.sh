#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run build' in src/plgg, src/plgg-kit, src/plgg-view, src/plgg-web, and src/plgg-sql ==="
cd $REPO_ROOT/src/plgg && npm run build
cd $REPO_ROOT/src/plgg-kit && npm run build
# plgg-view before plgg-web: plgg-web's View feature depends on plgg-view's dist.
cd $REPO_ROOT/src/plgg-view && npm run build
cd $REPO_ROOT/src/plgg-web && npm run build
cd $REPO_ROOT/src/plgg-sql && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
