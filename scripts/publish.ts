/**
 * The family npm publisher's ONE-Node-process core: preflight (compute
 * the publish set with parallel registry queries) AND the per-package
 * stage → publish → verify orchestration, with compact, banner-free
 * output. `publish-npm.sh` is now a thin wrapper (`npm whoami` + the gate
 * + delegate here) — the command-scripts policy's single canonical path.
 *
 * Replaces the serial fork storm the shell used to run (per package: an
 * `npm view` round-trip plus ~3 `node -p "require(...)"` spawns for the
 * preflight, and an inline `node -` staging heredoc + raw `npm notice`
 * spew + `===` banner walls per publish). This program:
 *   - reads every `packages/<dir>/package.json` in one `fs` pass,
 *   - derives name/version/private and the publish order (scraped from
 *     `build.sh`, plgg-bundle prepended — the same topology, never
 *     re-forked), and issues the registry-version queries CONCURRENTLY;
 *   - stages each package (files allowlist copy + `file:`→caret rewrite),
 *     then publishes (`--tag latest --ignore-scripts`, quiet npm) and
 *     verifies (registry resolve-poll + scratch-install import/bin smoke),
 *     emitting one compact status line per phase — no banner walls.
 *
 * The pure logic lives in unit-tested siblings — the version compare in
 * `publishSet.ts`, the staging manifest rewrite in `stagePackage.ts`;
 * this file is the I/O shell around them.
 *
 * Usage:
 *   node scripts/publish.ts --preflight [--only "a,b"] [--set-out FILE]
 *     --preflight  print the publish-set summary (no gate, no publish)
 *   node scripts/publish.ts --publish  --only "a,b"
 *     --publish    stage → publish → verify the named set, in order
 *   node scripts/publish.ts --dry-run  --only "a,b"
 *     --dry-run    stage → `npm pack` only — NEVER touches the registry
 *                  (staging is proven without a live publish)
 *     --only       restrict to the named package dirs (comma/space list);
 *                  REQUIRED for --publish/--dry-run
 *     --set-out    (preflight) write the publish-set dirs to FILE
 *
 * Zero new dependencies: Node + the ambient `npm` CLI only.
 */
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  cpSync,
  existsSync,
  rmSync,
} from "node:fs";
import {
  execFile,
  execFileSync,
} from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePublishSet,
  type PkgMeta,
} from "./publishSet.ts";
import {
  stagedManifest,
  stageEntries,
} from "./stagePackage.ts";

const scriptsDir = dirname(
  fileURLToPath(import.meta.url),
);
const repoRoot = dirname(scriptsDir);

type Argv = Readonly<{
  preflight: boolean;
  publish: boolean;
  dryRun: boolean;
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
    publish: argv.includes("--publish"),
    dryRun: argv.includes("--dry-run"),
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

/** Read + narrow a `package.json` to a record. */
const readPkgJson = (
  path: string,
): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(
    readFileSync(path, "utf8"),
  );
  return isRecord(parsed) ? parsed : {};
};

/** The `version` string of the manifest at `path` (or "0.0.0"). */
const versionAt = (path: string): string => {
  const v = readPkgJson(path)["version"];
  return typeof v === "string" ? v : "0.0.0";
};

/** `<name>@<version>`, the summary's per-line subject. */
const label = (m: PkgMeta): string =>
  `${m.name}@${m.version}`;

/** A byte count as a compact `NN.N KB`. */
const kb = (bytes: number): string =>
  `${(bytes / 1024).toFixed(1)} KB`;

/**
 * Stage one package into `stageRoot/<dir>`: copy its `files` allowlist
 * (+ README/LICENSE) and write a `package.json` whose `file:` deps are
 * rewritten to caret ranges (see {@link stagedManifest}). Returns the
 * staged dir. The working tree is NEVER mutated — a temp stage, the
 * shell publisher's exact semantics.
 */
