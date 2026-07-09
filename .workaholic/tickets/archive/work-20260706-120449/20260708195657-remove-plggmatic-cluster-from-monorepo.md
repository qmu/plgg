---
created_at: 2026-07-08T19:56:57+09:00
author: a@qmu.jp
type: refactoring
layer: [Config, Infrastructure]
effort: 2h
commit_hash: 1e4d4e30
category: Removed
depends_on: [20260708195656-init-and-populate-plggmatic-repo.md]
mission:
---

# C — Remove the plggmatic cluster from the plgg monorepo (KEEP `plgg-ui`) and rewire its scripts

## Overview

Final step of the extraction (`/trip` `plggmatic-extraction-cut`),
refined. After A1–A3 (plggpress off plggmatic; the engine is
`plgg-ui`; plggmatic is a thin design-system package) and ticket B
(`../plggmatic` is populated and green standalone), this ticket
deletes the plggmatic **cluster** from the plgg monorepo —
`packages/plggmatic`, `packages/plggmatic-example`, `packages/site`
— and removes every script/config reference so `scripts/check-all.sh`
is green without them.

**KEEP `plgg-ui`.** The `/trip` decision is that the engine+theme
package `plgg-ui` STAYS in this monorepo (it is what plggpress and
the extracted plggmatic both consume). Only the three
showcase/brand packages leave. Do not touch `plgg-ui`'s wiring
except where a removed cluster line sat adjacent to it.

Because there are no npm workspaces, the wiring lives entirely in
`scripts/*.sh` + a few gates, updated in lockstep (publish order and
guide provisioning are `sed`-derived from `build.sh`, so `build.sh`
is the source of truth to edit).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the monorepo's top-level stays coherent after removal; README index reflects reality (applies to all code work)
- `workaholic:implementation` / `policies/command-scripts.md` — keep the canonical runner set consistent; delete the orphaned `test-plggmatic*.sh`/`test-site.sh`; CI/check-all stay the single entry
- `workaholic:operation` / `policies/ci-cd.md` — `scripts/check-all.sh` remains the one reproducible gate; must pass WITHOUT the cluster and WITH `plgg-ui`
- `workaholic:design` / `policies/modular-monolith-first.md` — removing packages is a boundary change; the split rationale (ADR from ticket B) is referenced from this PR
- `workaholic:design` / `policies/sacrificial-architecture.md` — the cluster is the disposed shell; `plgg-ui` + the plgg core are the retained durable engine
- `workaholic:design` / `policies/vendor-neutrality.md` — the guide container's dep lists + `gate-guide-deps.sh` stay reconciled (plggpress depends on `plgg-ui`, not plggmatic)
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; Prettier printWidth 50 on any edited script/config (applies to all code work)
- `workaholic:implementation` / `policies/directory-structure.md` covers layout; `workaholic:implementation` / `policies/test.md` — the remaining `test-*.sh` (incl. `test-plgg-ui.sh`) stay green
- `workaholic:operation` / `policies/ci-cd.md` — publish-order dry-run valid without the cluster

## Trip Origin

`.workaholic/trips/plggmatic-extraction-cut/designs/design-v2.md`
§5 (Delivery — C: remove the cluster, keep plgg-ui) and §2
(plgg-ui stays).

## Key Files

