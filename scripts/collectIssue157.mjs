import { execFileSync } from "node:child_process";
import {
  createHash,
  randomUUID,
} from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  mkdtempSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { pathToFileURL } from "node:url";

const registry = "https://registry.npmjs.org";
const supportedVersion = (version) => {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(
      version,
    )
  )
    return false;
  const [major, minor, patch] = version
    .split(".")
    .map(BigInt);
  return major > 0n || minor > 0n || patch >= 3n;
};
const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

// A successful download/import is deliberately insufficient to close the issue.
export function buildSnapshot(
  pull,
  acquisition,
  consumer,
  checkedAt,
) {
  const merged =
    pull.number === 166 &&
    pull.merged === true &&
    pull.base?.ref === "main" &&
    pull.base?.repo?.full_name === "qmu/plgg" &&
    /^[a-f0-9]{40}$/.test(
      pull.merge_commit_sha,
    ) &&
    Number.isFinite(Date.parse(pull.merged_at));
  const conditions = [
    {
      id: "implementation-merged",
      status: merged ? "passed" : "blocked",
    },
    {
      id: "published-version",
      status: supportedVersion(
        acquisition.version,
      )
        ? "passed"
        : "blocked",
    },
    {
      id: "public-lazy-export",
      status: consumer.lazy
        ? "passed"
        : "blocked",
    },
    {
      id: "public-application-export",
      status: consumer.application
        ? "passed"
        : "blocked",
    },
    { id: "frame-dispatch", status: "pending" },
    { id: "lazy-subtree", status: "pending" },
    { id: "corpd-frame-lazy", status: "pending" },
  ];
  return {
    schemaVersion: 1,
    issue:
      "https://github.com/qmu/plgg/issues/157",
    checkedAt,
    implementation: {
      url: "https://github.com/qmu/plgg/pull/166",
      merged,
      mergeCommit: merged
        ? pull.merge_commit_sha
        : null,
      mergedAt: merged ? pull.merged_at : null,
    },
    registry,
    acquisition,
    consumer,
    conditions,
    canClose: conditions.every(
      (condition) =>
        condition.status === "passed",
    ),
    closeCondition:
      "Merged implementation; published plgg-view >=0.0.3; frame-dispatch and lazy-subtree consumer gates and corpd-frame-lazy observation pass against the same acquired version.",
  };
}

export function saveSnapshot(
  output,
  snapshot,
  rename = renameSync,
) {
  const temporary = join(
    dirname(output),
    `.issue157-${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(
      temporary,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      { flag: "wx" },
    );
    rename(temporary, output);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function collect(output, execute = run) {
  const scratch = mkdtempSync(
    join(tmpdir(), "plgg-157-"),
  );
  try {
    const pull = JSON.parse(
      execute(
        "gh",
        ["api", "repos/qmu/plgg/pulls/166"],
        scratch,
      ),
    );
    const metadata = JSON.parse(
      execute(
        "npm",
        [
          "view",
          "plgg-view@latest",
          "version",
          "dist",
          "--json",
          `--registry=${registry}`,
        ],
        scratch,
      ),
    );
    if (
      !supportedVersion(metadata.version) &&
      metadata.version !== "0.0.2"
    )
      throw Error("unexpected-version");
    if (
      metadata.dist.tarball !==
      `${registry}/plgg-view/-/plgg-view-${metadata.version}.tgz`
    )
      throw Error("unexpected-tarball");
    const [packed] = JSON.parse(
      execute(
        "npm",
        [
          "pack",
          `plgg-view@${metadata.version}`,
          "--json",
          "--ignore-scripts",
          `--registry=${registry}`,
        ],
        scratch,
      ),
    );
    if (
      packed.name !== "plgg-view" ||
      packed.version !== metadata.version ||
      packed.integrity !==
        metadata.dist.integrity ||
      packed.shasum !== metadata.dist.shasum ||
      packed.filename !==
        `plgg-view-${metadata.version}.tgz`
    )
      throw Error("acquisition-mismatch");
    const bytes = readFileSync(
      join(scratch, packed.filename),
    );
    const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    if (integrity !== packed.integrity)
      throw Error("integrity-mismatch");
    writeFileSync(
      join(scratch, "package.json"),
      '{"private":true,"type":"module"}\n',
    );
    execute(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        `--registry=${registry}`,
        `./${packed.filename}`,
      ],
      scratch,
    );
    const consumer = JSON.parse(
      execute(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          'const root = await import("plgg-view"); const client = await import("plgg-view/client"); console.log(JSON.stringify({lazy:typeof root.lazy === "function",application:typeof client.application === "function"}));',
        ],
        scratch,
      ),
    );
    const latestAfter = JSON.parse(
      execute(
        "npm",
        [
          "view",
          "plgg-view@latest",
          "version",
          "--json",
          `--registry=${registry}`,
        ],
        scratch,
      ),
    );
    if (latestAfter !== metadata.version)
      throw Error("latest-changed");
    const snapshot = buildSnapshot(
      pull,
      {
        name: "plgg-view",
        version: packed.version,
        latest: latestAfter,
        tarball: metadata.dist.tarball,
        integrity,
        sha256: createHash("sha256")
          .update(bytes)
          .digest("hex"),
        acquiredAt: new Date().toISOString(),
        installedFrom: "registry-tarball",
      },
      consumer,
      new Date().toISOString(),
    );
    saveSnapshot(output, snapshot);
    console.log(
      `qmu/plgg#157: npm ${packed.version}; lazy=${consumer.lazy}; application=${consumer.application}; canClose=${snapshot.canClose}`,
    );
  } finally {
    rmSync(scratch, {
      recursive: true,
      force: true,
    });
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (!process.argv[2])
      throw Error("output-required");
    collect(resolve(process.argv[2]));
  } catch {
    console.error(
      "issue157: collection-failed; saved snapshot was not replaced",
    );
    process.exitCode = 1;
  }
}
