import { randomUUID } from "node:crypto";
import {
  readFile,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const names = [
  "plgg",
  "plgg-bundle",
  "plgg-view",
];
const object = (
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
const timestamp = (
  value: unknown,
): value is string => {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  return new Date(value).toISOString() === value;
};
const registry = (
  value: unknown,
): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
};

/** Additional terminal gate; consumer/hash verification must precede this gate. */
export function validateNpmContext(
  input: unknown,
): void {
  if (
    !object(input) ||
    input.schemaVersion !== 1 ||
    input.complete !== true ||
    typeof input.node !== "string" ||
    !/^v24\.\d+\.\d+$/.test(input.node) ||
    typeof input.consumerTypeScript !==
      "string" ||
    !/^7\.\d+\.\d+$/.test(
      input.consumerTypeScript,
    )
  )
    throw Error("invalid-terminal-candidate");
  const context = input.npmContext;
  if (
    !object(context) ||
    !registry(context.registry) ||
    !timestamp(context.fetchedAt) ||
    !object(context.latest)
  )
    throw Error("invalid-npm-context");
  const latest = context.latest;
  const packages: unknown[] = Array.isArray(
    input.packages,
  )
    ? input.packages
    : [];
  const results: unknown[] = Array.isArray(
    input.npmResults,
  )
    ? input.npmResults
    : [];
  if (
    packages.length !== names.length ||
    results.length !== names.length ||
    Object.keys(latest).length !== names.length
  )
    throw Error("invalid-npm-package-set");
  for (const name of names) {
    const matchingPackages = packages.filter(
      (item) =>
        object(item) && item.name === name,
    );
    const matchingResults = results.filter(
      (item) =>
        object(item) && item.name === name,
    );
    const pkg = matchingPackages[0];
    const result = matchingResults[0];
    if (
      matchingPackages.length !== 1 ||
      matchingResults.length !== 1 ||
      !object(pkg) ||
      !object(result) ||
      !version(pkg.version) ||
      !version(latest[name]) ||
      !version(result.version) ||
      !version(result.latest)
    )
      throw Error("invalid-npm-package-set");
    if (
      !registry(result.registry) ||
      result.registry !== context.registry
    )
      throw Error("npm-registry-mismatch");
    if (
      !timestamp(result.fetchedAt) ||
      result.fetchedAt !== context.fetchedAt
    )
      throw Error("npm-fetch-time-mismatch");
    if (
      result.version !== pkg.version ||
      result.latest !== latest[name] ||
      result.latest !== pkg.version
    )
      throw Error("npm-latest-mismatch");
  }
}

/** Validate the exact bytes subsequently renamed; rejection leaves the old ledger intact. */
export async function commitNpmContext(
  candidate: string,
  output: string,
): Promise<void> {
  const bytes = await readFile(candidate);
  let input: unknown;
  try {
    input = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw Error("invalid-terminal-json");
  }
  validateNpmContext(input);
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  const candidate = process.argv[2];
  const output = process.argv[3];
  try {
    if (!candidate || !output)
      throw Error("usage");
    await commitNpmContext(candidate, output);
    console.log("npm-context-committed");
  } catch {
    // Never echo input JSON, registry credentials, filesystem paths or native errors.
    console.error("npm-context-commit-rejected");
    process.exitCode = 1;
  }
}
