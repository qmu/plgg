#!/bin/sh -eu
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$REPO_ROOT"
# Runtime is explicit even when the caller uses the Node 22 backstop.
# Build from current sources before generating the isolated consumer.
exec npm exec --yes --package=node@24 -- sh -eu -c '
  npm run build -w plgg-bundle
  npm run build -w plgg
  npm run build -w plgg-sql
  node --test scripts/sql-consumer/sql.spec.ts
'
