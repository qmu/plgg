#!/bin/sh -eu
# Gate: a consumer of the PUBLISHED plgg-test resolves the right TypeScript.
#
# plgg-test ships its own runtime dependency on `typescript@^6` (the resolver
# hook transpiles with it), while a consumer typically owns `typescript@7`.
# That is the same shape as the plgg-bundle incident (#156): a bare
# `import ts from "typescript"` must land on plgg-test's nested TypeScript 6,
# not on the consumer's top-level TypeScript 7. This gate packs plgg and
# plgg-test, installs them into a disposable consumer beside TypeScript 7, and
# checks three things:
#
#   1. Resolution — the runner resolves TypeScript 6 and the consumer resolves
#      TypeScript 7.
#   2. Execution — the installed plgg-test CLI runs a consumer test that needs
#      transpilation (an enum), through the nested TypeScript 6.
#   3. Typecheck — the consumer's own TypeScript 7 `tsc --noEmit` is clean.
#      The fixture tsconfig sets skipLibCheck (as every real consumer's does):
#      plgg's MapKind1 module augmentation is keyed on the bare specifier
#      "plgg/Abstracts/Principals/Kind", which only resolves through this
#      repo's own internal `paths` mapping, not through plgg's published
#      package.json `exports` (which exposes only "."). An external consumer
#      that fully re-typechecks plgg's shipped .d.ts (skipLibCheck: false)
#      sees each Kind-registering type's augmentation land on an orphaned,
#      unmerged module and its KindKeys1 union collapse to never — unrelated
#      to the TypeScript 6/7 resolution this gate exists to pin.
#
# Runs after scripts/build.sh (it packs the built dists). Node 22 is enough;
# it is not pinned here.
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
FIXTURE="$REPO_ROOT/scripts/fixtures/plgg-test-npm-consumer"

CONSUMER_DIR=$(mktemp -d)
trap 'rm -rf "$CONSUMER_DIR"' EXIT HUP INT TERM

echo "=== Gate: published plgg-test with a consumer TypeScript 7 ==="

npm pack "$REPO_ROOT/packages/plgg" --pack-destination "$CONSUMER_DIR" --silent > /dev/null
npm pack "$REPO_ROOT/packages/plgg-test" --pack-destination "$CONSUMER_DIR" --silent > /dev/null

cd "$CONSUMER_DIR"
mkdir src
cp "$FIXTURE/src/consumer.spec.ts" src/consumer.spec.ts
cp "$FIXTURE/tsconfig.json" tsconfig.json
printf '%s\n' '{"private":true,"type":"module"}' > package.json
npm install --no-audit --no-fund ./plgg-*.tgz typescript@7 @types/node@26

echo "--- 1. resolution ---"
node --input-type=module <<'JS'
import { createRequire } from "node:module";
import { strictEqual } from "node:assert";
const consumer = createRequire(`${process.cwd()}/package.json`);
const runner = createRequire(consumer.resolve("plgg-test"));
strictEqual(consumer("typescript").version.split(".")[0], "7");
strictEqual(runner("typescript").version.split(".")[0], "6");
console.log("consumer TypeScript 7 / plgg-test TypeScript 6: PASS");
JS

echo "--- 2. execution through the installed CLI ---"
./node_modules/.bin/plgg-test src

echo "--- 3. consumer typecheck (TypeScript 7) ---"
./node_modules/.bin/tsc --noEmit -p tsconfig.json

echo "test-npm-consumer gate passed"
