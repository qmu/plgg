import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  satisfies,
  valid,
  validRange,
} from "semver";

export function checkNodeEngine(
  manifest: unknown,
  nodeVersion: string,
): string {
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("name" in manifest) ||
    !("version" in manifest) ||
    typeof manifest.name !== "string" ||
    typeof manifest.version !== "string"
  ) {
    throw new Error(
      "Invalid tarball package identity",
    );
  }
  const identity = `${manifest.name}@${manifest.version}`;
  if (
    !("engines" in manifest) ||
    typeof manifest.engines !== "object" ||
    manifest.engines === null ||
    !("node" in manifest.engines) ||
    typeof manifest.engines.node !== "string" ||
    manifest.engines.node.trim() === "" ||
    validRange(manifest.engines.node) === null
  ) {
    throw new Error(
      `${identity}: missing or invalid engines.node`,
    );
  }
  const range = manifest.engines.node;
  if (
    valid(nodeVersion) === null ||
    !satisfies(nodeVersion, range)
  ) {
    throw new Error(
      `${identity}: Node ${nodeVersion} does not satisfy engines.node ${range}`,
    );
  }
  return `${identity}: Node ${nodeVersion} satisfies engines.node ${range}`;
}

export function checkTarballNodeEngine(
  tarball: string,
  nodeVersion = process.versions.node,
): string {
  const manifest: unknown = JSON.parse(
    execFileSync(
      "tar",
      ["-xOzf", tarball, "package/package.json"],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    ),
  );
  return checkNodeEngine(manifest, nodeVersion);
}

// Only registry specs for this package: no local paths, URLs or lifecycle hooks.
export function gatePublishedFetch(
  version = "latest",
): string {
  if (
    !/^(latest|\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.test(
      version,
    )
  ) {
    throw new Error(
      "Expected latest or an exact plgg-fetch version",
    );
  }
  const directory = mkdtempSync(
    join(tmpdir(), "plgg-fetch-engine-"),
  );
  try {
    execFileSync(
      "npm",
      [
        "pack",
        `plgg-fetch@${version}`,
        "--ignore-scripts",
        "--registry=https://registry.npmjs.org",
      ],
      {
        cwd: directory,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const archives = readdirSync(
      directory,
    ).filter((name) => name.endsWith(".tgz"));
    const archive = archives[0];
    if (
      archives.length !== 1 ||
      archive === undefined
    ) {
      throw new Error(
        "Expected exactly one registry tarball",
      );
    }
    return checkTarballNodeEngine(
      join(directory, archive),
    );
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url ===
    pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length > 3)
      throw new Error(
        "Usage: node scripts/publicNodeEngine.ts [version]",
      );
    console.log(
      gatePublishedFetch(process.argv[2]),
    );
  } catch (error) {
    // Never relay npm's captured output, which can contain host credentials.
    console.error(
      error instanceof Error &&
        !("status" in error)
        ? error.message
        : "Public tarball Node engine gate failed",
    );
    process.exitCode = 1;
  }
}
