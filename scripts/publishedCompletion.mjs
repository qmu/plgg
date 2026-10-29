import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  readlinkSync,
  symlinkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { inspectView } from "./fixtures/published-completion/view.mjs";

const registry = "https://registry.npmjs.org";
export const checkIds = [
  "bundle-restart",
  "consumer-ts7",
  "svg-elements",
  "raw-identity",
  "frame-dispatch",
  "lazy-subtree",
];
export function complete(checks) {
  return (
    checks.length === checkIds.length &&
    checkIds.every(
      (id) =>
        checks.filter(
          (check) =>
            check.id === id &&
            check.status === "passed",
        ).length === 1,
    )
  );
}
export function fingerprint(bytes, integrity) {
  const sha512 = createHash("sha512")
    .update(bytes)
    .digest("base64");
  if (integrity !== `sha512-${sha512}`)
    throw Error("tarball-integrity");
  return {
    sha512: `sha512-${sha512}`,
    sha256: createHash("sha256")
      .update(bytes)
      .digest("hex"),
  };
}
function command(
  cwd,
  executable,
  args,
  env = process.env,
) {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const diagnostic = `${result.stdout || ""} ${result.stderr || ""}`;
    const reason = [
      "ERR_FS_EISDIR",
      "CommonJS",
      "ERR_MODULE_NOT_FOUND",
      "ENOENT",
      "TS2322",
    ].find((code) => diagnostic.includes(code));
    throw Error(
      reason ||
        (diagnostic.includes("EISDIR")
          ? "ERR_FS_EISDIR"
          : "command-failed"),
    );
  }
  return result.stdout.trim();
}
async function artifact(name, stage, packages) {
  const response = await fetch(
    `${registry}/${name}/latest`,
    {
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok)
    throw Error("registry-metadata");
  const meta = await response.json();
  if (
    meta.name !== name ||
    !/^\d+\.\d+\.\d+([-.][\w.-]+)?$/.test(
      meta.version,
    )
  )
    throw Error("registry-metadata");
  const url = new URL(meta.dist.tarball);
  if (
    url.origin !== registry ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("registry-url");
  const tar = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!tar.ok) throw Error("registry-download");
  const bytes = Buffer.from(
    await tar.arrayBuffer(),
  );
  const hashes = fingerprint(
    bytes,
    meta.dist.integrity,
  );
  const file = join(stage, `${name}.tgz`);
  writeFileSync(file, bytes);
  packages.push({
    name,
    version: meta.version,
    ...hashes,
  });
  return file;
}
function consumer(stage, name, dependencies) {
  const cwd = join(stage, name);
  mkdirSync(cwd);
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
    }),
  );
  command(cwd, "npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    `--registry=${registry}`,
    ...dependencies,
  ]);
  return cwd;
}
export function repeatBuild(cwd, build) {
  mkdirSync(join(cwd, "src"), {
    recursive: true,
  });
  writeFileSync(
    join(cwd, "bundle.config.ts"),
    `export default { target: 'app', root: import.meta.dirname, rootDir: 'src', outDir: 'dist', entries: [{ name: 'main', input: 'main.ts' }], formats: ['es'], fileNamePattern: '[name].js', alias: { prefix: 'completion-consumer', srcRoot: 'src' } };`,
  );
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
      },
      include: ["src"],
    }),
  );
  const runs = [];
  for (const value of [41, 42]) {
    rmSync(join(cwd, "dist"), {
      recursive: true,
      force: true,
    });
    writeFileSync(
      join(cwd, "src/main.ts"),
      `const value: number = ${value}; console.log(value); export {};`,
    );
    build(value);
    if (
      command(cwd, process.execPath, [
        "dist/main.js",
      ]) !== String(value)
    )
      throw Error("stale-output");
    runs.push({
      value,
      outputSha256: createHash("sha256")
        .update(
          readFileSync(join(cwd, "dist/main.js")),
        )
        .digest("hex"),
    });
  }
  return runs;
}

