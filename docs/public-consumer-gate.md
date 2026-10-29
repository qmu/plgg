# Public package consumer gate

Run `scripts/tsc-plgg.sh --public-consumer` with Node 24 first on `PATH`.
This is the canonical, explicit command for the family-wide packed consumer
check. It fails on other Node majors; there is no CI-only or silent skip path.
The normal `scripts/tsc-plgg.sh` remains the fast plgg source check.

The command builds current sources, stages every non-private workspace package
using the publisher's allowlist and manifest rewrite helpers, checks declared
entry files, packs them, and installs all tarballs together outside the workspace.
The independent consumer declares the root's TypeScript 7 range. Its own compiler
checks all explicit public import paths; Node 24 loads those paths. A deliberately
invalid assignment must produce TS2322. Installation must create real package
directories, not workspace symlinks. Scratch files are removed even on failure.
CLI-only plgg-bundle has no import surface; its declared bin is checked for
presence in the staged package. Wildcard exports fail until explicit samples
are supplied. Network access is required for compiler and external dependencies.

This checks a candidate family release, not the current registry versions or
independently versioned upgrade combinations. Like existing consumer gates and
package configs, it uses skipLibCheck: true: it checks consumer resolution and
usage, not the internal soundness of every declaration. It uses Bundler module
resolution and ESM runtime imports; it does not certify CJS or NodeNext usage.

Existing PRs qmu/plgg#175 and qmu/plgg#177 own live-registry checks;
qmu/plgg#179, qmu/plgg#183, qmu/plgg#186, qmu/plgg#188,
qmu/plgg#189 and qmu/plgg#190 own behavioral consumer regressions.
This common gate adds discovery and release-shaped coverage across the whole
public family without copying those fixtures, compiler resolution changes,
version bumps, Docker changes or workflow edits. Documentation-only PRs
qmu/plgg#176, qmu/plgg#180–#182, qmu/plgg#184–#185 and qmu/plgg#187
are not implementation prerequisites.

The first execution caught a real staging defect: plgg-ir-thesis-proof declared
bin/prove.mjs but allowed only dist. Its files allowlist now includes bin.
Installed entry checks protect this launcher from being omitted again.

## Reproducible verification evidence

A successful run writes `.artifacts/public-consumer.json` (ignored by git).
Retain this file with the command's output when storing verification artifacts.
It describes the candidate tarballs tested together, not the live npm registry.

- `schemaVersion: 1` and `status: "passed"` identify the format and outcome.
- `packages` records each package's name, version and `tarballSha256`, computed
  from the exact compressed tarball bytes passed to the isolated npm install.
- `nodeVersion` and `typescriptVersion` record the actual runtime and consumer
  compiler versions.
- `scriptVersion.sha256` is the content version of the gate. It hashes the JSON
  array in `scriptVersion.sources`; each entry contains the repository-relative
  path and SHA-256 of that source file's bytes, in the recorded order. This covers
  the entry scripts, build script, gate, staging helper, evidence writer and gate
  tests, including uncommitted edits. It is not a git revision or a package version.

The entry shell removes the previous result before checking Node or building;
the JavaScript gate also removes it before its prerequisites. Only a complete
successful gate writes a new JSON file, using a temporary file and rename.
Failure leaves no previous success result. Scratch tarballs are still cleaned up.
No environment variables, registry URLs, credentials, absolute paths or raw
command output are copied into the JSON; only the listed fields are selected.
The digests identify inputs, not signatures or a promise that a future rebuild
will reproduce the same bytes. Run one gate per checkout; parallel runs share the
same output path.
