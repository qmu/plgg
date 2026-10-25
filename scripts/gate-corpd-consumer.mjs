#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

export const packages = [
  "plgg-bundle",
  "plgg",
  "plgg-test",
  "plgg-view",
];

// The caller gets a fresh, fixed artifact layout even on failure. No old green
// result can survive a failed rerun. Logs contain commands' output, never env.
export function runGate(
  root,
  output,
  run = execute,
  version = process.versions.node,
) {
  if (
    resolve(output) === resolve(root) ||
    !resolve(output).startsWith(
      `${resolve(root)}/.corpd-consumer/`,
    )
  ) {
    throw new Error(
      "Output must be a child of .corpd-consumer/",
    );
  }
  rmSync(output, {
    recursive: true,
    force: true,
  });
  mkdirSync(join(output, "tarballs"), {
    recursive: true,
  });
  const result = {
    schema: 1,
    status: "failed",
    node: version,
    typescript: "7.0.2",
    issues: [155, 156, 157, 158],
    packages: [],
    steps: [],
  };
  const scratch = mkdtempSync(
    join(tmpdir(), "plgg-corpd-"),
  );
  const log = [];
  const step = (name, command, args, cwd) => {
    const execution = run(command, args, cwd);
    log.push(
      `=== ${name} ===\n${execution.output}`,
    );
    result.steps.push({
      name,
      status: execution.status,
    });
    if (execution.status !== 0)
      throw new Error(
        `${name} failed (exit ${execution.status})`,
      );
    return execution.output;
  };
  try {
    if (version.split(".")[0] !== "24")
      throw new Error(
        "This acceptance gate requires Node 24",
      );
    result.revision = step(
      "revision",
      "git",
      ["rev-parse", "HEAD"],
      root,
    ).trim();
    const diff = run(
      "git",
      ["diff", "HEAD", "--binary"],
      root,
    );
    if (diff.status !== 0)
      throw new Error(
        "Cannot fingerprint tracked changes",
      );
    result.trackedDiffSha256 = createHash(
      "sha256",
    )
      .update(diff.output)
      .digest("hex");
    for (const name of packages) {
      step(
        `build ${name}`,
        "npm",
        ["run", "build"],
        join(root, "packages", name),
      );
      const packed = step(
        `pack ${name}`,
        "npm",
        [
          "pack",
          "--json",
          "--pack-destination",
          join(output, "tarballs"),
        ],
        join(root, "packages", name),
      );
      const metadata = JSON.parse(packed);
      const filename = metadata[0]?.filename;
      if (
        typeof filename !== "string" ||
        filename !== filename.split("/").pop()
      )
        throw new Error(
          "Invalid npm pack filename",
        );
      const tarball = join(
        output,
        "tarballs",
        filename,
      );
      result.packages.push({
        name,
        filename,
        sha256: createHash("sha256")
          .update(readFileSync(tarball))
          .digest("hex"),
      });
    }
    cpSync(
      join(
        root,
        "scripts",
        "fixtures",
        "corpd-consumer",
      ),
      scratch,
      {
        recursive: true,
      },
    );
    writeFileSync(
      join(scratch, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
      }),
    );
    step(
      "install isolated npm consumer",
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "typescript@7.0.2",
        ...result.packages.map((p) =>
          join(output, "tarballs", p.filename),
        ),
      ],
      scratch,
    );
    cpSync(
      join(scratch, "package-lock.json"),
      join(output, "consumer-lock.json"),
    );
    // Independent acceptance conditions still run after a compiler failure,
    // so one report distinguishes runtime behavior from declaration blockers.
    const failures = [];
    const verify = (name, args) => {
      try {
        step(
          name,
          process.execPath,
          args,
          scratch,
        );
      } catch (error) {
        failures.push(
          error instanceof Error
            ? error.message
            : String(error),
        );
      }
    };
    verify("TypeScript 7 declarations", [
      "node_modules/typescript/bin/tsc",
      "--noEmit",
    ]);
    for (const attempt of [1, 2]) {
      verify(`npm app build ${attempt}`, [
        "node_modules/plgg-bundle/bin/plgg-bundle.mjs",
      ]);
    }
    verify("packed DOM acceptance #157 #158", [
      "node_modules/plgg-test/bin/plgg-test.mjs",
      "src",
    ]);
    if (failures.length > 0)
      throw new Error(failures.join("; "));
    result.status = "passed";
  } catch (error) {
    result.error =
      error instanceof Error
        ? error.message
        : String(error);
  } finally {
    writeFileSync(
      join(output, "result.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    writeFileSync(
      join(output, "gate.log"),
      `${log.join("\n")}\n${result.status}: ${result.error ?? "all four consumer conditions passed"}\n`,
    );
    rmSync(scratch, {
      recursive: true,
      force: true,
    });
  }
  return result;
}

function execute(command, args, cwd) {
  const child = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_PATH: "",
      PLGG_TEST_ALIASES: "",
    },
  });
  return {
    status: child.status ?? 1,
    output: `${child.stdout ?? ""}${child.stderr ?? ""}${child.error?.message ?? ""}`,
  };
}

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
if (
  process.argv[1] &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
) {
  const result = runGate(
    root,
    join(root, ".corpd-consumer", "latest"),
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode =
    result.status === "passed" ? 0 : 1;
}
