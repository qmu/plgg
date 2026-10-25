import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Resolve the declaration compiler from the consumer,
 * never from the bundled CLI's own TS6 API dependency.
 * Both TS6's lib/typescript.js and TS7's lib/version.cjs
 * anchor the package's bin/tsc launcher in the same way.
 * Keep this resolution at one vendor boundary so all
 * declaration builds follow Node's consumer lookup.
 */
export const consumerTscBin = (
  root: string,
): string =>
  join(
    dirname(
      createRequire(
        join(root, "package.json"),
      ).resolve("typescript"),
    ),
    "..",
    "bin",
    "tsc",
  );
