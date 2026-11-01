#!/bin/sh -eu
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "Node >=24 is required (found $(node -v)); see .nvmrc" >&2
  exit 1
fi
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in packages/plgg ==="
cd $REPO_ROOT/packages/plgg && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
