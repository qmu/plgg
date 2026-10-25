import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

const names = [
  "plgg-bundle",
  "plgg-view",
  "plgg",
];
const checks = [
  "bundle-restart",
  "consumer-ts7",
  "svg-elements",
  "raw-identity",
  "frame-dispatch",
  "lazy-subtree",
];
const steps = [
  "TypeScript 7 declarations",
  "npm app build 1",
  "npm app build 2",
  "packed DOM acceptance #157 #158",
];
const emptyHash = createHash("sha256")
  .update("")
  .digest("hex");
const hashPattern = /^[a-f0-9]{64}$/;

// Only fixed reason codes leave this boundary; subprocess errors may contain secrets.
export function assess(
  revision,
  versions,
  candidate,
  published,
) {
  const reasons = [];
  if (candidate?.revision !== revision)
    reasons.push("integration-revision-mismatch");
  if (candidate?.trackedDiffSha256 !== emptyHash)
    reasons.push("integration-tree-dirty");
  if (
    candidate?.status !== "passed" ||
    !steps.every(
      (name) =>
        candidate.steps?.filter(
          (step) =>
            step.name === name &&
            step.status === 0,
        ).length === 1,
    )
  )
    reasons.push("candidate-consumer-failed");
  if (
    published?.complete !== true ||
    published.infrastructure ||
    published.checks?.length !== checks.length ||
    !checks.every(
      (id) =>
        published.checks?.filter(
          (check) =>
            check.id === id &&
            check.status === "passed",
        ).length === 1,
    )
  )
    reasons.push("published-consumer-failed");
  for (const name of names) {
    const local =
      candidate?.packages?.filter(
        (pkg) => pkg.name === name,
      ) ?? [];
    const remote =
      published?.packages?.filter(
        (pkg) => pkg.name === name,
      ) ?? [];
    if (
      local.length !== 1 ||
      remote.length !== 1
    ) {
      reasons.push(
        `artifact-missing-or-duplicate:${name}`,
      );
      continue;
    }
    if (
      !versions[name] ||
      remote[0].version !== versions[name]
    )
      reasons.push(`version-mismatch:${name}`);
    if (
      !hashPattern.test(local[0].sha256) ||
      !hashPattern.test(remote[0].sha256) ||
      local[0].sha256 !== remote[0].sha256
    )
      reasons.push(`tarball-mismatch:${name}`);
  }
  return reasons;
}

function git(root, args) {
  const child = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  if (child.status !== 0)
    throw Error("integration-unavailable");
  return child.stdout.trim();
}

export async function runParity(root, revision) {
  const output = join(root, ".consumer-parity");
  mkdirSync(output, { recursive: true });
  const result = {
    schema: 1,
    status: "failed",
    reasons: [],
    revision: null,
  };
  const save = () =>
    writeFileSync(
      join(output, "result.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  rmSync(join(output, "published.json"), {
    force: true,
  });
  // Overwrite old success before loading prerequisites or making network calls.
  save();
  try {
    if (!/^[a-f0-9]{40}$/.test(revision ?? ""))
      throw Error(
        "integration-revision-required",
      );
    result.revision = revision;
    if (
      git(root, ["rev-parse", "HEAD"]) !==
      revision
    )
      throw Error(
        "integration-revision-mismatch",
      );
    if (
      git(root, [
        "status",
        "--porcelain",
        "--untracked-files=normal",
      ])
    )
      throw Error("integration-tree-dirty");
    const versions = Object.fromEntries(
      names.map((name) => [
        name,
        JSON.parse(
          git(root, [
            "show",
            `${revision}:packages/${name}/package.json`,
          ]),
        ).version,
      ]),
    );
    let candidateGate;
    let publishedGate;
    try {
      candidateGate = await import(
        pathToFileURL(
          join(
            root,
            "scripts/gate-corpd-consumer.mjs",
          ),
        ).href
      );
      publishedGate = await import(
        pathToFileURL(
          join(
            root,
            "scripts/publishedCompletion.mjs",
          ),
        ).href
      );
    } catch {
      throw Error(
        "prerequisite-gates-unavailable",
      );
    }
    // Both probes run even if one throws. Never accept a retained report file.
    const probes = await Promise.allSettled([
      Promise.resolve().then(() =>
        candidateGate.runGate(
          root,
          join(root, ".corpd-consumer", "parity"),
        ),
      ),
      Promise.resolve().then(() =>
        publishedGate.generate(
          join(output, "published.json"),
        ),
      ),
    ]);
    if (
      probes.some(
        (probe) => probe.status === "rejected",
      )
    )
      throw Error("consumer-probe-unavailable");
    const candidate = probes[0].value;
    const published = probes[1].value;
    // Rehash actual packed bytes, rather than trusting a metadata-only equality.
    for (const pkg of candidate.packages ?? []) {
      if (!names.includes(pkg.name)) continue;
      if (
        typeof pkg.filename !== "string" ||
        pkg.filename !==
          pkg.filename.split(/[\\/]/).pop()
      )
        throw Error("candidate-artifact-invalid");
      const actual = createHash("sha256")
        .update(
          readFileSync(
            join(
              root,
              ".corpd-consumer",
              "parity",
              "tarballs",
              pkg.filename,
            ),
          ),
        )
        .digest("hex");
      if (actual !== pkg.sha256)
        throw Error("candidate-artifact-invalid");
    }
    result.reasons = assess(
      revision,
      versions,
      candidate,
      published,
    );
    if (
      git(root, ["rev-parse", "HEAD"]) !==
      revision
    )
      result.reasons.push(
        "integration-revision-mismatch",
      );
    if (
      git(root, [
        "status",
        "--porcelain",
        "--untracked-files=normal",
      ])
    )
      result.reasons.push(
        "integration-tree-dirty",
      );
    result.status =
      result.reasons.length === 0
        ? "passed"
        : "failed";
  } catch (error) {
    const allowed = [
      "integration-revision-required",
      "integration-revision-mismatch",
      "integration-tree-dirty",
      "integration-unavailable",
      "prerequisite-gates-unavailable",
      "consumer-probe-unavailable",
      "candidate-artifact-invalid",
    ];
    result.reasons = [
      error instanceof Error &&
      allowed.includes(error.message)
        ? error.message
        : "parity-probe-failed",
    ];
  }
  save();
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
) {
  const result = await runParity(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
    ),
    process.argv[2],
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode =
    result.status === "passed" ? 0 : 1;
}
