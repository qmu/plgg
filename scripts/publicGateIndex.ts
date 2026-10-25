import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, posix, win32 } from "node:path";

// Bump when generator semantics change, independently of the JSON schema.
export const publicGateGeneratorVersion = "1.1.1";

// Explicit evidence only: never infer CI success from local gate results.
export const node24CiEvidence = (
  value: unknown,
) => {
  if (
    typeof value === "object" &&
    value !== null
  ) {
    if (
      "status" in value &&
      value.status === "permission-wait" &&
      "reason" in value &&
      value.reason ===
        "workflows-permission-required"
    ) {
      return {
        status: "permission-wait",
        reason: "workflows-permission-required",
        issue:
          "https://github.com/qmu/plgg/issues/171",
      };
    }
    if (
      "status" in value &&
      (value.status === "passed" ||
        value.status === "failed" ||
        value.status === "pending") &&
      "url" in value &&
      typeof value.url === "string" &&
      /^https:\/\/github\.com\/qmu\/plgg\/actions\/runs\/[1-9][0-9]*\/job\/[1-9][0-9]*$/.test(
        value.url,
      ) &&
      "nodeMajor" in value &&
      value.nodeMajor === 24
    ) {
      return {
        status: value.status,
        url: value.url,
        nodeMajor: 24,
      };
    }
  }
  return { status: "unknown" };
};

// Commands belong to the existing consumer gates; keep their fixtures there.
export const publicConsumerGates = [
  {
    package: "plgg",
    executable: "sh",
    script:
      "scripts/gate-public-tarball-node24.sh",
    args: ["-eu"],
    env: { GATE_PUBLIC_TARBALL: "1" },
    command:
      "GATE_PUBLIC_TARBALL=1 sh -eu scripts/gate-public-tarball-node24.sh",
    prerequisite:
      "https://github.com/qmu/plgg/pull/175",
  },
  {
    package: "plgg-md",
    executable: "sh",
    script: "scripts/gate-plgg-md-node24.sh",
    args: ["-eu"],
    env: { GATE_PLGG_MD: "1" },
    command:
      "GATE_PLGG_MD=1 sh -eu scripts/gate-plgg-md-node24.sh",
    prerequisite:
      "https://github.com/qmu/plgg/pull/177",
  },
  {
    package: "plgg-test",
    executable: process.execPath,
    script: "scripts/publicTestConsumer.ts",
    args: [],
    env: {},
    command: "node scripts/publicTestConsumer.ts",
    prerequisite:
      "https://github.com/qmu/plgg/pull/195",
  },
];

export type Gate = Readonly<{
  package: string;
  executable: string;
  script: string;
  args: ReadonlyArray<string>;
  env: Readonly<Record<string, string>>;
  command: string;
  prerequisite: string;
}>;

export type Outcome = Readonly<{
  status: number | null;
  error?: unknown;
}>;

export const reasonFor = (outcome: Outcome) => {
  if (
    outcome.error !== undefined ||
    outcome.status === null
  ) {
    return "gate-execution-failed";
  }
  return outcome.status === 0
    ? "passed"
    : "consumer-gate-failed";
};

export const collectPublicGateIndex = (
  root: string,
  nodeVersion: string,
  gates: ReadonlyArray<Gate> = publicConsumerGates,
  execute: (gate: Gate) => Outcome = (gate) =>
    spawnSync(
      gate.executable,
      [...gate.args, gate.script],
      {
        cwd: root,
        env: { ...process.env, ...gate.env },
        // Never persist or relay npm/child diagnostics, which can contain secrets.
        stdio: "ignore",
        timeout: 600_000,
        killSignal: "SIGKILL",
      },
    ),
  ciEvidence: unknown = undefined,
) => {
  const node24Ci = node24CiEvidence(ciEvidence);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const gate of gates) {
    if (seen.has(gate.package)) {
      duplicates.add(gate.package);
    }
    seen.add(gate.package);
  }
  const index = {
    schemaVersion: 1,
    node24Ci,
    generatorVersion: publicGateGeneratorVersion,
    nodeVersion,
    consumerTypeScriptMajor: 7,
    // A fresh complete snapshot replaces the previous run: no stale failures.
    packages: gates.map((gate) => {
      const reason = duplicates.has(gate.package)
        ? "duplicate-package-name"
        : !nodeVersion.startsWith("24.")
          ? "node-24-required"
          : !existsSync(join(root, gate.script))
            ? "gate-unavailable"
            : reasonFor(execute(gate));
      return {
        package: gate.package,
        status:
          reason === "passed"
            ? "passed"
            : reason === "consumer-gate-failed"
              ? "failed"
              : "blocked",
        reason,
        reproduction: `npx --yes --package=node@24 -c '${gate.command}'`,
        prerequisite: gate.prerequisite,
      };
    }),
  };
  return {
    ...index,
    complete:
      index.packages.length > 0 &&
      node24Ci.status === "passed" &&
      index.packages.every(
        (entry) => entry.status === "passed",
      ),
  };
};

const compatibleGenerator = (
  value: unknown,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "generatorVersion" in value &&
  value.generatorVersion ===
    publicGateGeneratorVersion;

export const assertPublicGateIndexDestination = (
  path: string,
): void => {
  if (
    existsSync(path) &&
    !compatibleGenerator(
      JSON.parse(readFileSync(path, "utf8")),
    )
  ) {
    throw new Error(
      "Public gate index generator version mismatch.",
    );
  }
};

export const writePublicGateIndex = (
  path: string,
  index: ReturnType<
    typeof collectPublicGateIndex
  >,
): void => {
  if (!compatibleGenerator(index)) {
    throw new Error(
      "Public gate index generator version mismatch.",
    );
  }
  // Recheck after collection: a child may have changed the destination.
  assertPublicGateIndexDestination(path);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(
      temporary,
      `${JSON.stringify(index, null, 2)}\n`,
      {
        mode: 0o600,
        flag: "wx",
      },
    );
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
};

// Index artifact references use portable relative paths. Validate the original
// spelling before joining: normalization would erase parent segments.
export const readPublicGateArtifact = (
  root: string,
  path: string,
): unknown => {
  if (
    path.length === 0 ||
    path.includes("\\") ||
    path.includes("\0") ||
    posix.isAbsolute(path) ||
    win32.isAbsolute(path) ||
    /^[A-Za-z]:/.test(path) ||
    path.split("/").includes("..")
  ) {
    throw new Error(
      "Invalid public gate artifact relative path.",
    );
  }
  return JSON.parse(
    readFileSync(join(root, path), "utf8"),
  );
};
