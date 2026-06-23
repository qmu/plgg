#!/usr/bin/env node
// Migration codemod (Plan Amendment 2): rewrites the test API import
// source `"vitest"` -> `"plgg-test"` across every `*.spec.ts` /
// `*.test.ts` under the given roots. This is the ONLY edit the vast
// majority of specs need; it is scripted (never hand-done) so 100+
// files migrate uniformly and verifiably.
//
// It intentionally does NOT touch `vi.mock` specs — those need a
// structural change (dependency injection) and are migrated by hand
// from an enumerated list (today: plgg-kit/.../generateObject.spec.ts).
//
// Usage: node codemod-vitest-to-plgg-test.mjs <root> [<root>...]
//        node codemod-vitest-to-plgg-test.mjs --check <root>   (dry run)
import {
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const roots = args.filter((a) => a !== "--check");

const PRUNE = new Set([
  "node_modules",
  "dist",
  "coverage",
]);

const isSpec = (n) =>
  n.endsWith(".spec.ts") ||
  n.endsWith(".test.ts");

const walk = (dir) => {
  let out = [];
  for (const e of safeRead(dir)) {
    if (e.isDirectory()) {
      if (!PRUNE.has(e.name)) {
        out = out.concat(walk(join(dir, e.name)));
      }
    } else if (e.isFile() && isSpec(e.name)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
};

const safeRead = (dir) => {
  try {
    return readdirSync(dir, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
};

// Rewrites only the module specifier of an import that pulls from
// "vitest"; leaves the imported symbol list untouched.
const rewrite = (text) =>
  text.replace(
    /from\s+["']vitest["']/g,
    'from "plgg-test"',
  );

const files = roots.flatMap(walk);
let changed = 0;

for (const f of files) {
  const before = readFileSync(f, "utf8");
  const after = rewrite(before);
  if (after !== before) {
    changed += 1;
    if (check) {
      console.log(`would rewrite: ${f}`);
    } else {
      writeFileSync(f, after);
      console.log(`rewrote: ${f}`);
    }
  }
}

console.log(
  `${check ? "would rewrite" : "rewrote"} ${changed}/${files.length} spec files`,
);
