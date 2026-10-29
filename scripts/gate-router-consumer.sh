#!/bin/sh -eu
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$REPO_ROOT"
# Always execute Node 24, including on the Node 22 backstop runner.
# npm exec supplies only the runtime; the consumer installs its OWN TS7.
exec npm exec --yes --package=node@24 -- node --test scripts/consumer/router.spec.ts
