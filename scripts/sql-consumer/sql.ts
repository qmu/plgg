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

export const fixture =
  'import { sql, isSql } from "plgg-sql";\nimport type { Sql } from "plgg-sql";\nimport { none, some } from "plgg";\nconst attack = "x\'; DROP TABLE users; --";\nconst predicate: Sql = sql`name = ${attack} AND active = ${false}`;\nconst statement: Sql = sql`SELECT * FROM users WHERE ${predicate} AND removed = ${none()} AND id = ${0}`;\nif (!isSql(statement)) throw new Error("builder brand missing");\nif (statement.content.text !== "SELECT * FROM users WHERE name = ? AND active = ? AND removed = ? AND id = ?") throw new Error("unsafe text or lost fragment");\nif (JSON.stringify(statement.content.params) !== JSON.stringify([some(attack), some(false), none(), some(0)])) throw new Error("parameter order/value lost");\nif (isSql({ __tag: "Sql", content: { text: attack, params: [] } })) throw new Error("forged fragment accepted");\nconsole.log("plgg-sql consumer OK: parameter binding, fragments, None, falsy values, forged brand rejection");\n';

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
    join(tmpdir(), "plgg-sql-consumer-"),
  );
  try {
    const core = pack(root, "plgg", temporary);
    const sql = pack(root, "plgg-sql", temporary);
    const consumer = join(temporary, "consumer");
    cpSync(
      join(
        root,
        "scripts/sql-consumer/package.json",
      ),
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
      sql,
      "typescript@^7.0.2",
    ]);
    for (const name of [
      "plgg",
      "plgg-sql",
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
      `Node ${process.versions.node}; consumer TypeScript ${version}; packed plgg-sql`,
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
          "node_modules/plgg-sql/dist/index.d.ts",
        ),
      )
    )
      throw new Error(
        "Packed SQL declarations missing",
      );
    check(consumer);
  } finally {
    rmSync(temporary, {
      recursive: true,
      force: true,
    });
  }
};
