/** Bind public-consumer evidence to one registry metadata response. */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const registry = "https://registry.npmjs.org/";

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object in public tarball context");
  }
  return Object.fromEntries(Object.entries(value));
}

function read(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function context(metadata: unknown) {
  const data = object(metadata);
  const dist = object(data.dist);
  if (
    data.name !== "plgg" ||
    typeof data.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(data.version)
  ) {
    throw new Error("Expected an exact published plgg version");
  }
  const tarball = `${registry}plgg/-/plgg-${data.version}.tgz`;
  if (
    dist.tarball !== tarball ||
    typeof dist.integrity !== "string" ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(dist.integrity)
  ) {
    throw new Error("Expected a public registry tarball with SHA512 integrity");
  }
  return {
    registry,
    name: data.name,
    version: data.version,
    tarball,
    integrity: dist.integrity,
  };
}

export function verify(
  metadata: unknown,
  lock: unknown,
  installed: unknown,
  compiler: unknown,
): string {
  const expected = context(metadata);
  const packages = object(object(lock).packages);
  const entry = object(packages["node_modules/plgg"]);
  const pkg = object(installed);
  if (
    entry.version !== expected.version ||
    entry.resolved !== expected.tarball ||
    entry.integrity !== expected.integrity ||
    entry.link === true ||
    pkg.name !== expected.name ||
    pkg.version !== expected.version
  ) {
    throw new Error(
      "Installed plgg does not match the public registry context",
    );
  }
  const ts = object(compiler);
  const tsEntry = object(packages["node_modules/typescript"]);
  if (
    ts.name !== "typescript" ||
    typeof ts.version !== "string" ||
    !/^7\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(ts.version) ||
    tsEntry.version !== ts.version ||
    tsEntry.link === true ||
    tsEntry.resolved !== `${registry}typescript/-/typescript-${ts.version}.tgz`
  ) {
    throw new Error(
      "Expected consumer-owned TypeScript 7 from the public registry",
    );
  }
  return `registry=${registry} package=plgg@${expected.version} integrity=${expected.integrity} consumer=typescript@${ts.version}`;
}

function main(): void {
  const [mode, metadataPath, consumer, tsRange] = process.argv.slice(2);
  if (!metadataPath || !consumer)
    throw new Error("Expected mode, metadata file, consumer directory");
  const metadata = read(metadataPath);
  const expected = context(metadata);
  if (mode === "prepare") {
    if (!tsRange || !/^\^7\.\d+\.\d+$/.test(tsRange))
      throw new Error("Expected a TypeScript 7 range");
    writeFileSync(
      join(consumer, "package.json"),
      JSON.stringify(
        {
          name: "gate-public-tarball-consumer",
          private: true,
          version: "0.0.0",
          devDependencies: { typescript: tsRange },
          dependencies: { plgg: expected.tarball },
        },
        null,
        2,
      ),
    );
    console.log(
      `public tarball context: registry=${registry} package=plgg@${expected.version} tarball=${expected.tarball} integrity=${expected.integrity}`,
    );
    return;
  }
  if (mode !== "verify") throw new Error("Unknown public tarball context mode");
  const consumerRequire = createRequire(
    join(resolve(consumer), "package.json"),
  );
  const compilerManifest = consumerRequire.resolve("typescript/package.json");
  if (
    realpathSync(compilerManifest) !==
    join(realpathSync(consumer), "node_modules/typescript/package.json")
  ) {
    throw new Error("TypeScript resolved outside the consumer");
  }
  console.log(
    verify(
      metadata,
      read(join(consumer, "package-lock.json")),
      read(join(consumer, "node_modules/plgg/package.json")),
      read(compilerManifest),
    ),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
