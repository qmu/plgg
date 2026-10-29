/** Installed-artifact gate: no workspace links or source aliases. */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import {
  stageEntries,
  stagedManifest,
} from "../stagePackage.ts";

export const run = (
  cwd: string,
  command: string,
  args: string[],
): string => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, NODE_PATH: "" },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "stdout" in error &&
      "stderr" in error
    ) {
      throw new Error(
        `${command} failed\n${String(error.stdout)}\n${String(error.stderr)}`,
      );
    }
    throw error;
  }
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

const manifest = (
  directory: string,
): Record<string, unknown> => {
  const value: unknown = JSON.parse(
    readFileSync(
      join(directory, "package.json"),
      "utf8",
    ),
  );
  if (!isRecord(value)) {
    throw new Error("Invalid package manifest");
  }
  return value;
};

export const pack = (
  root: string,
  name: string,
  temporary: string,
): string => {
  const source = join(root, "packages", name);
  const stage = join(temporary, name);
  const pkg = manifest(source);
  const entries = stageEntries(pkg);
  cpSync(source, stage, {
    recursive: true,
    filter: (path) =>
      path === source ||
      entries.some(
        (entry) =>
          path === join(source, entry) ||
          path.startsWith(
            join(source, entry) + sep,
          ),
      ),
  });
  writeFileSync(
    join(stage, "package.json"),
    stagedManifest(pkg, (spec) => {
      const version = manifest(
        resolve(source, spec.slice(5)),
      )["version"];
      if (typeof version !== "string")
        throw new Error(
          "Missing dependency version",
        );
      return version;
    }),
  );
  run(stage, "npm", [
    "pack",
    "--ignore-scripts",
    "--pack-destination",
    temporary,
  ]);
  const version = manifest(stage)["version"];
  if (typeof version !== "string")
    throw new Error("Missing package version");
  return join(
    temporary,
    `${name}-${version}.tgz`,
  );
};

export const fixture = `import { compilePattern, matchSegments, parseQuery, serializeQuery } from "plgg-router";
import type { Segment } from "plgg-router";
const segments: ReadonlyArray<Segment> = compilePattern("/users/:id/*rest");
const matched = matchSegments(segments, "/users/alice%20smith/a/b");
if (matched.__tag !== "Some" || matched.content["id"] !== "alice smith" || matched.content["rest"] !== "a/b") throw new Error("path matching failed");
if (matchSegments(compilePattern("/users/:id"), "/other/1").__tag !== "None") throw new Error("mismatch accepted");
const query: string = serializeQuery(parseQuery("?z=last&a=hello%20world"));
if (query !== "?a=hello%20world&z=last") throw new Error("query round trip failed");
console.log("plgg-router consumer OK");
`;

export const compile = (
  consumer: string,
): string =>
  run(consumer, process.execPath, [
    "node_modules/typescript/bin/tsc",
    "-p",
    "tsconfig.json",
  ]);

export const withConsumer = (
  root: string,
  check: (consumer: string) => void,
): void => {
  if (
    process.versions.node.split(".")[0] !== "24"
  )
    throw new Error("This gate requires Node 24");
  const temporary = mkdtempSync(
    join(tmpdir(), "plgg-router-consumer-"),
  );
  try {
    const core = pack(root, "plgg", temporary);
    const router = pack(
      root,
      "plgg-router",
      temporary,
    );
    const consumer = join(temporary, "consumer");
    cpSync(
      join(root, "scripts/consumer/package.json"),
      join(consumer, "package.json"),
      { recursive: true },
    );
    run(consumer, "npm", [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--engine-strict",
      "--save-exact",
      core,
      router,
      "typescript@^7.0.2",
    ]);
    for (const name of [
      "plgg",
      "plgg-router",
      "typescript",
    ]) {
      const installed = join(
        consumer,
        "node_modules",
        name,
      );
      if (
        !realpathSync(installed).startsWith(
          consumer + sep,
        )
      )
        throw new Error(
          "Workspace dependency leaked into consumer",
        );
    }
    const version = manifest(
      join(consumer, "node_modules/typescript"),
    )["version"];
    if (
      typeof version !== "string" ||
      !version.startsWith("7.")
    )
      throw new Error(
        "Consumer compiler must be TypeScript 7",
      );
    console.log(
      `Node ${process.versions.node}; consumer TypeScript ${version}; packed plgg-router`,
    );
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
          types: [],
          outDir: "out",
        },
        include: ["*.mts", "*.cts"],
      }),
    );
    writeFileSync(
      join(consumer, "index.mts"),
      fixture,
    );
    writeFileSync(
      join(consumer, "index.cts"),
      fixture,
    );
    if (
      !existsSync(
        join(
          consumer,
          "node_modules/plgg-router/dist/index.d.ts",
        ),
      )
    )
      throw new Error(
        "Packed router declarations missing",
      );
    check(consumer);
  } finally {
    rmSync(temporary, {
      recursive: true,
      force: true,
    });
  }
};
