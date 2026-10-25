# Public package pre-publication diagnostics

The publisher uses `scripts/publicPackageGate.ts` for its stage and pack
checks. Both `--dry-run` and `--publish` check every selected package before
the first registry publish. A failure exits with status 1 and removes the
temporary `.publish-stage.*` directory.

Each failure reports the package and version, `phase: stage` or `phase: pack`,
a reason, and a command to reproduce from the repository root:

```text
Error: public-package gate FAILED: plgg-parser@0.0.1
phase: stage
reason: plgg-parser: staged tarball is missing declared entry point(s): ...
reproduce (from repository root; no publish): node scripts/publish.ts --dry-run --only 'plgg-parser'
```

The reproduction stages the current working tree and runs `npm pack`; it
never publishes or installs a registry package. Run `npm ci` first in a clean
checkout. Missing declared entries require building the package and its
workspace dependencies, or correcting the manifest's staging allowlist and
entry targets. An absent `files` allowlist has a separate reason.

Unexpected file or command failures report a numeric exit status or a safe
Node error code when available. Raw child-process output is captured rather
than echoed because it may contain credentials. For a pack failure, check
that `npm` is on PATH and that the staged inputs are readable and packable.
The suggested command reproduces the whole stage/pack path, not an already
removed temporary directory. Its package argument is shell-quoted.

This diagnostic contract covers pre-publication stage/pack checks only.
Registry propagation, post-publication smoke tests, consumer TypeScript
checks, and runtime compatibility retain their own gates and output. A green
stage/pack check alone does not certify those conditions.

Run the diagnostic regression tests without registry access:

```sh
node --test scripts/publicPackageGate.spec.ts
```

The CLI fixtures exercise missing allowlists, missing entries, pack command
failure and success, including exit status, cleanup and output suppression.
The shared helper tests also cover argument quoting and unexpected errors.
