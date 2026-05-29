#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run build' in packages/plgg, packages/plgg-kit, packages/plgg-view, packages/plgg-router, packages/plgg-server, packages/plgg-fetch, and packages/plgg-sql ==="
cd $REPO_ROOT/packages/plgg && npm run build
cd $REPO_ROOT/packages/plgg-kit && npm run build
# plgg-router: a pure path toolkit depending only on plgg core (no plgg-view).
cd $REPO_ROOT/packages/plgg-router && npm run build
cd $REPO_ROOT/packages/plgg-view && npm run build
# plgg-server after plgg-view: its View feature renders plgg-view's Html (its dist).
cd $REPO_ROOT/packages/plgg-server && npm run build
# plgg-fetch after plgg-server: it consumes plgg-server's dist (shared HTTP model).
cd $REPO_ROOT/packages/plgg-fetch && npm run build
cd $REPO_ROOT/packages/plgg-sql && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
