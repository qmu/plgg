# Public tarball consumer gate

Run `GATE_PUBLIC_TARBALL=1 ./scripts/gate-public-tarball-node24.sh`
from the repository. CI runs it through `scripts/check-all.sh`.
It needs curl, tar, npm, Node with native TypeScript stripping, and
network access to nodejs.org and registry.npmjs.org. Local runs without
opt-in skip; an enabled gate fails when required tooling is unavailable.

The gate downloads Node 24 and queries the public registry once for
`plgg@latest`. It installs the returned tarball URL into a temporary
consumer, then checks its lockfile version, URL and integrity against
that same response. The installed manifest must agree too. An ambient
npm registry override does not change the explicit public registry.
No local workspace version or build is evidence for this check.

The consumer must resolve its own installed TypeScript 7. It compiles
the pipeline fixture, runs the output (`Result: 12`), and rejects a
second compilation with a deliberate TS2322. Context is printed before
installation so a failed run retains its exact package, registry,
tarball and integrity in the command output. Temporary files are
removed on exit; each retry resolves a fresh context.

Offline contract tests: `node --test scripts/publicTarballContext.spec.ts`.

This gate verifies public **plgg**. It does not prove the fix for
qmu/plgg#156 is published in **plgg-bundle**. That issue requires a
corrected bundle release and a separate registry-installed bundle
consumer check. A green local-pack gate cannot replace that evidence.
