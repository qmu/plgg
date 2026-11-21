import {
  strictEqual,
  throws,
  match,
} from "node:assert";
import {
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  compile,
  run,
  withConsumer,
} from "./router.ts";

test("packed router: Node 24, consumer TS7, ESM/CJS and broken-artifact regressions", () => {
  withConsumer(
    join(import.meta.dirname, "../.."),
    (consumer) => {
      compile(consumer);
      for (const entry of [
        "index.mjs",
        "index.cjs",
      ]) {
        match(
          run(consumer, process.execPath, [
            join("out", entry),
          ]),
          /consumer OK/,
        );
      }
      console.log(
        "PASS: strict NodeNext typecheck and ESM/CJS path/query behavior",
      );
      const invalid = join(
        consumer,
        "invalid.mts",
      );
      writeFileSync(
        invalid,
        'import { compilePattern } from "plgg-router"; compilePattern(42);',
      );
      throws(() => compile(consumer), /string/);
      rmSync(invalid);
      console.log(
        "PASS: consumer rejects an invalid API argument",
      );
      const declarations = join(
        consumer,
        "node_modules/plgg-router/dist/index.d.ts",
      );
      const original = readFileSync(
        declarations,
        "utf8",
      );
      rmSync(declarations);
      throws(
        () => compile(consumer),
        /declaration|TS7016/,
      );
      writeFileSync(declarations, original);
      console.log(
        "PASS: missing packed declarations fail compilation",
      );
      const runtime = join(
        consumer,
        "node_modules/plgg-router/dist/index.cjs.js",
      );
      rmSync(runtime);
      throws(
        () =>
          run(consumer, process.execPath, [
            "out/index.cjs",
          ]),
        /MODULE_NOT_FOUND/,
      );
      console.log(
        "PASS: missing CJS entry fails execution",
      );
      const esm = join(
        consumer,
        "node_modules/plgg-router/dist/index.es.js",
      );
      rmSync(esm);
      throws(
        () =>
          run(consumer, process.execPath, [
            "out/index.mjs",
          ]),
        /ERR_MODULE_NOT_FOUND/,
      );
      console.log(
        "PASS: missing ESM entry fails execution",
      );
      strictEqual(
        process.versions.node.split(".")[0],
        "24",
      );
    },
  );
});
