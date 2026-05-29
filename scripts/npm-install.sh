#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm install' in packages/plgg, packages/plgg-kit, packages/plgg-foundry, packages/plgg-view, packages/plgg-server, packages/plgg-fetch, packages/plgg-sql, and packages/example ==="
cd $REPO_ROOT/packages/plgg && npm install
cd $REPO_ROOT/packages/plgg-kit && npm install
cd $REPO_ROOT/packages/plgg-foundry && npm install
cd $REPO_ROOT/packages/plgg-view && npm install
cd $REPO_ROOT/packages/plgg-server && npm install
cd $REPO_ROOT/packages/plgg-fetch && npm install
cd $REPO_ROOT/packages/plgg-sql && npm install
cd $REPO_ROOT/packages/example && npm install
echo "\n=== All shell scripts have been executed successfully ==="
