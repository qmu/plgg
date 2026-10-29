#!/bin/sh -eu
# Run after scripts/build.sh, with Node 24 on PATH.
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
node -e 'if (process.versions.node.split(".")[0] !== "24") { throw new Error("This consumer gate requires Node 24"); }'
CONSUMER_DIR=$(mktemp -d)
trap 'rm -rf "$CONSUMER_DIR"' EXIT HUP INT TERM
npm pack "$REPO_ROOT/packages/plgg" --pack-destination "$CONSUMER_DIR" --silent > /dev/null
npm pack "$REPO_ROOT/packages/plgg-test" --pack-destination "$CONSUMER_DIR" --silent > /dev/null
mkdir "$CONSUMER_DIR/src"
cp "$REPO_ROOT/scripts/fixtures/plgg-test-node24/consumer.spec.ts" "$CONSUMER_DIR/src/consumer.spec.ts"
cd "$CONSUMER_DIR"
printf '%s\n' '{"private":true,"type":"module"}' > package.json
npm install --no-audit --no-fund ./plgg-*.tgz typescript@7
node --input-type=module <<'JS'
import { createRequire } from "node:module";
import { strictEqual } from "node:assert";
const consumer = createRequire(`${process.cwd()}/package.json`);
const runner = createRequire(consumer.resolve("plgg-test"));
strictEqual(consumer("typescript").version.split(".")[0], "7");
strictEqual(runner("typescript").version.split(".")[0], "6");
console.log("Consumer TypeScript 7 / runner TypeScript 6: PASS");
JS
./node_modules/.bin/plgg-test src
