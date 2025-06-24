#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
# --------- (End of Boilerplate) ---------

echo "=== Running 'npm run build' in src/plgg ==="
cd $REPO_ROOT/src/plgg && npm run build
echo "\n=== All packages have been installed successfully ==="
