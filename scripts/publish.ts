/**
 * Publish preflight: compute the family npm publish set in ONE Node
 * process with parallel registry queries.
 *
 * Replaces the serial fork storm the shell preflight used to run (per
 * package: one `npm view` round-trip plus ~3 `node -p "require(...)"`
 * spawns, looped over every package before it knew what to publish —
 * tens of seconds of banner spew). This program:
 *   - reads every `packages/<dir>/package.json` in one `fs` pass,
 *   - derives name/version/private and the publish order (scraped from
 *     `build.sh`, plgg-bundle prepended — the same topology the shell
 *     used, never re-forked),
 *   - issues the registry-version queries CONCURRENTLY, and
 *   - prints a compact, banner-free PUBLISH / SKIP / private summary.
 *
 * The pure set computation lives in `publishSet.ts` (unit-tested);
 * this file is the I/O shell around it. Invoked by
 * `scripts/publish-npm.sh` (which stays the thin `npm whoami` + stage +
 * publish + verify wrapper for now).
 *
 * Usage:
 *   node scripts/publish.ts --preflight [--only "a,b"] [--set-out FILE]
 *     --preflight  print the human summary (no gate, no publish)
 *     --only       restrict to the named package dirs (comma/space list)
 *     --set-out    write the publish-set dirs (space separated) to FILE,
 *                  for the shell wrapper to drive staging by
 *
 * Zero new dependencies: Node + the ambient `npm` CLI only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePublishSet,
  type PkgMeta,
} from "./publishSet.ts";

const scriptsDir = dirname(
  fileURLToPath(import.meta.url),
);
const repoRoot = dirname(scriptsDir);

type Argv = Readonly<{
  preflight: boolean;
  only: ReadonlyArray<string>;
  setOut: string | null;
}>;

const parseArgv = (
  argv: ReadonlyArray<string>,
): Argv => {
  const valueOf = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length
      ? (argv[i + 1] ?? null)
      : null;
  };
  const onlyRaw = valueOf("--only");
  return {
    preflight: argv.includes("--preflight"),
    only:
      onlyRaw === null
        ? []
        : onlyRaw
            .split(/[,\s]+/)
            .filter((s) => s.length > 0),
    setOut: valueOf("--set-out"),
  };
};

/**
 * The publish order IS build.sh's topology — scraped, never re-forked
 * (the deploy-guide.yml drift incident is why). plgg-bundle is prepended:
 * it sits outside that list and has no `file:` runtime deps.
 */
const readOrder = (): ReadonlyArray<string> => {
  const build = readFileSync(
    join(scriptsDir, "build.sh"),
    "utf8",
  );
  const dirs = build
    .split("\n")
    .map((line) => {
      const m = line.match(
        /^cd \$REPO_ROOT\/packages\/([a-z0-9-]+) && npm run build$/,
      );
      return m ? m[1] : undefined;
    })
    .filter((d): d is string => typeof d === "string");
  return ["plgg-bundle", ...dirs];
};

const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const readMeta = (dir: string): PkgMeta => {
  const pkg: unknown = JSON.parse(
    readFileSync(
      join(repoRoot, "packages", dir, "package.json"),
      "utf8",
    ),
  );
  const record: Record<string, unknown> = isRecord(pkg)
    ? pkg
    : {};
  const name = record["name"];
  const version = record["version"];
  return {
    dir,
    name: typeof name === "string" ? name : dir,
    version:
      typeof version === "string" ? version : "0.0.0",
    private: record["private"] === true,
  };
};

/**
 * Query the registry for a package's published version, concurrently
 * with the others. A never-published package (npm exits non-zero /
 * prints nothing) resolves to `null`.
 */
const remoteVersion = (
  name: string,
): Promise<string | null> =>
  new Promise((res) => {
    execFile(
      "npm",
      ["view", name, "version"],
      { encoding: "utf8" },
      (error, stdout) => {
        const v = stdout.trim();
        res(error || v.length === 0 ? null : v);
      },
    );
  });

const main = async (): Promise<void> => {
  const args = parseArgv(process.argv.slice(2));
  const order = readOrder().filter(
    (dir) =>
      args.only.length === 0 ||
      args.only.includes(dir),
  );
  for (const requested of args.only) {
    if (!readOrder().includes(requested)) {
      process.stderr.write(
        `!!! --only requested unknown package dir: ${requested}\n`,
      );
      process.exit(1);
    }
  }

  const metas = order.map(readMeta);
  const queryable = metas.filter((m) => !m.private);
  const remotes = await Promise.all(
    queryable.map((m) => remoteVersion(m.name)),
  );
  const remoteByName = new Map<string, string | null>(
    queryable.map((m, i) => [
      m.name,
      remotes[i] ?? null,
    ]),
  );

  const decision = computePublishSet(metas, remoteByName);

  process.stdout.write(
    `preflight: ${decision.publish.length} to publish, ` +
      `${decision.skip.length} current, ` +
      `${decision.privateSkipped.length} private\n`,
  );
  for (const p of decision.publish) {
    const remote = remoteByName.get(p.name) ?? null;
    process.stdout.write(
      `  PUBLISH  ${p.name}  ${remote ?? "none"} -> ${p.version}\n`,
    );
  }
  for (const p of decision.skip) {
    process.stdout.write(
      `  SKIP     ${p.name}@${p.version}\n`,
    );
  }
  if (decision.privateSkipped.length > 0) {
    process.stdout.write(
      `  private  ${decision.privateSkipped
        .map((p) => p.name)
        .join(", ")}\n`,
    );
  }

  if (args.setOut !== null) {
    writeFileSync(
      resolve(args.setOut),
      decision.publish.map((p) => p.dir).join(" "),
    );
  }
};

main().catch((e: unknown) => {
  process.stderr.write(`${String(e)}\n`);
  process.exit(1);
});
