/** Untrusted acquisition JSON -> one persistable resume fetch context.
 * Keep each query's effective registry until this boundary has checked it.
 * This is independent of #229's saved/current context comparison.
 */
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export type FetchedPackage = Readonly<{
  name: string;
  version: string;
  latestTag: string | null;
}>;

const record = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);
const list = (
  value: unknown,
): value is unknown[] => Array.isArray(value);
const nonempty = (
  value: unknown,
): value is string =>
  typeof value === "string" &&
  value.trim().length > 0;

// Validate without normalizing: paths, schemes and trailing slashes remain
// distinct identities, matching #229's exact registry comparison.
const registryURL = (
  value: unknown,
): value is string => {
  if (!nonempty(value) || value.trim() !== value)
    return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" ||
        url.protocol === "http:") &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
};

export const readResumeFetch = (
  input: unknown,
) => {
  if (
    !record(input) ||
    !registryURL(input.registry) ||
    typeof input.fetchedAt !== "string" ||
    !Number.isFinite(
      Date.parse(input.fetchedAt),
    ) ||
    new Date(input.fetchedAt).toISOString() !==
      input.fetchedAt ||
    !list(input.packages) ||
    input.packages.length === 0
  ) {
    throw new Error(
      "invalid resume fetch envelope",
    );
  }
  const packages: FetchedPackage[] = [];
  const names = new Set<string>();
  for (const entry of input.packages) {
    if (
      !record(entry) ||
      !registryURL(entry.registry)
    ) {
      throw new Error(
        "missing or invalid package registry",
      );
    }
    if (entry.registry !== input.registry) {
      // Never echo untrusted registry URLs (they may contain credentials).
      throw new Error(
        "mixed-registry resume fetch rejected",
      );
    }
    if (
      !nonempty(entry.name) ||
      !nonempty(entry.version) ||
      !(
        entry.latestTag === null ||
        nonempty(entry.latestTag)
      ) ||
      /[\r\n#@]/.test(entry.version) ||
      /[\r\n#]/.test(entry.name) ||
      (typeof entry.latestTag === "string" &&
        /[\r\n#]/.test(entry.latestTag))
    ) {
      throw new Error("invalid package snapshot");
    }
    if (names.has(entry.name))
      throw new Error(
        "duplicate package snapshot",
      );
    names.add(entry.name);
    packages.push({
      name: entry.name,
      version: entry.version,
      latestTag: entry.latestTag,
    });
  }
  packages.sort((a, b) =>
    a.name < b.name
      ? -1
      : a.name > b.name
        ? 1
        : 0,
  );
  // Wire-compatible with #229; its capture helper can own this calculation
  // once that PR lands. Never accept a caller-supplied generation hash.
  const distTagGeneration = createHash("sha256")
    .update(
      packages
        .map(
          (p) =>
            `${p.name}@${p.version}#${p.latestTag ?? ""}`,
        )
        .join("\n"),
    )
    .digest("hex");
  return {
    registry: input.registry,
    fetchedAt: input.fetchedAt,
    packages,
    distTagGeneration,
  };
};

export const saveResumeFetch = async (
  source: string,
  destination: string,
): Promise<void> => {
  let input: unknown;
  try {
    input = JSON.parse(
      await readFile(source, "utf8"),
    );
  } catch {
    throw new Error(
      "cannot read resume fetch JSON",
    );
  }
  const context = readResumeFetch(input);
  // Validation completes before opening even a temporary output file.
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporary,
      `${JSON.stringify(context, null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
};

if (
  process.argv[1] !== undefined &&
  import.meta.url ===
    pathToFileURL(process.argv[1]).href
) {
  const [, , source, destination, ...extra] =
    process.argv;
  if (
    source === undefined ||
    destination === undefined ||
    extra.length !== 0
  ) {
    console.error(
      "usage: node scripts/publishResumeFetch.ts INPUT.json OUTPUT.json",
    );
    process.exitCode = 1;
  } else {
    try {
      await saveResumeFetch(source, destination);
      console.log(
        "Resume fetch context saved: all package registries agree.",
      );
    } catch {
      console.error(
        "Resume fetch context rejected; output was not saved.",
      );
      process.exitCode = 1;
    }
  }
}
