#!/bin/sh -eu
# Complement the app consumer gate: library builds must use the consumer's
# TS7 for declarations while the CLI's own JS compiler API remains TS6.
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT HUP INT TERM
cd "$REPO_ROOT/packages/plgg-bundle"
npm run build
npm pack --pack-destination "$SCRATCH" --silent > "$SCRATCH/pack-name"
mkdir "$SCRATCH/consumer"
cd "$SCRATCH/consumer"
printf '%s\n' '{"name":"declaration-consumer","private":true,"type":"module","devDependencies":{"typescript":"7.0.2"}}' > package.json
npm install --no-audit --no-fund --ignore-scripts "$SCRATCH/$(cat "$SCRATCH/pack-name")"
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const consumer = createRequire(`${process.cwd()}/package.json`);
const bundle = createRequire(consumer.resolve('plgg-bundle/package.json'));
assert.match(consumer('typescript').version, /^7\./);
assert.match(bundle('typescript').version, /^6\./);
console.log('PASS: consumer TS7 and nested CLI TS6');
JS
mkdir src
cat > src/index.ts <<'TS'
export type Answer = { value: number };
export const answer: Answer = { value: 42 };
TS
cat > tsconfig.json <<'JSON'
{"compilerOptions":{"target":"ES2021","module":"ESNext","moduleResolution":"bundler","strict":true,"declaration":true,"rootDir":"src","outDir":"dist"},"include":["src"]}
JSON
cat > bundle.config.ts <<'TS'
export default {
  target: "library",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "declaration-consumer", srcRoot: "src" },
};
TS
# A wrapper records the actual compiler invocation; version checks alone do
# not prove declaration emit chose TS7 rather than the CLI's nested TS6.
mv node_modules/typescript/bin/tsc node_modules/typescript/bin/tsc-original
cat > node_modules/typescript/bin/tsc <<'JS'
import { writeFileSync } from 'node:fs';
writeFileSync('consumer-ts7-invoked', 'yes');
await import('./tsc-original');
JS
node node_modules/plgg-bundle/bin/plgg-bundle.mjs
test -s dist/index.d.ts
test -f consumer-ts7-invoked
node --input-type=module -e 'import { answer } from "./dist/index.es.js"; if (answer.value !== 42) process.exit(1)'
echo 'PASS: packed CLI emits declarations through consumer TS7 and runnable JS through TS6'
# Negative control proves the declaration compiler enforces consumer types.
printf '\nexport const broken: number = "wrong";\n' >> src/index.ts
if node node_modules/plgg-bundle/bin/plgg-bundle.mjs > failure.txt 2>&1; then
  echo 'FAIL: invalid declaration source was accepted' >&2
  exit 1
fi
grep -q 'TS2322' failure.txt
echo 'PASS: consumer declaration errors fail the packed CLI build (TS2322)'
