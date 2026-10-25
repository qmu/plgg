import {
  createHash,
  randomUUID,
} from "node:crypto";
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
const version = (value) =>
  typeof value === "string" &&
  /^\d+\.\d+\.\d+(?:[-.][\w.-]+)?$/.test(value);

// Status alone cannot attest that the same public consumer ran twice.
function restartProof(value, packageSha256) {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    value.sameConsumer !== true ||
    value.legacySymlink !== "preserved" ||
    value.packageSha256 !== packageSha256 ||
    !Array.isArray(value.runs) ||
    value.runs.length !== 2
  )
    return undefined;
  const runs = [];
  for (const [index, expected] of [
    41, 42,
  ].entries()) {
    const run = value.runs[index];
    if (
      !object(run) ||
      run.value !== expected ||
      typeof run.outputSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(run.outputSha256)
    )
      return undefined;
    runs.push({
      value: run.value,
      outputSha256: run.outputSha256,
    });
  }
  if (
    runs[0].outputSha256 === runs[1].outputSha256
  )
    return undefined;
  return {
    schemaVersion: 1,
    sameConsumer: true,
    legacySymlink: "preserved",
    packageSha256,
    runs,
  };
}

// Only allowlisted fields cross the final publication boundary. This reader
// consumes #214's schema and restart proof; it does not rerun its probes.
export function snapshot(bytes) {
  const result = {
    schemaVersion: 1,
    sourceSha256: createHash("sha256")
      .update(bytes)
      .digest("hex"),
    complete: false,
    reason: "invalid-evidence",
  };
  let input;
  try {
    input = JSON.parse(bytes.toString("utf8"));
  } catch {
    return result;
  }
  if (
    !object(input) ||
    input.schemaVersion !== 1 ||
    input.registry !==
      "https://registry.npmjs.org" ||
    typeof input.checkedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      input.checkedAt,
    ) ||
    !Number.isFinite(
      Date.parse(input.checkedAt),
    ) ||
    typeof input.node !== "string" ||
    !/^v24\.\d+\.\d+$/.test(input.node) ||
    !object(input.consumerCompilers) ||
    !version(input.consumerCompilers.ts7) ||
    !/^7\./.test(input.consumerCompilers.ts7) ||
    !Array.isArray(input.packages) ||
    input.packages.length !== names.length ||
    !Array.isArray(input.checks) ||
    input.checks.length !== ids.length ||
    typeof input.complete !== "boolean"
  )
    return result;
  const packages = [];
  for (const name of names) {
    const matches = input.packages.filter(
      (item) =>
        object(item) && item.name === name,
    );
    const item = matches[0];
    if (
      matches.length !== 1 ||
      !version(item.version) ||
      typeof item.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(item.sha256) ||
      typeof item.sha512 !== "string" ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(
        item.sha512,
      )
    )
      return result;
    packages.push({
      name,
      version: item.version,
      sha256: item.sha256,
      sha512: item.sha512,
    });
  }
  const checks = [];
  for (const id of ids) {
    const matches = input.checks.filter(
      (item) => object(item) && item.id === id,
    );
    const item = matches[0];
    if (
      matches.length !== 1 ||
      !["passed", "failed", "blocked"].includes(
        item.status,
      )
    )
      return result;
    const check = { id, status: item.status };
    if (id === "bundle-restart") {
      const proof = restartProof(
        item.evidence,
        packages.find(
          (pkg) => pkg.name === "plgg-bundle",
        ).sha256,
      );
      if (item.status === "passed") {
        if (proof) check.evidence = proof;
        else {
          check.status = "blocked";
          check.reason = "restart-proof-required";
        }
      }
      if (
        [
          "install",
          "first-build",
          "second-build",
        ].includes(item.phase)
      )
        check.phase = item.phase;
      if (
        [
          "ERR_FS_EISDIR",
          "legacy-symlink-mutated",
          "workspace-install",
        ].includes(item.reason)
      )
        check.reason = item.reason;
    }
    checks.push(check);
  }
  const passed = checks.every(
    (item) => item.status === "passed",
  );
  const complete =
    input.complete &&
    passed &&
    input.infrastructure === undefined;
  return {
    ...result,
    checkedAt: input.checkedAt,
    registry: input.registry,
    node: input.node,
    consumerTypeScript:
      input.consumerCompilers.ts7,
    packages,
    checks,
    complete,
    reason: complete
      ? "passed"
      : "consumer-evidence-incomplete",
  };
}

export function savePublishedCompletion(
  input,
  output,
  rename = renameSync,
) {
  if (resolve(input) === resolve(output))
    throw Error("distinct-paths-required");
  const evidence = snapshot(readFileSync(input));
  mkdirSync(dirname(resolve(output)), {
    recursive: true,
  });
  const temporary = `${resolve(output)}.${randomUUID()}.tmp`;
  try {
    const fd = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(
        fd,
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    rename(temporary, resolve(output));
  } finally {
    rmSync(temporary, { force: true });
  }
  return evidence;
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4)
      throw Error("arguments-required");
    const result = savePublishedCompletion(
      process.argv[2],
      process.argv[3],
    );
    console.log(
      `published completion: ${result.reason}`,
    );
    process.exitCode = result.complete ? 0 : 1;
  } catch {
    console.error(
      "published completion: persistence-failed",
    );
    process.exitCode = 1;
  }
}
