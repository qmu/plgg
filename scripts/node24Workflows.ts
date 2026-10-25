import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const plans = [
  {
    name: "run-tests",
    before: "ddcbcfe2fb34712f9cdd92a4c2c75a4faf3a3ea100cf80104a1390b345a3c201",
    after: "b137dfb87026f5991fee5ac4cd04b21f875401b1a6c4e08a8cab3d0b804df895",
  },
  {
    name: "deploy-guide",
    before: "e8957f0679f62d2fd418549590a64c73140a39ece870b710ad87718a8ae3fab8",
    after: "bf14cce473e8c0903f095c8100688169887094cfee94d9ac98baab87fb8f0776",
  },
];

const digest = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

export function planWorkflow(name: string, source: string): string {
  const plan = plans.find((entry) => entry.name === name);
  if (!plan) throw new Error("Unknown workflow");
  if (digest(source) === plan.after) return source;
  if (digest(source) !== plan.before)
    throw new Error(
      `${name}: workflow drift; review and update the pinned plan`,
    );
  let target = source
    .replace("actions/checkout@v4", "actions/checkout@v5")
    .replace("actions/setup-node@v4", "actions/setup-node@v5");
  if (name === "run-tests") {
    target = target
      .replace(
        "    runs-on: ubuntu-latest\n",
        '    runs-on: ubuntu-latest\n    strategy:\n      fail-fast: false\n      matrix:\n        node: ["22.x", "24.x"]\n',
      )
      .replace('node-version: "22.x"', "node-version: ${{ matrix.node }}");
  }
  if (digest(target) !== plan.after)
    throw new Error(`${name}: generated workflow differs from the pinned plan`);
  return target;
}

export function run(root: string, mode: string): number {
  if (mode !== "--check" && mode !== "--write")
    throw new Error("Usage: node scripts/node24Workflows.ts --check|--write");
  // Validate both files before writing either; drift must never produce a partial plan.
  const changes = plans.map(({ name }) => {
    const path = resolve(root, ".github/workflows", `${name}.yml`);
    const source = readFileSync(path, "utf8");
    return { name, path, source, target: planWorkflow(name, source) };
  });
  for (const change of changes) {
    if (mode === "--write" && change.source !== change.target)
      writeFileSync(change.path, change.target);
    console.log(
      `${change.name}: ${change.source === change.target ? "ready" : mode === "--write" ? "generated" : "pending"}`,
    );
  }
  return mode === "--check" &&
    changes.some((change) => change.source !== change.target)
    ? 1
    : 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = run(
      fileURLToPath(new URL("../", import.meta.url)),
      process.argv[2] ?? "",
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Workflow planning failed",
    );
    process.exitCode = 1;
  }
}
