import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPublicGateIndexDestination,
  collectPublicGateIndex,
  writePublicGateIndex,
} from "./publicGateIndex.ts";

if (process.argv.length > 3) {
  console.error(
    "Usage: node scripts/runPublicGateIndex.ts [index.json]",
  );
  process.exitCode = 1;
} else {
  try {
    const root = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const output = resolve(
      process.argv[2] ??
        ".public-package-gate-index.json",
    );
    assertPublicGateIndexDestination(output);
    const index = collectPublicGateIndex(
      root,
      process.versions.node,
    );
    writePublicGateIndex(output, index);
    for (const entry of index.packages) {
      console.log(
        `${entry.package}: ${entry.status} (${entry.reason})`,
      );
    }
    if (
      index.packages.some(
        (entry) => entry.status !== "passed",
      )
    ) {
      process.exitCode = 1;
    }
  } catch {
    console.error(
      "Public gate index could not be saved.",
    );
    process.exitCode = 1;
  }
}