// The retired launcher keyed its cache by the installed consumer dependencies.
// Preserve that exact directory symlink across both starts; never clean it
// between starts to make a broken second startup appear successful.
export function restartEvidence(
  cwd,
  temporary,
  build,
) {
  const dependencies = join(cwd, "node_modules");
  const installed = join(
    dependencies,
    "plgg-bundle",
  );
  if (lstatSync(installed).isSymbolicLink())
    throw Error("workspace-install");
  const { name, version } = JSON.parse(
    readFileSync(
      join(installed, "package.json"),
      "utf8",
    ),
  );
  const tag = createHash("sha1")
    .update(dependencies)
    .digest("hex")
    .slice(0, 12);
  const cache = join(
    temporary,
    `plgg-relocate-${name}-${version}-${tag}`,
  );
  mkdirSync(cache, { recursive: true });
  for (const entry of [
    "src",
    "bin",
    "package.json",
  ]) {
    const source = join(installed, entry);
    if (existsSync(source))
      cpSync(source, join(cache, entry), {
        recursive: true,
      });
  }
  writeFileSync(
    join(cache, ".plgg-relocate-ready"),
    dependencies + "\n",
  );
  const link = join(cache, "node_modules");
  symlinkSync(dependencies, link, "dir");
  const before = lstatSync(link, {
    bigint: true,
  });
  let preserved = true;
  const runs = repeatBuild(cwd, (value) => {
    build(value, {
      ...process.env,
      TMPDIR: temporary,
      TMP: temporary,
      TEMP: temporary,
    });
    const after = lstatSync(link, {
      throwIfNoEntry: false,
      bigint: true,
    });
    if (
      !after?.isSymbolicLink() ||
      after.ino !== before.ino ||
      after.ctimeNs !== before.ctimeNs ||
      readlinkSync(link) !== dependencies
    )
      preserved = false;
  });
  if (!preserved)
    throw Error("legacy-symlink-mutated");
  return {
    schemaVersion: 1,
    sameConsumer: true,
    legacySymlink: "preserved",
    runs,
  };
}
async function browserChecks(cwd) {
  const require = createRequire(
    join(cwd, "package.json"),
  );
  const { chromium } = require("playwright");
  const paths = new Map([
    [
      "/plgg.js",
      join(
        cwd,
        "node_modules/plgg/dist/index.es.js",
      ),
    ],
    [
      "/view.js",
      join(
        cwd,
        "node_modules/plgg-view/dist/index.es.js",
      ),
    ],
    [
      "/client.js",
      join(
        cwd,
        "node_modules/plgg-view/dist/client.es.js",
      ),
    ],
  ]);
  const server = createServer((req, res) => {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<script type="importmap">{"imports":{"plgg":"/plgg.js","plgg-view":"/view.js","plgg-view/client":"/client.js"}}</script>',
      );
    } else if (paths.has(req.url)) {
      res.setHeader(
        "Content-Type",
        "text/javascript",
      );
      try {
        res.end(readFileSync(paths.get(req.url)));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", resolve),
  );
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(
      `http://127.0.0.1:${server.address().port}/`,
    );
    return {
      checks: await page.evaluate(inspectView),
      browser: browser.version(),
    };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) =>
      server.close(resolve),
    );
  }
}
export async function generate(output) {
  const stage = mkdtempSync(
    join(tmpdir(), "plgg-published-"),
  );
  const checks = checkIds.map((id) => ({
    id,
    status: "blocked",
  }));
  const ledger = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    registry,
    node: process.version,
    consumerCompilers: {
      restart: "6.0.3",
      ts7: "7.0.2",
    },
    browserHarness: "playwright@1.56.1",
    platform: process.platform,
    architecture: process.arch,
    packages: [],
    checks,
    complete: false,
  };
  const probe = async (id, run) => {
    const check = checks.find(
      (check) => check.id === id,
    );
    const phase = (name) => {
      check.phase = name;
    };
    try {
      await run(phase);
      check.status = "passed";
    } catch (error) {
      check.status =
        check.phase === "install"
          ? "blocked"
          : "failed";
      const safeReasons = [
        "ERR_FS_EISDIR",
        "CommonJS",
        "ERR_MODULE_NOT_FOUND",
        "ENOENT",
        "TS2322",
        "stale-output",
        "legacy-symlink-mutated",
        "workspace-install",
        "negative-type-control",
        "consumer-version",
      ];
      check.reason =
        error instanceof Error &&
        safeReasons.includes(error.message)
          ? error.message
          : "consumer-probe-failed";
    }
  };
  try {
    const bundle = await artifact(
      "plgg-bundle",
      stage,
      ledger.packages,
    );
    const view = await artifact(
      "plgg-view",
      stage,
      ledger.packages,
    );
    const core = await artifact(
      "plgg",
      stage,
      ledger.packages,
    );
    await probe("bundle-restart", (phase) => {
      phase("install");
      const cwd = consumer(stage, "restart", [
        bundle,
        "typescript@6.0.3",
      ]);
      const evidence = restartEvidence(
        cwd,
        join(stage, "legacy-tmp"),
        (value, env) => {
          phase(
            value === 41
              ? "first-build"
              : "second-build",
          );
          command(
            cwd,
            process.execPath,
            [
              "node_modules/plgg-bundle/bin/plgg-bundle.mjs",
            ],
            env,
          );
        },
      );
      checks.find(
        (check) => check.id === "bundle-restart",
      ).evidence = {
        ...evidence,
        packageSha256: ledger.packages.find(
          (pkg) => pkg.name === "plgg-bundle",
        ).sha256,
      };
    });
    await probe("consumer-ts7", (phase) => {
      phase("install");
      const cwd = consumer(stage, "ts7", [
        bundle,
        "typescript@7.0.2",
      ]);
      phase("compiler-version");
      const version = command(
        cwd,
        process.execPath,
        [
          "node_modules/typescript/bin/tsc",
          "--version",
        ],
      );
      if (!version.startsWith("Version 7."))
        throw Error("consumer-version");
      repeatBuild(cwd, (value) => {
        phase(
          value === 41
            ? "first-build"
            : "second-build",
        );
        command(cwd, process.execPath, [
          "node_modules/plgg-bundle/bin/plgg-bundle.mjs",
        ]);
      });
      phase("typecheck-and-negative-control");
      command(cwd, process.execPath, [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
      ]);
      writeFileSync(
        join(cwd, "src/main.ts"),
        'const value: number = "wrong"; export {};',
      );
      const rejected = spawnSync(
        process.execPath,
        [
          "node_modules/typescript/bin/tsc",
          "--noEmit",
        ],
        { cwd, encoding: "utf8", timeout: 30000 },
      );
      if (
        rejected.status === 0 ||
        !rejected.stdout.includes("TS2322")
      )
        throw Error("negative-type-control");
    });
    const cwd = consumer(stage, "view", [
      view,
      core,
      "playwright@1.56.1",
    ]);
    const result = await browserChecks(cwd);
    ledger.browser = result.browser;
    for (const resultCheck of result.checks)
      Object.assign(
        checks.find(
          (check) => check.id === resultCheck.id,
        ),
        resultCheck,
      );
  } catch {
    ledger.infrastructure = "blocked";
  } finally {
    ledger.complete = complete(checks);
    mkdirSync(resolve(output, ".."), {
      recursive: true,
    });
    writeFileSync(
      output,
      `${JSON.stringify(ledger, null, 2)}\n`,
    );
    rmSync(stage, {
      recursive: true,
      force: true,
    });
  }
  return ledger;
}
if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  const ledger = await generate(
    resolve(
      process.argv[2] ||
        "artifacts/published-completion.json",
    ),
  );
  console.log(JSON.stringify(ledger, null, 2));
  process.exitCode = ledger.complete ? 0 : 1;
}
