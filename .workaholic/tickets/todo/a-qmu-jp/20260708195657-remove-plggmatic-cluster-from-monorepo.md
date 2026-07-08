---
created_at: 2026-07-08T19:56:57+09:00
author: a@qmu.jp
type: refactoring
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md, 20260708195656-init-and-populate-plggmatic-repo.md]
mission:
---

# Remove the plggmatic cluster from the plgg monorepo and rewire its scripts

## Overview

Final step. After ticket A (plggpress no longer imports plggmatic) and ticket B (`../plggmatic` is populated and green standalone), this ticket deletes the plggmatic **cluster** from the plgg monorepo — `packages/plggmatic`, `packages/plggmatic-example`, `packages/site` — and removes every script/config reference so `scripts/check-all.sh` is green without them. Because there are no npm workspaces, the wiring lives entirely in `scripts/*.sh` + a few gates, all of which must be updated in lockstep (publish order and guide provisioning are `sed`-derived from `build.sh`, so `build.sh` is the source of truth to edit).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the monorepo's top-level stays coherent after removal; README index reflects reality (applies to all code work)
- `workaholic:implementation` / `policies/command-scripts.md` — keep the canonical runner set consistent; delete the now-orphaned `test-plggmatic*.sh`/`test-site.sh`; CI/check-all stay the single entry
- `workaholic:operation` / `policies/ci-cd.md` — `scripts/check-all.sh` remains the one reproducible gate; it must pass without the cluster
- `workaholic:design` / `policies/modular-monolith-first.md` — removing a package is a boundary change; the split rationale (ADR from ticket B) is referenced from this PR
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; Prettier printWidth 50 on any edited script/config (applies to all code work)
- `workaholic:design` / `policies/vendor-neutrality.md` — the guide container's dep lists + `gate-guide-deps.sh` stay reconciled after plggpress drops plggmatic

## Key Files

- `packages/plggmatic/`, `packages/plggmatic-example/`, `packages/site/` — deleted from the monorepo
- `scripts/build.sh` — remove the three cluster `cd` lines and the `site/dist/example` copy step; this is the sed source for publish order + guide provisioning
- `scripts/check-all.sh` — remove the `test-plggmatic`/`test-plggmatic-example`/`test-site` lines
- `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`, `scripts/test-site.sh` — delete (orphaned)
- `scripts/publish-npm.sh` — publish order is sed-derived from `build.sh`; confirm it produces a valid order without the cluster
- `scripts/gate-guide-deps.sh`, `workloads/guide/dev-entrypoint.sh`, `workloads/guide/compose.yaml` — remove plggmatic from the guide container's install/volume/build lists (already dropped from plggpress's dep set in ticket A) so the gate passes
- `README.md` — drop the plggmatic/site/plggmatic-example index entries (gate-readme.sh enforces index+backlink)
- `.workaholic/constraints/architecture.md` — removing packages is a "Review trigger"; update the dependency-direction + vendor-boundary audit

## Related History

- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - the precedent that likewise removed a plggmatic from the monorepo and cleaned its wiring
- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - its Final Report enumerates exactly the build.sh ordering, guide-container lists (dev-entrypoint.sh/compose.yaml), gate-guide-deps.sh, and publish order this ticket reverses

## Implementation Steps

1. Confirm prerequisites are done: plggpress imports zero plggmatic (ticket A) and `../plggmatic` is green standalone with the cluster (ticket B).
2. Delete `packages/plggmatic`, `packages/plggmatic-example`, `packages/site` (with their specs/manifests).
3. Edit `scripts/build.sh`: remove the three cluster `cd` lines and the final `site/dist/example ← plggmatic-example/dist` copy step. This is the sed source, so publish order + guide provisioning follow.
4. Edit `scripts/check-all.sh`: remove the three cluster `test-*.sh` invocations. Delete `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`, `scripts/test-site.sh`.
5. Update the guide container: remove plggmatic from `workloads/guide/dev-entrypoint.sh`, `compose.yaml`, and the build list so `scripts/gate-guide-deps.sh` reconciles (plggpress's dep set no longer includes plggmatic after ticket A).
6. Update `README.md` index (drop the three entries; satisfy gate-readme.sh) and `.workaholic/constraints/architecture.md` (dependency-direction + vendor-boundary audit reflect the removed packages), referencing the ticket-B split ADR.
7. Run `scripts/check-all.sh` and confirm green without the cluster; run `scripts/publish-npm.sh` in dry-run/order-check mode to confirm the sed-derived publish order is still valid.

## Quality Gate

**Acceptance criteria:**

- `packages/plggmatic`, `packages/plggmatic-example`, `packages/site` no longer exist in the monorepo.
- No monorepo file references the removed packages: `grep -rn "plggmatic\|@plggmatic/example\|@plggmatic/site" scripts/ workloads/ README.md` returns only intentional references (e.g. history/ADR links), no live build/test/provision wiring.
- `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`, `scripts/test-site.sh` are deleted; `build.sh`/`check-all.sh` have no cluster lines.
- `scripts/gate-guide-deps.sh` passes (guide container lists reconciled); `gate-readme.sh` passes (README index has no dangling/removed entries).
- `.workaholic/constraints/architecture.md` audit updated for the removed packages.
- No `as`, `any`, `@ts-ignore` introduced in any edited script/config.

**Verification method:**

- `scripts/check-all.sh` green (all gates incl. gate-guide-deps + gate-readme, build, every remaining `test-*.sh`).
- `scripts/publish-npm.sh` order-check/dry-run produces a valid publish order without the cluster.
- `grep` confirms no live wiring references the removed packages.

**Gate:**

- `scripts/check-all.sh` green WITHOUT the cluster AND the grep/gate checks clean AND the publish-order dry-run valid AND both repos (this one + `../plggmatic`) build.

## Considerations

- Depends on tickets A and B — do not run until plggpress is off plggmatic AND `../plggmatic` holds a green copy of the cluster, or code/history is lost or the monorepo goes red.
- `build.sh` is the single source of truth for publish order + guide provisioning (sed-derived); never hand-fork the derived lists — edit `build.sh` and let them follow (PR #51 drift incident).
- This is the irreversible half: once the packages are deleted here, `../plggmatic` is the only home. Confirm ticket B's standalone green before deleting (`packages/plggmatic/`, `packages/plggmatic-example/`, `packages/site/`).
- Reconcile the pre-existing README wording (entries already say plggmatic is "developed in its own repository" — that referred to the retired facade) so the index is accurate after this real move (`README.md`).
