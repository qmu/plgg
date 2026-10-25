/** Persist the known issue-171 blocker; never inspect credentials or raw errors. */
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const blockerArtifact = () => ({
  schemaVersion: 1,
  issue: "https://github.com/qmu/plgg/issues/171",
  status: "blocked",
  reasonCode: "workflow-write-permission-required",
  reason:
    "GitHub App workflow updates were rejected for lack of workflows permission (recorded in issue 171).",
  evidenceKind: "recorded-issue-blocker",
  livePermissionCheck: false,
  affectedWorkflow: ".github/workflows/run-tests.yml",
  requiredPermissions: [
    {
      credentialKind: "GitHub App installation token",
      permissions: [
        "Contents: write",
        "Workflows: write",
        "Pull requests: write",
      ],
    },
    {
      credentialKind: "Fine-grained personal access token",
      permissions: [
        "Contents: write",
        "Workflows: write",
        "Pull requests: write",
      ],
    },
    {
      credentialKind: "Classic personal access token",
      permissions: [
        "repo (private repository) or public_repo (public repository)",
        "workflow",
      ],
    },
  ],
  permissionScope:
    "qmu/plgg only where repository selection is supported; Pull requests: write is for PR submission, Contents/Workflows: write are for pushing workflow changes.",
  runtimePermissions: ["contents: read"],
  unblockSteps: [
    "An authorized maintainer grants the workflow-writing credential access to qmu/plgg, or submits the workflow change themselves.",
    "Update run-tests.yml to a fail-fast: false Node 22.x / 24.x matrix and actions/checkout@v5 plus actions/setup-node@v5; keep deploy-guide.yml single-pinned.",
    "Verify both matrix jobs pass on GitHub; a local Node 24 run does not close issue 171.",
  ],
});

/** Replace old evidence atomically; the payload is an explicit, non-secret allowlist. */
export const writeBlockerArtifact = (path: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(
      temporary,
      `${JSON.stringify(blockerArtifact(), null, 2)}\n`,
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

const invoked = process.argv[1];
if (
  invoked !== undefined &&
  resolve(invoked) === fileURLToPath(import.meta.url)
) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  writeBlockerArtifact(join(root, ".artifacts", "node24-ci-blocker.json"));
  process.stdout.write(
    "BLOCKED workflow-write-permission-required: .artifacts/node24-ci-blocker.json (qmu/plgg#171; recorded blocker, no live permission check)\n",
  );
  process.exitCode = 1;
}