- `packages/plggmatic/`, `packages/plggmatic-example/`, `packages/site/` — deleted from the monorepo (`packages/plgg-ui/` STAYS)
- `scripts/build.sh` — remove the three cluster `cd` lines + the `site/dist/example ← plggmatic-example/dist` copy step; **keep the `plgg-ui` cd-line**; this is the sed source for publish order + guide provisioning
- `scripts/check-all.sh` — remove the `test-plggmatic`/`test-plggmatic-example`/`test-site` lines; **keep `test-plgg-ui`**
- `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`, `scripts/test-site.sh` — delete (orphaned)
- `scripts/publish-npm.sh` — publish order sed-derived from `build.sh`; confirm a valid order without the cluster and WITH `plgg-ui`
- `scripts/gate-guide-deps.sh`, `workloads/guide/{dev-entrypoint.sh,compose.yaml}` — remove plggmatic from the guide install/volume/build lists (plggpress's dep set is `plgg-ui` after A2); keep `plgg-ui`
- `README.md` — drop the plggmatic/site/plggmatic-example index entries; keep/ensure the `plgg-ui` entry (gate-readme)
- `.workaholic/constraints/architecture.md` — update the dependency-direction + vendor-boundary audit for the removed packages (plgg-ui row stays)

## Related History

- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - the precedent that likewise removed a plggmatic and cleaned its wiring
- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - its Final Report enumerates the build.sh ordering, guide-container lists, gate-guide-deps, and publish order this ticket reverses

## Implementation Steps

1. Confirm prerequisites: plggpress imports zero plggmatic (A2), the theme is parameterized (A3), and `../plggmatic` is green standalone with the cluster (B).
2. Delete `packages/plggmatic`, `packages/plggmatic-example`, `packages/site` (with their specs/manifests). Leave `packages/plgg-ui` intact.
3. Edit `scripts/build.sh`: remove the three cluster `cd` lines + the final `site/dist/example ← plggmatic-example/dist` copy step; keep the `plgg-ui` cd-line. Publish order + guide provisioning follow from the sed source.
4. Edit `scripts/check-all.sh`: remove the three cluster `test-*.sh` invocations (keep `test-plgg-ui`). Delete `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`, `scripts/test-site.sh`.
5. Update the guide container: remove plggmatic from `workloads/guide/dev-entrypoint.sh`, `compose.yaml`, and the build list; keep `plgg-ui` so `scripts/gate-guide-deps.sh` reconciles with plggpress's `plgg-ui` dep set.
6. Update `README.md` index (drop the three entries, keep `plgg-ui`; satisfy gate-readme) and `.workaholic/constraints/architecture.md` (dependency-direction + vendor-boundary reflect the removed packages; `plgg-ui` row stays), referencing the ticket-B split ADR. Reconcile the pre-existing "developed in its own repository" prose so the index is accurate after this real move.
7. Run `scripts/check-all.sh` fresh and confirm green without the cluster; run `scripts/publish-npm.sh` order-check/dry-run to confirm the sed-derived order is valid.

## Quality Gate

**Acceptance criteria:**

- `packages/plggmatic`, `packages/plggmatic-example`, `packages/site` no longer exist; `packages/plgg-ui` still exists and builds.
- No monorepo file references the removed packages as live wiring: `grep -rn "plggmatic\|@plggmatic/example\|@plggmatic/site" scripts/ workloads/ README.md` returns only intentional references (history/ADR links).
- `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`, `scripts/test-site.sh` are deleted; `build.sh`/`check-all.sh` have no cluster lines but retain `plgg-ui`.
- `scripts/gate-guide-deps.sh` and `gate-readme.sh` pass.
- `.workaholic/constraints/architecture.md` audit updated (removed packages gone, `plgg-ui` row present).
- No `as`, `any`, `@ts-ignore` introduced in any edited script/config.

**Verification method:**

- `scripts/check-all.sh` green (all gates incl. gate-guide-deps + gate-readme, build, every remaining `test-*.sh` incl. `test-plgg-ui`).
- `scripts/publish-npm.sh` order-check/dry-run produces a valid publish order without the cluster.
- `grep` confirms no live wiring references the removed packages.

**Gate:**

- `scripts/check-all.sh` green WITHOUT the cluster AND WITH `plgg-ui` AND the grep/gate checks clean AND the publish-order dry-run valid AND both repos (this one + `../plggmatic`) build.

## Considerations

- **Depends on A3 and B** (transitively A1/A2) — do not run until plggpress is off plggmatic, the theme is parameterized, AND `../plggmatic` holds a green copy of the cluster, or code/history is lost or the monorepo goes red.
- **KEEP `plgg-ui`** — it is the retained engine, not part of the cluster. Deleting it would break plggpress.
- `build.sh` is the single source of truth for publish order + guide provisioning (sed-derived); never hand-fork the derived lists — edit `build.sh` and let them follow (PR #51 drift incident).
- This is the irreversible half: once the three packages are deleted here, `../plggmatic` is their only home. Confirm ticket B's standalone green first.

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: Removing packages from the repo also requires clearing package-local README and lockfile references, not only the top-level scripts.
  **Context**: `gate-readme` caught `packages/plgg-ui/README.md` linking to the deleted `../plggmatic/` directory, and `packages/plggpress/package-lock.json` still carried extraneous local stanzas from the older plggpress/plggmatic coupling. Keeping these files reconciled prevents a later install or docs gate from resurrecting stale monorepo assumptions.
