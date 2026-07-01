import {
  test,
  check,
  toBe,
} from "plgg-test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The runtime-neutral Ssg barrel must never pull in `node:fs`: the fs seam
 * (`writeStatic` and friends) is surfaced solely through `ssgEntry.ts`. Assert
 * the barrel source carries no `node:fs` IMPORT (the prose comment naming the
 * seam is fine — only an `import … from "node:fs…"` would break neutrality).
 * The plgg-server runner executes with the package root as cwd.
 */
test("Ssg/usecase/index.ts imports no node:fs", async () => {
  const source = await readFile(
    join(
      process.cwd(),
      "src",
      "Ssg",
      "usecase",
      "index.ts",
    ),
    "utf8",
  );
  return check(
    /from\s+["']node:fs/.test(source),
    toBe(false),
  );
});