const stageOne = (
  meta: PkgMeta,
  stageRoot: string,
): string => {
  const dir = join(
    repoRoot,
    "packages",
    meta.dir,
  );
  const pkg = readPkgJson(
    join(dir, "package.json"),
  );
  const manifest = stagedManifest(pkg, (fileSpec) =>
    versionAt(
      resolve(
        dir,
        fileSpec.slice("file:".length),
        "package.json",
      ),
    ),
  );
  const stage = join(stageRoot, meta.dir);
  mkdirSync(stage, { recursive: true });
  for (const entry of stageEntries(pkg)) {
    const from = join(dir, entry);
    if (existsSync(from)) {
      cpSync(from, join(stage, entry), {
        recursive: true,
      });
    }
  }
  writeFileSync(
    join(stage, "package.json"),
    manifest,
  );
  return stage;
};

/**
 * `npm pack` the staged dir (no registry, no install) and return the
 * tarball name + packed byte size. The dry-run's proof that staging
 * produces a real, publishable tarball without a live publish.
 */
const packStaged = (
  stage: string,
): { filename: string; size: number } => {
  const out = execFileSync(
    "npm",
    [
      "pack",
      "--json",
      "--loglevel=error",
      "--pack-destination",
      stage,
    ],
    { cwd: stage, encoding: "utf8" },
  );
  const parsed: unknown = JSON.parse(out);
  const first = Array.isArray(parsed)
    ? parsed[0]
    : undefined;
  const rec = isRecord(first) ? first : {};
  const filename = rec["filename"];
  const size = rec["size"];
  return {
    filename:
      typeof filename === "string"
        ? filename
        : "?",
    size: typeof size === "number" ? size : 0,
  };
};

/**
 * Publish a staged dir. `--tag latest` is EXPLICIT (plgg's registry
 * carries a live 1.0.0 above the 0.0.x line, so npm refuses to implicitly
 * tag a lower version); `--ignore-scripts` immunizes the run against any
 * staged package's stray lifecycle hook. `--loglevel=warn` quiets the
 * `npm notice` wall.
 */
