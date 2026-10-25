import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPublicGateIndexDestination,
  collectPublicGateIndex,
  writePublicGateIndex,
} from "./publicGateIndex.ts";

if (process.argv.length > 4) {
  console.error(
    "Usage: node scripts/runPublicGateIndex.ts [index.json] [ci-evidence.json]",
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
      undefined,
      undefined,
      process.argv[3] === undefined
        ? undefined
        : JSON.parse(
            readFileSync(process.argv[3], "utf8"),
          ),
    );
    writePublicGateIndex(output, index);
    for (const entry of index.packages) {
      console.log(
        `${entry.package}: ${entry.status} (${entry.reason})`,
      );
    }
    console.log(
      `Node 24 CI: ${index.node24Ci.status}; complete: ${index.complete}`,
    );
    if (!index.complete) {
      process.exitCode = 1;
    }
  } catch {
    console.error(
      "Public gate index could not be saved.",
    );
    process.exitCode = 1;
  }
}
