import {
  createHash,
  randomUUID,
} from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

const registry = "https://registry.npmjs.org";
const names = [
  "plgg",
  "plgg-bundle",
  "plgg-view",
];
const ids = [
  "bundle-restart",
  "consumer-ts7",
  "svg-elements",
  "raw-identity",
  "frame-dispatch",
  "lazy-subtree",
];
const object = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);
const digest = (bytes) =>
  createHash("sha256")
    .update(bytes)
    .digest("hex");

// Classification depends on the failed boundary, never on diagnostic substrings.
export function classify(
  source,
  tags,
  node = process.version,
) {
  const failures = new Set();
  const fail = (code) => failures.add(code);
  if (!/^v24\.\d+\.\d+$/.test(node))
    fail("environment");
  const input = object(source) ? source : {};
  if (
    input.schemaVersion !== 1 ||
    input.registry !== registry ||
    !/^v24\.\d+\.\d+$/.test(input.node) ||
    !object(input.consumerCompilers) ||
    !/^7\.\d+\.\d+$/.test(
      input.consumerCompilers.ts7,
    ) ||
    typeof input.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(input.checkedAt))
  )
    fail("invalid-evidence");
  const packages = [];
  const entries = Array.isArray(input.packages)
    ? input.packages
    : [];
  if (entries.length !== names.length)
    fail("npm-acquisition");
  for (const name of names) {
    const matches = entries.filter(
      (item) =>
        object(item) && item.name === name,
    );
    const item = matches[0];
    if (
      matches.length !== 1 ||
      typeof item.version !== "string" ||
      !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(
        item.version,
      ) ||
      typeof item.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(item.sha256) ||
      typeof item.sha512 !== "string" ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(
        item.sha512,
      )
    ) {
      fail("npm-acquisition");
    } else
      packages.push({
        name,
        version: item.version,
        sha256: item.sha256,
        sha512: item.sha512,
      });
  }
  const checks = [];
  const records = Array.isArray(input.checks)
    ? input.checks
    : [];
  if (records.length !== ids.length)
    fail("invalid-evidence");
  for (const id of ids) {
    const matches = records.filter(
      (item) => object(item) && item.id === id,
    );
    const item = matches[0];
    if (
      matches.length !== 1 ||
      !["passed", "failed", "blocked"].includes(
        item.status,
      )
    ) {
      fail("invalid-evidence");
      checks.push({ id, status: "missing" });
      continue;
    }
    checks.push({ id, status: item.status });
    if (
      item.status !== "passed" &&
      !(
        item.status === "blocked" &&
        item.phase === undefined
      )
    )
      fail(
        item.phase === "install"
          ? "npm-acquisition"
          : id === "consumer-ts7"
            ? "consumer-compile"
            : "test",
      );
  }
  if (input.infrastructure !== undefined)
    fail("test");
  if (
    (input.complete !== true ||
      checks.some(
        (check) => check.status !== "passed",
      )) &&
    failures.size === 0
  )
    fail("invalid-evidence");
  // bindPublishedTags validates versions, integrity, uniqueness and all six checks.
  // Consumer incompleteness alone is already classified above, not a tag failure.
  if (
    !object(tags) ||
    tags.schemaVersion !== 1 ||
    tags.registry !== registry ||
    !Array.isArray(tags.reasons) ||
    !Array.isArray(tags.observations) ||
    tags.observations.length !== names.length ||
    !names.every(
      (name) =>
        tags.observations.filter(
          (item) =>
            object(item) &&
            item.name === name &&
            item.matched === true,
        ).length === 1,
    ) ||
    tags.reasons.some(
      (reason) =>
        reason !== "consumer-checks-incomplete",
    ) ||
    (tags.reasons.length === 0 &&
      tags.complete !== true)
  )
    fail("dist-tag");
  const reasons = [
    "environment",
    "invalid-evidence",
    "npm-acquisition",
    "consumer-compile",
    "test",
    "dist-tag",
  ].filter((code) => failures.has(code));
  const observations = names.map((name) => {
    const candidates =
      object(tags) &&
      Array.isArray(tags.observations)
        ? tags.observations.filter(
            (item) =>
              object(item) && item.name === name,
          )
        : [];
    const item =
      candidates.length === 1
        ? candidates[0]
        : {};
    const safeVersion = (value) =>
      typeof value === "string" &&
      /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value)
        ? value
        : null;
    return {
      name,
      matched: item.matched === true,
      recordedVersion: safeVersion(
        item.recordedVersion,
      ),
      publishedVersion: safeVersion(
        item.publishedVersion,
      ),
      distTagVersion: safeVersion(
        item.distTagVersion,
      ),
    };
  });
  return {
    schemaVersion: 1,
    registry,
    complete: reasons.length === 0,
    reasons,
    packages,
    checks,
    observations,
  };
}

