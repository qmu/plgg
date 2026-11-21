import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  join,
  resolve,
} from "node:path";
import { pathToFileURL } from "node:url";

const object = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);
const numeric = /^(0|[1-9][0-9]*)$/;

function semver(value) {
  if (typeof value !== "string")
    throw Error("invalid-semver");
  const parts =
    /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      value,
    );
  if (!parts || parts[0] !== value)
    throw Error("invalid-semver");
  const prerelease = parts[4]?.split(".") ?? [];
  if (
    prerelease.some(
      (part) =>
        /^[0-9]+$/.test(part) &&
        !numeric.test(part),
    )
  )
    throw Error("invalid-semver");
  return {
    core: parts
      .slice(1, 4)
      .map((part) => BigInt(part)),
    prerelease,
  };
}

const order = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;
export function comparePublishedVersions(
  left,
  right,
) {
  const a = semver(left);
  const b = semver(right);
  for (let index = 0; index < 3; index++) {
    const result = order(
      a.core[index],
      b.core[index],
    );
    if (result !== 0) return result;
  }
  if (
    !a.prerelease.length ||
    !b.prerelease.length
  )
    return order(
      b.prerelease.length > 0,
      a.prerelease.length > 0,
    );
  for (
    let index = 0;
    index <
    Math.max(
      a.prerelease.length,
      b.prerelease.length,
    );
    index++
  ) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = numeric.test(x);
    const yn = numeric.test(y);
    const result =
      xn && yn
        ? order(BigInt(x), BigInt(y))
        : xn !== yn
          ? xn
            ? -1
            : 1
          : order(x, y);
    if (result !== 0) return result;
  }
  return 0;
}

function versions(evidence) {
  if (
    !object(evidence) ||
    !Array.isArray(evidence.packages) ||
    evidence.packages.length === 0
  )
    throw Error("invalid-package-ledger");
  const result = new Map();
  for (const item of evidence.packages) {
    if (
      !object(item) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      result.has(item.name)
    )
      throw Error("invalid-package-ledger");
    semver(item.version);
    result.set(item.name, item.version);
  }
  return result;
}

// Invoke only after the producer's evidence/tag checks, instead of its final rename.
// Every writer to this target must use this boundary to serialize read/compare/write.
export async function commitPublishedMonotonic(
  candidate,
  output,
) {
  const target = join(
    await realpath(dirname(resolve(output))),
    basename(output),
  );
  if (resolve(candidate) === target)
    throw Error("distinct-paths-required");
  const lock = `${target}.lock`;
  const temporary = `${target}.${randomUUID()}.tmp`;
  await mkdir(lock); // Busy or stale lock fails closed; never steal another writer's lock.
  try {
    const bytes = await readFile(candidate);
    const evidence = JSON.parse(
      bytes.toString("utf8"),
    );
    if (
      !object(evidence) ||
      evidence.complete !== true
    )
      throw Error("candidate-incomplete");
    const next = versions(evidence);
    let previous;
    try {
      previous = await readFile(target, "utf8");
    } catch (error) {
      if (
        !object(error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
    if (previous !== undefined) {
      for (const [name, version] of versions(
        JSON.parse(previous),
      )) {
        const proposed = next.get(name);
        if (proposed === undefined)
          throw Error("previous-package-missing");
        if (
          comparePublishedVersions(
            proposed,
            version,
          ) < 0
        )
          throw Error(
            "package-version-regression",
          );
      }
    }
    // Commit the bytes we checked, not a candidate path that could have changed.
    await writeFile(temporary, bytes, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
    await rm(lock, { recursive: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4)
      throw Error("arguments");
    await commitPublishedMonotonic(
      process.argv[2],
      process.argv[3],
    );
    console.log(
      "published monotonic commit: committed",
    );
  } catch {
    console.error(
      "published monotonic commit: refused; previous ledger preserved",
    );
    process.exitCode = 1;
  }
}
