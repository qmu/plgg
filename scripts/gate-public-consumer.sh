#!/bin/sh -eu
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
rm -f "$REPO_ROOT/.artifacts/public-consumer.json"
# Fail before an expensive build rather than silently certifying another Node.
node -e 'if (process.versions.node.split(".")[0] !== "24") { console.error("public consumer gate requires Node 24 first on PATH"); process.exit(1); }'
"$REPO_ROOT/scripts/build.sh"
node --test "$REPO_ROOT/scripts/publicConsumer.spec.mjs" "$REPO_ROOT/scripts/publicConsumerEvidence.spec.mjs"
node "$REPO_ROOT/scripts/publicConsumer.mjs"
