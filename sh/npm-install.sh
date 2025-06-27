#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm install' in src/plgg and src/example ==="
cd $REPO_ROOT/src/plgg && npm install
cd $REPO_ROOT/src/example && npm install
echo "\n=== All shell scripts have been executed successfully ==="

