#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
# --------- (End of Boilerplate) ---------

echo "=== Running npm runt test for plgg package ==="
cd $REPO_ROOT/src/plgg && npm run build
echo "\n=== All packages have been installed successfully ==="
