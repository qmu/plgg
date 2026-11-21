# Node 24 workflow integration entry

Related: qmu/plgg#171. This entry owns only the future workflow patch;
qmu/plgg#199 / qmu/plgg#206 own integration decisions, qmu/plgg#207 owns
permission-blocker evidence, and qmu/plgg#205 owns actual CI-result evidence.
It does not detect token permissions or claim a Node 24 CI run succeeded.

From the repository root, using Node 24 (or Node 22 with native type stripping):

```sh
node scripts/node24Workflows.ts --check
node --test scripts/node24Workflows.spec.ts
```

Check exits 1 while either workflow still needs integration, 0 only when both
match the reviewed target, and 1 on drift or invalid arguments. It never writes.
It is deliberately separate from check-all while workflow writes are blocked.

After workflow write permission is restored, on a new work branch from current
origin/main, run:

```sh
node scripts/node24Workflows.ts --write
node scripts/node24Workflows.ts --check
node --test scripts/node24Workflows.spec.ts
git diff -- .github/workflows
```

Submit that diff through one PR. The generator updates checkout/setup-node to
v5 in both workflows, gives check-all exactly one fail-fast=false Node 22/24
matrix, and preserves deploy-guide's single Node 22 publisher. Repeating write
is a no-op. Both files are validated before any writes; ordinary filesystem
write failures can still interrupt a write and require rerunning the command.
No workflow modification is included in this preparatory PR.

SHA-256 pins identify the exact reviewed baseline and target, so unexpected
workflow edits (including partial migration) fail closed instead of silently
losing changes. On drift, review the new main workflows, update the transform,
pins and baseline fixtures together, and rerun the regression tests. The fixtures
are test snapshots, never workflow sources used for deployment. Tests remain
valid after the real workflows migrate.

A successful local check proves only the file plan. Close qmu/plgg#171 only after
the workflow PR is merged and actual Node 22 and Node 24 check-all jobs pass;
local generation does not remove the permission blocker or manufacture CI evidence.
