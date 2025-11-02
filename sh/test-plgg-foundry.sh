#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test' in src/llm ==="
cd $REPO_ROOT/src/llm && npm run test
echo "\n=== All shell scripts have been executed successfully ==="
