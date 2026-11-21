import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

// Hash source bytes, not git HEAD: uncommitted gate edits must change the version.
export const evidenceSources = [
  "scripts/tsc-plgg.sh",
  "scripts/gate-public-consumer.sh",
  "scripts/build.sh",
  "scripts/publicConsumer.mjs",
  "scripts/publicConsumerEvidence.mjs",
  "scripts/stagePackage.ts",
  "scripts/publicConsumer.spec.mjs",
  "scripts/publicConsumerEvidence.spec.mjs",
];

export const sha256 = (bytes) =>
  createHash("sha256")
    .update(bytes)
    .digest("hex");

export const packageEvidence = (
  pkg,
  tarball,
) => ({
  name: pkg.name,
  version: pkg.version,
  tarballSha256: sha256(readFileSync(tarball)),
});

export const scriptVersion = (root) => {
  const sources = evidenceSources.map((path) => ({
    path,
    sha256: sha256(
      readFileSync(join(root, path)),
    ),
  }));
  return {
    sha256: sha256(JSON.stringify(sources)),
    sources,
  };
};

export const writeEvidence = (
  root,
  output,
  result,
) => {
  const artifact = {
    schemaVersion: 1,
    status: "passed",
    nodeVersion: result.nodeVersion,
    typescriptVersion: result.typescriptVersion,
    scriptVersion: scriptVersion(root),
    packages: result.packages
      .map(
        ({ name, version, tarballSha256 }) => ({
          name,
          version,
          tarballSha256,
        }),
      )
      .sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
  };
  mkdirSync(dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  try {
    writeFileSync(
      temporary,
      JSON.stringify(artifact, null, 2) + "\n",
    );
    renameSync(temporary, output);
  } finally {
    rmSync(temporary, { force: true });
  }
};