const publishStaged = (stage: string): void => {
  execFileSync(
    "npm",
    [
      "publish",
      "--tag",
      "latest",
      "--ignore-scripts",
      "--loglevel=warn",
    ],
    {
      cwd: stage,
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
};

/**
 * Poll the registry until the just-published version resolves, returning
 * the number of tries. Registry propagation is real and cannot be removed
 * — but it is reported as one number, not a `sleep`-per-line wall.
 */
const resolveOnRegistry = async (
  name: string,
  version: string,
): Promise<number> => {
  for (let tries = 1; tries <= 30; tries++) {
    if ((await remoteVersion(name)) === version) {
      return tries;
    }
    await sleep(2000);
  }
  throw new Error(
    `${name}@${version} not resolvable on the registry after 30 tries`,
  );
};

/** stdout+stderr text captured off a thrown `execFileSync` error. */
const errOutput = (e: unknown): string => {
  if (!isRecord(e)) {
    return String(e);
  }
  const buf = (v: unknown): string =>
    typeof v === "string"
      ? v
      : v instanceof Buffer
        ? v.toString("utf8")
        : "";
  return `${buf(e["stdout"])}${buf(e["stderr"])}`;
};

/** A bin's `--help` output, captured whatever its exit code. */
const binHelpOutput = (bin: string): string => {
  try {
    return execFileSync(bin, ["--help"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    return errOutput(e);
  }
};

/**
 * Scratch-install the just-published package and smoke it: an `import`
 * for an importable surface, a `--help` run for a bin-only tool. Returns
 * the smoke label; THROWS on a broken bin (the `ERR_*` signatures a
 * run-from-source `.ts` launcher trips under node_modules).
 * `min_release_age=0` overrides an ambient guard that would block
 * installing a package published seconds ago.
 */
const smokeInstall = (
  meta: PkgMeta,
  stageRoot: string,
): string => {
  const smoke = join(
    stageRoot,
    `smoke-${meta.dir}`,
  );
  mkdirSync(smoke, { recursive: true });
  execFileSync("npm", ["init", "-y"], {
    cwd: smoke,
    stdio: "ignore",
  });
  execFileSync(
    "npm",
    [
      "install",
      `${meta.name}@${meta.version}`,
      "--loglevel=error",
    ],
    {
      cwd: smoke,
      stdio: ["ignore", "ignore", "inherit"],
      env: {
        ...process.env,
        npm_config_min_release_age: "0",
      },
    },
  );
  const pkg = readPkgJson(
    join(
      repoRoot,
      "packages",
      meta.dir,
      "package.json",
    ),
  );
  if (Boolean(pkg["main"]) || Boolean(pkg["exports"])) {
    execFileSync(
      "node",
      ["-e", `import(${JSON.stringify(meta.name)})`],
      {
        cwd: smoke,
        stdio: ["ignore", "ignore", "inherit"],
      },
    );
    return "import ok";
  }
  const bin = join(
    smoke,
    "node_modules",
    ".bin",
    meta.name,
  );
  if (!existsSync(bin)) {
    return "no runnable surface";
  }
  const out = binHelpOutput(bin);
  if (
    /ERR_MODULE_NOT_FOUND|Cannot find|ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/.test(
      out,
    )
  ) {
    throw new Error(
      `${meta.name} bin cannot run from a real install:\n${out}`,
    );
  }
  return "bin ok";
};

/**
 * Stage → (publish → verify | pack) each package in build order, one
 * compact status line per phase, under a single temp stage root that is
 * always cleaned up. `dryRun` stops after `npm pack` — the registry is
 * never touched — so the whole path is exercisable without a live
 * publish (staging + local pack), which is how it is verified in CI and
 * at night; the live path adds publish + resolve-poll + install smoke.
 */
const runPublishSet = async (
  metas: ReadonlyArray<PkgMeta>,
  dryRun: boolean,
): Promise<void> => {
  const stageRoot = mkdtempSync(
    join(repoRoot, ".publish-stage."),
  );
  try {
    for (const meta of metas) {
      const stage = stageOne(meta, stageRoot);
      if (dryRun) {
        const { filename, size } =
          packStaged(stage);
        process.stdout.write(
          `${label(meta)}  staged → packed ${filename} (${kb(size)})\n`,
        );
        continue;
      }
      process.stdout.write(
        `${label(meta)}  staged\n`,
      );
      publishStaged(stage);
      process.stdout.write(
        `${label(meta)}  published\n`,
      );
      const tries = await resolveOnRegistry(
        meta.name,
        meta.version,
      );
      process.stdout.write(
        `${label(meta)}  resolved (${tries} tries)\n`,
      );
      const smoke = smokeInstall(meta, stageRoot);
      process.stdout.write(
        `${label(meta)}  ${smoke}\n`,
      );
    }
    process.stdout.write(
      `${dryRun ? "dry-run" : "published"}: ${metas.length} package(s)\n`,
    );
  } finally {
    rmSync(stageRoot, {
      recursive: true,
      force: true,
    });
  }
};

const main = async (): Promise<void> => {
  const args = parseArgv(process.argv.slice(2));
  for (const requested of args.only) {
    if (!readOrder().includes(requested)) {
      process.stderr.write(
        `!!! --only requested unknown package dir: ${requested}\n`,
      );
      process.exit(1);
    }
  }
  const order = readOrder().filter(
    (dir) =>
      args.only.length === 0 ||
      args.only.includes(dir),
  );

  // Publish / dry-run: the set is GIVEN by the caller (`--only`, the
  // shell's already-resolved publish set) — no registry version compare,
  // that was the preflight's job. `--only` is required so an accidental
  // bare invocation can never publish the whole family.
  if (args.publish || args.dryRun) {
    if (args.only.length === 0) {
      process.stderr.write(
        "!!! --publish/--dry-run requires --only <dirs>\n",
      );
      process.exit(1);
    }
    await runPublishSet(
      order.map(readMeta).filter((m) => !m.private),
      args.dryRun,
    );
    return;
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
