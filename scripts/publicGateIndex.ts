import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Bump when generator semantics change, independently of the JSON schema.
export const publicGateGeneratorVersion = "1.0.0";

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
) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const gate of gates) {
    if (seen.has(gate.package)) {
      duplicates.add(gate.package);
    }
    seen.add(gate.package);
  }
  return {
    schemaVersion: 1,
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
};

export const writePublicGateIndex = (
  path: string,
  index: ReturnType<
    typeof collectPublicGateIndex
  >,
): void => {
  const compatible = (value: unknown): boolean =>
    typeof value === "object" &&
    value !== null &&
    "generatorVersion" in value &&
    value.generatorVersion ===
      publicGateGeneratorVersion;
  if (
    !compatible(index) ||
    (existsSync(path) &&
      !compatible(
        JSON.parse(readFileSync(path, "utf8")),
      ))
  ) {
    throw new Error(
      "Public gate index generator version mismatch.",
    );
  }
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
