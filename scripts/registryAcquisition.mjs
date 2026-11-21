import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const registry = "https://registry.npmjs.org";
const names = ["plgg", "plgg-bundle", "plgg-view"];
const ids = [
  "bundle-restart",
  "consumer-ts7",
  "svg-elements",
  "raw-identity",
  "frame-dispatch",
  "lazy-subtree",
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const timestamp = (value) =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function consumer(bytes) {
  const input = JSON.parse(bytes);
  if (
    !object(input) ||
    input.schemaVersion !== 1 ||
    input.registry !== registry ||
    !/^v24\.\d+\.\d+$/.test(input.node) ||
    !/^7\.\d+\.\d+$/.test(input.consumerTypeScript) ||
    !timestamp(input.checkedAt) ||
    !Array.isArray(input.packages) ||
    input.packages.length !== names.length ||
    !Array.isArray(input.checks) ||
    input.checks.length !== ids.length ||
    typeof input.complete !== "boolean"
  )
    throw Error("invalid-consumer");
  const packages = names.map((name) => {
    const matches = input.packages.filter(
      (item) => object(item) && item.name === name,
    );
    const item = matches[0];
    if (
      matches.length !== 1 ||
      typeof item.version !== "string" ||
      !/^\d+\.\d+\.\d+$/.test(item.version) ||
      typeof item.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(item.sha256) ||
      typeof item.sha512 !== "string" ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(item.sha512)
    )
      throw Error("invalid-package");
    return {
      name,
      version: item.version,
      sha256: item.sha256,
      sha512: item.sha512,
    };
  });
  const checks = ids.map((id) => {
    const matches = input.checks.filter(
      (item) => object(item) && item.id === id,
    );
    if (
      matches.length !== 1 ||
      !["passed", "failed", "blocked"].includes(matches[0].status)
    )
      throw Error("invalid-check");
    return { id, status: matches[0].status };
  });
  return {
    node: input.node,
    consumerTypeScript: input.consumerTypeScript,
    checkedAt: input.checkedAt,
    packages,
    checks,
    complete:
      input.complete &&
      checks.every((item) => item.status === "passed") &&
      input.reason === "passed",
  };
}

// The context identifies one acquisition operation, never npm's mutable latest.
export async function acquireRegistryEvidence(
  bytes,
  request = fetch,
  now = () => new Date().toISOString(),
) {
  const source = consumer(bytes);
  const context = {
    acquisitionId: randomUUID(),
    fetchedAt: now(),
    registry,
    sourceSha256: hash(bytes),
  };
  const packages = [];
  for (const item of source.packages) {
    const response = await request(`${registry}/${item.name}/${item.version}`, {
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error("registry-unavailable");
    const metadata = await response.json();
    if (
      !object(metadata) ||
      metadata.name !== item.name ||
      metadata.version !== item.version ||
      !object(metadata.dist) ||
      metadata.dist.integrity !== item.sha512 ||
      typeof metadata.dist.tarball !== "string"
    )
      throw Error("registry-version-mismatch");
    const url = new URL(metadata.dist.tarball);
    if (url.origin !== registry || url.username || url.password)
      throw Error("invalid-tarball-origin");
    const tarball = await request(url.href, {
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!tarball.ok) throw Error("tarball-unavailable");
    const data = Buffer.from(await tarball.arrayBuffer());
    if (
      hash(data) !== item.sha256 ||
      `sha512-${createHash("sha512").update(data).digest("base64")}` !==
        item.sha512
    )
      throw Error("tarball-hash-mismatch");
    packages.push({ ...item, acquisition: { ...context } });
  }
  const result = {
    schemaVersion: 1,
    acquisition: context,
    consumer: source,
    packages,
    complete: source.complete,
  };
  validateRegistryEvidence(result, bytes);
  return result;
}

export function validateRegistryEvidence(value, bytes) {
  const source = consumer(bytes);
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !object(value.acquisition) ||
    !Array.isArray(value.packages) ||
    value.packages.length !== names.length
  )
    throw Error("invalid-acquisition");
  const context = value.acquisition;
  if (
    context.registry !== registry ||
    !timestamp(context.fetchedAt) ||
    !/^[a-f0-9-]{36}$/.test(context.acquisitionId) ||
    context.sourceSha256 !== hash(bytes)
  )
    throw Error("invalid-context");
  for (const expected of source.packages) {
    const matches = value.packages.filter(
      (item) => object(item) && item.name === expected.name,
    );
    const item = matches[0];
    if (
      matches.length !== 1 ||
      !object(item.acquisition) ||
      Object.keys(context).some(
        (key) => item.acquisition[key] !== context[key],
      ) ||
      Object.keys(item.acquisition).length !== Object.keys(context).length ||
      item.version !== expected.version ||
      item.sha256 !== expected.sha256 ||
      item.sha512 !== expected.sha512
    )
      throw Error("mixed-acquisition");
  }
  if (
    JSON.stringify(value.consumer) !== JSON.stringify(source) ||
    value.complete !== source.complete
  )
    throw Error("mixed-consumer");
  return value;
}

export async function saveRegistryEvidence(input, output, request = fetch) {
  if (resolve(input) === resolve(output))
    throw Error("distinct-paths-required");
  const bytes = await readFile(input);
  // Do not leave a stale successful result when a later acquisition fails.
  let result;
  try {
    result = await acquireRegistryEvidence(bytes, request);
  } catch {
    result = {
      schemaVersion: 1,
      complete: false,
      reason: "acquisition-rejected",
      sourceSha256: hash(bytes),
    };
  }
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4) throw Error("arguments-required");
    const result = await saveRegistryEvidence(process.argv[2], process.argv[3]);
    console.log(
      `registry acquisition: ${result.complete ? "complete" : "incomplete"}`,
    );
    process.exitCode = result.complete ? 0 : 1;
  } catch {
    console.error("registry acquisition: persistence-failed");
    process.exitCode = 1;
  }
}
