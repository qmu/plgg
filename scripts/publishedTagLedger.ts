import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const registry = "https://registry.npmjs.org";
const names = [
  "plgg-bundle",
  "plgg-view",
  "plgg",
];
const checkIds = [
  "bundle-restart",
  "consumer-ts7",
  "svg-elements",
  "raw-identity",
  "frame-dispatch",
  "lazy-subtree",
];
const record = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);
const version = (
  value: unknown,
): value is string =>
  typeof value === "string" &&
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(
    value,
  );

type Observation = Readonly<{
  name: string;
  recordedVersion: string | null;
  publishedVersion: string | null;
  distTag: "latest";
  distTagVersion: string | null;
  matched: boolean;
}>;
export type MetadataReader = (
  name: string,
) => Promise<unknown>;

/** Re-read the mutable tag without trusting the producer's complete flag. */
export const bindPublishedTags = async (
  input: unknown,
  read: MetadataReader,
) => {
  const reasons: string[] = [];
  const source = record(input) ? input : {};
  if (
    source.schemaVersion !== 1 ||
    source.registry !== registry
  )
    reasons.push("invalid-source");
  const checks: unknown[] = Array.isArray(
    source.checks,
  )
    ? source.checks
    : [];
  if (
    source.complete !== true ||
    checks.length !== checkIds.length ||
    !checkIds.every(
      (id) =>
        checks.filter(
          (check) =>
            record(check) &&
            check.id === id &&
            check.status === "passed",
        ).length === 1,
    )
  )
    reasons.push("consumer-checks-incomplete");
  const packages: unknown[] = Array.isArray(
    source.packages,
  )
    ? source.packages
    : [];
  if (
    packages.length !== names.length ||
    packages.some(
      (pkg) =>
        !record(pkg) ||
        typeof pkg.name !== "string" ||
        !names.includes(pkg.name),
    )
  )
    reasons.push("invalid-package-set");
  const observations: Observation[] = [];
  for (const name of names) {
    const entries = packages.filter(
      (pkg) => record(pkg) && pkg.name === name,
    );
    const entry = entries[0];
    const valid =
      entries.length === 1 &&
      record(entry) &&
      version(entry.version) &&
      typeof entry.sha512 === "string" &&
      /^sha512-[A-Za-z0-9+/]{86}==$/.test(
        entry.sha512,
      );
    const recordedVersion =
      valid &&
      record(entry) &&
      version(entry.version)
        ? entry.version
        : null;
    let publishedVersion: string | null = null;
    let distTagVersion: string | null = null;
    let matched = false;
    try {
      const meta = await read(name);
      if (
        !record(meta) ||
        meta.name !== name ||
        !record(meta["dist-tags"]) ||
        !version(meta["dist-tags"].latest) ||
        !record(meta.versions)
      )
        throw Error("metadata");
      distTagVersion = meta["dist-tags"].latest;
      const published =
        recordedVersion === null
          ? undefined
          : meta.versions[recordedVersion];
      if (
        record(published) &&
        published.name === name &&
        version(published.version) &&
        published.version === recordedVersion &&
        record(published.dist) &&
        record(entry) &&
        published.dist.integrity === entry.sha512
      ) {
        publishedVersion = published.version;
      }
      matched =
        valid &&
        publishedVersion !== null &&
        distTagVersion === recordedVersion;
      if (!matched)
        reasons.push(
          `publication-mismatch:${name}`,
        );
    } catch {
      reasons.push(
        `registry-unavailable:${name}`,
      );
    }
    observations.push({
      name,
      recordedVersion,
      publishedVersion,
      distTag: "latest",
      distTagVersion,
      matched,
    });
  }
  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    registry,
    issues: [155, 156, 157, 158],
    observations,
    reasons,
    complete: reasons.length === 0,
  };
};

const readRegistry: MetadataReader = async (
  name,
) => {
  const response = await fetch(
    `${registry}/${name}`,
    {
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      headers: {
        accept:
          "application/vnd.npm.install-v1+json",
      },
    },
  );
  if (!response.ok) throw Error("registry");
  const value: unknown = await response.json();
  return value;
};

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  const output = resolve(
    process.argv[3] ??
      "docs/published-tag-ledger.json",
  );
  let input: unknown;
  let sourceSha256: string | null = null;
  try {
    const bytes = readFileSync(
      resolve(
        process.argv[2] ??
          "docs/published-completion.json",
      ),
    );
    sourceSha256 = createHash("sha256")
      .update(bytes)
      .digest("hex");
    input = JSON.parse(bytes.toString("utf8"));
  } catch {
    input = null;
  }
  const ledger = await bindPublishedTags(
    input,
    readRegistry,
  );
  writeFileSync(
    output,
    `${JSON.stringify({ ...ledger, sourceSha256 }, null, 2)}\n`,
  );
  console.log(JSON.stringify(ledger, null, 2));
  process.exitCode = ledger.complete ? 0 : 1;
}