export async function runTerminal(
  output,
  options = {},
) {
  const directory =
    options.producerDirectory ??
    dirname(fileURLToPath(import.meta.url));
  const scratch = join(
    tmpdir(),
    `plgg-terminal-${randomUUID()}.json`,
  );
  let bytes;
  let tags;
  let producerFailed = false;
  try {
    const produce =
      options.produce ??
      (
        await import(
          pathToFileURL(
            join(
              directory,
              "publishedCompletion.mjs",
            ),
          ).href
        )
      ).generate;
    await produce(scratch);
    bytes = await readFile(scratch);
    const source = JSON.parse(
      bytes.toString("utf8"),
    );
    const bind =
      options.bindTags ??
      (
        await import(
          pathToFileURL(
            join(
              directory,
              "publishedTagLedger.ts",
            ),
          ).href
        )
      ).bindPublishedTags;
    // Bind tags to the very same in-memory acquisition, never a previous ledger.
    tags = await bind(source, async (name) => {
      const response = await fetch(
        `${registry}/${name}`,
        {
          redirect: "error",
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok)
        throw Error("registry-unavailable");
      return response.json();
    });
  } catch {
    producerFailed = true;
  } finally {
    await rm(scratch, { force: true });
  }
  let source;
  try {
    source = JSON.parse(
      bytes?.toString("utf8") ?? "null",
    );
  } catch {
    source = null;
  }
  const result = classify(
    source,
    tags,
    options.node ?? process.version,
  );
  if (producerFailed) {
    result.complete = false;
    result.reasons.push("producer-unavailable");
  }
  const terminal = {
    ...result,
    node: /^v24\.\d+\.\d+$/.test(
      options.node ?? process.version,
    )
      ? (options.node ?? process.version)
      : null,
    sourceCheckedAt:
      object(source) &&
      typeof source.checkedAt === "string" &&
      Number.isFinite(
        Date.parse(source.checkedAt),
      )
        ? new Date(source.checkedAt).toISOString()
        : null,
    consumerTypeScript:
      object(source) &&
      object(source.consumerCompilers) &&
      /^7\.\d+\.\d+$/.test(
        source.consumerCompilers.ts7,
      )
        ? source.consumerCompilers.ts7
        : null,
    checkedAt: new Date().toISOString(),
    sourceSha256: bytes ? digest(bytes) : null,
  };
  const target = resolve(output);
  await mkdir(dirname(target), {
    recursive: true,
  });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporary,
      `${JSON.stringify(terminal, null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    await (options.rename ?? rename)(
      temporary,
      target,
    );
  } finally {
    await rm(temporary, { force: true });
  }
  return terminal;
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (
      process.argv.length < 3 ||
      process.argv.length > 4
    )
      throw Error("arguments");
    const result = await runTerminal(
      process.argv[2],
      {
        producerDirectory: process.argv[3]
          ? resolve(process.argv[3])
          : undefined,
      },
    );
    console.log(
      `published terminal: ${result.complete ? "passed" : result.reasons.join(", ")}`,
    );
    process.exitCode = result.complete ? 0 : 1;
  } catch {
    console.error(
      "published terminal: persistence-failed",
    );
    process.exitCode = 1;
  }
}
