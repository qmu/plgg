#!/bin/sh -eu
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
# Run installs, compilation and tests on Node 24 even on the Node 22 backstop.
if [ "$(node -p 'process.versions.node.split(".")[0]')" = 24 ]; then
  exec node "$REPO_ROOT/scripts/parserConsumer.ts"
fi
exec npx --yes --package=node@24 -- node "$REPO_ROOT/scripts/parserConsumer.ts"
