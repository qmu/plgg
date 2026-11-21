import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const helper = fileURLToPath(
  new URL("./publicTarballContext.ts", import.meta.url),
);
import { strict } from "node:assert";
import { test } from "node:test";
import { context, registry, verify } from "./publicTarballContext.ts";

const metadata = {
  name: "plgg",
  version: "0.0.19",
  dist: {
    tarball: `${registry}plgg/-/plgg-0.0.19.tgz`,
    integrity: "sha512-YWJjZA==",
  },
};
const installed = { name: "plgg", version: "0.0.19" };
const compiler = { name: "typescript", version: "7.0.2" };
const entry = {
  version: installed.version,
  resolved: metadata.dist.tarball,
  integrity: metadata.dist.integrity,
};
const tsEntry = {
  version: compiler.version,
  resolved: `${registry}typescript/-/typescript-7.0.2.tgz`,
};
const lock = {
  packages: { "node_modules/plgg": entry, "node_modules/typescript": tsEntry },
};

test("binds published version, registry, integrity and consumer TS7", () => {
  strict.equal(context(metadata).version, installed.version);
  strict.match(
    verify(metadata, lock, installed, compiler),
    /consumer=typescript@7.0.2/,
  );
});

for (const bad of [
  null,
  [],
  {},
  { ...metadata, name: "plgg-bundle" },
  { ...metadata, version: "latest" },
  { ...metadata, version: "0.0.19 trailing" },
  {
    ...metadata,
    dist: { ...metadata.dist, tarball: "https://mirror.invalid/plgg.tgz" },
  },
  { ...metadata, dist: { ...metadata.dist, integrity: "" } },
]) {
  test(`rejects invalid acquisition metadata ${JSON.stringify(bad)}`, () => {
    strict.throws(() => context(bad));
  });
}
for (const changed of [
  { version: "0.0.20" },
  { resolved: "file:../plgg" },
  { resolved: "https://mirror.invalid/plgg.tgz" },
  { integrity: "sha512-b3RoZXI=" },
  { link: true },
]) {
  test(`rejects installed artifact drift ${JSON.stringify(changed)}`, () => {
    const changedLock = {
      packages: {
        ...lock.packages,
        "node_modules/plgg": { ...entry, ...changed },
      },
    };
    strict.throws(() => verify(metadata, changedLock, installed, compiler));
  });
}
test("rejects installed manifest mismatch", () => {
  strict.throws(() =>
    verify(metadata, lock, { ...installed, version: "0.0.20" }, compiler),
  );
});
for (const changed of [
  { version: "6.0.3" },
  { version: "7.0.2junk" },
  { name: "other" },
]) {
  test(`rejects wrong consumer compiler ${JSON.stringify(changed)}`, () => {
    strict.throws(() =>
      verify(metadata, lock, installed, { ...compiler, ...changed }),
    );
  });
}
test("rejects a compiler acquired from another registry", () => {
  const changedLock = {
    packages: {
      ...lock.packages,
      "node_modules/typescript": {
        ...tsEntry,
        resolved: "https://mirror.invalid/ts.tgz",
      },
    },
  };
  strict.throws(() => verify(metadata, changedLock, installed, compiler));
});
test("rejects missing lockfile packages", () => {
  strict.throws(() => verify(metadata, {}, installed, compiler));
});

test("CLI prepares the resolved tarball even when ambient registry differs", () => {
  const root = mkdtempSync(join(tmpdir(), "public-context-"));
  try {
    const metadataPath = join(root, "metadata.json");
    writeFileSync(metadataPath, JSON.stringify(metadata));
    const result = spawnSync(
      process.execPath,
      [helper, "prepare", metadataPath, root, "^7.0.2"],
      {
        encoding: "utf8",
        env: { ...process.env, npm_config_registry: "https://mirror.invalid/" },
      },
    );
    strict.equal(result.status, 0, result.stderr);
    const manifest: unknown = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    strict.deepEqual(manifest, {
      name: "gate-public-tarball-consumer",
      private: true,
      version: "0.0.0",
      devDependencies: { typescript: "^7.0.2" },
      dependencies: { plgg: metadata.dist.tarball },
    });
    strict.match(result.stdout, /registry=https:\/\/registry.npmjs.org\//);
    strict.match(result.stdout, /package=plgg@0.0.19/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI rejects hoisted compiler resolution outside the scratch consumer", () => {
  const root = mkdtempSync(join(tmpdir(), "public-context-"));
  try {
    const consumer = join(root, "consumer");
    mkdirSync(consumer);
    mkdirSync(join(root, "node_modules/typescript"), { recursive: true });
    writeFileSync(
      join(root, "node_modules/typescript/package.json"),
      JSON.stringify(compiler),
    );
    const metadataPath = join(root, "metadata.json");
    writeFileSync(metadataPath, JSON.stringify(metadata));
    const result = spawnSync(
      process.execPath,
      [helper, "verify", metadataPath, consumer],
      { encoding: "utf8" },
    );
    strict.notEqual(result.status, 0);
    strict.match(result.stderr, /TypeScript resolved outside the consumer/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local opt-out exits before attempting registry or toolchain acquisition", () => {
  const result = spawnSync(
    "sh",
    [
      fileURLToPath(
        new URL("./gate-public-tarball-node24.sh", import.meta.url),
      ),
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "false",
        GATE_PUBLIC_TARBALL: "0",
        npm_config_registry: "https://unreachable.invalid/",
      },
    },
  );
  strict.equal(result.status, 0, result.stderr);
  strict.match(result.stdout, /skipped/);
});
