---
created_at: 2026-07-08T19:56:56+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md]
mission:
---

# Initialize the ../plggmatic repository and populate it with the plggmatic cluster

## Overview

Second step of the extraction. The developer has already `git init`'d an empty repo at `../plggmatic` (`/home/ec2-user/projects/plggmatic`, currently just a `.git`). This ticket turns it into a standalone plgg-style monorepo and moves the plggmatic **cluster** into it — `plggmatic`, `@plggmatic/example` (workbench), and `@plggmatic/site` (docs) — re-pointing every cross-repo dependency at **published npm `^version`** packages (the agreed boundary mechanism). After ticket A, plggmatic depends only on `plgg`, `plgg-view`, and the new plgg-family engine/theme package(s); all of those stay in the plgg monorepo and are consumed here across the boundary. `site` additionally consumes `plggpress` (which stays) across the boundary.

This is deliberately **populate-only**: the plgg monorepo keeps its copy of the cluster until ticket C removes it, so neither repo is ever red between B and C.

**Split justification (required by policy).** `modular-monolith-first` treats a separate repo as the exception and requires the rationale recorded in a PR/ADR. This ticket writes that ADR into `../plggmatic` (and references it from the plgg monorepo PR): why plggmatic warrants its own repo (independent versioning/release cadence of the design framework + its showcase, decoupled from the plgg core stack), the cross-repo published-contract implications (the "breaking changes OK / single consumer" freedom no longer holds across the boundary — plggmatic is now a versioned consumer of plgg), and the exit strategy.

## Policies

- `workaholic:design` / `policies/modular-monolith-first.md` — **governing policy**: the split is the exception; record the justification in an ADR (this ticket writes it)
- `workaholic:planning` / `policies/it-investment-evaluation.md` — the ADR weighs the ongoing cross-repo maintenance cost against the concrete benefit (independent reuse/versioning)
- `workaholic:design` / `policies/vendor-neutrality.md` — the cross-repo edge is a published contract; log the dependency decision (Reason/Assessment/Monitoring/Exit) in the new repo
- `workaholic:implementation` / `policies/directory-structure.md` — `../plggmatic` reproduces the top-level-by-role layout: `packages/`, `scripts/`, `workloads/`, `docs/`, `outputs/` (gitignored); public API via root `src/index.ts`
- `workaholic:implementation` / `policies/command-scripts.md` — the new repo gets its own canonical `[verb]-*.sh` runner set (install/build/test/tsc/check-all/format), CI calls the same scripts
- `workaholic:operation` / `policies/ci-cd.md` — one reproducible local check-all; hosted CI only a backstop; its own release flow (CalVer `publish-release.sh` + `publish-npm.sh` per the repo's script-driven release convention)
- `workaholic:implementation` / `policies/coding-standards.md` — carry the same `CLAUDE.md` (no `as`/`any`/`ts-ignore`, Prettier printWidth 50) into the new repo
- `workaholic:implementation` / `policies/containerization.md` — if `site`/example needs a guide/preview container, mirror the plgg `workloads/` setup with pinned base images

## Key Files

- `/home/ec2-user/projects/plggmatic/` — the target repo (empty; init the standard layout here)
- `packages/plggmatic/`, `packages/plggmatic-example/`, `packages/site/` — the cluster to move (with co-located specs)
- `packages/plggmatic/package.json`, `packages/plggmatic-example/package.json`, `packages/site/package.json` — `file:../` deps to rewrite to published `^version` (plgg, plgg-view, the new plgg-family packages, plggpress for site)
- `CLAUDE.md`, `.prettierrc.json`, `scripts/tsc-plgg.sh`, `scripts/test-plgg.sh`, `scripts/check-all.sh`, `scripts/build.sh`, `scripts/publish-npm.sh`, `scripts/publish-release.sh` — templates to adapt for the new repo's own runners
- `scripts/publish-npm.sh` (plgg monorepo) — confirms `plggmatic` is public (publishable) and example/site are private; the new repo's publish flow mirrors this
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — reconcile the extracted design against the recorded D1–D16 decisions

## Related History

- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - notes the earlier plggmatic already lived in its own repo; the rejected-alternatives framing (external file:/npm dep vs moving consumers) informs the cross-repo dep choice
- [20260704131134-fix-plggmatic-publish-script.md](.workaholic/tickets/archive/work-20260704-130317/20260704131134-fix-plggmatic-publish-script.md) - plggmatic-specific publish concerns the new repo's release flow must reproduce
- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - documents the build/publish ordering and guide-container provisioning this repo split reverses

## Implementation Steps

1. **Scaffold `../plggmatic`**: create the standard top-level layout (`packages/`, `scripts/`, `workloads/`, `docs/`, `outputs/` gitignored), a `CLAUDE.md` (same house rules), root `.gitignore`, and the canonical script runners (`tsc`, `test`, `build` dependency-ordered, `check-all`, format, `publish-release`/`publish-npm` CalVer) — adapted from the plgg monorepo, documented in a `README.md`.
2. **Move the cluster** `plggmatic` + `plggmatic-example` + `site` into `../plggmatic/packages/` with their co-located `*.spec.ts` and per-package `.prettierrc.json`/tsconfig.
3. **Re-point cross-repo deps to published npm**: in each moved `package.json`, rewrite `file:../plgg`, `file:../plgg-view`, the new plgg-family engine/theme packages (from ticket A), and (for site) `file:../plggpress` to `^<published version>`. Ensure those packages are published to npm at a consumable version first (or note the publish prerequisite).
4. **Write the split ADR** under `../plggmatic/docs/` (and reference it from the plgg monorepo PR): justification, published-contract implications, dependency decision log (Reason/Assessment/Monitoring/Exit).
5. **Wire the new repo's build/test order** in its own `scripts/build.sh`/`check-all.sh` (plggmatic → plggmatic-example → site; site build via published plggpress), guide/preview container if needed, and README index.
6. Run the new repo's `scripts/check-all.sh` standalone and confirm green (install published deps, build, test, coverage).

## Quality Gate

**Acceptance criteria:**

- `../plggmatic` has the standard layout (`packages/` with the three moved packages, `scripts/` canonical runners, `README.md`, `CLAUDE.md`, `docs/` with the split ADR).
- Every moved `package.json` depends on plgg/plgg-view/the new plgg-family packages/plggpress via published `^version` (no `file:../` deps pointing outside `../plggmatic`).
- The split-justification ADR exists in `../plggmatic/docs/` with the modular-monolith rationale + dependency decision log (Reason/Assessment/Monitoring/Exit).
- `../plggmatic` `scripts/check-all.sh` (or equivalent single check command) passes standalone: install, build, tsc clean, tests green, coverage ≥ the enforced threshold.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` in moved/new code.
- The plgg monorepo is untouched by this ticket except the ADR reference (its copy of the cluster still builds — ticket C removes it).

**Verification method:**

- Run the new repo's canonical check command from a clean `../plggmatic` checkout (deps installed from npm).
- `grep -rn "file:\.\./" ../plggmatic/packages/*/package.json` returns nothing pointing outside the repo.
- Prettier printWidth 50 across the new repo.

**Gate:**

- `../plggmatic` check-all green standalone AND no external `file:../` deps AND the ADR present AND no escape hatches.

## Considerations

- Depends on ticket A: the moved plggmatic must consume the new plgg-family engine/theme packages (not carry a duplicate). Do not start until A has landed and those packages are publishable.
- Publish prerequisite: the new plgg-family packages (ticket A) and any updated plgg/plgg-view must be published to npm at the `^version` this repo pins, or `../plggmatic`'s install will fail — sequence the publish, or document a pre-release/tag strategy.
- `site` depends on `plggpress` (staying); its cross-repo consumption of plggpress is the trickiest edge — confirm plggpress is published and that the SSG build works against the published artifact, not a local path (`packages/site/package.json`).
- This ticket is populate-only; it must NOT delete the cluster from the plgg monorepo (that is ticket C). Keeping both copies temporarily is intentional to avoid a red monorepo.
- The open `20260708192518-plggmatic-dynamic-sources-pure-demo1-update.md` targets plggmatic internals; after this move, decide whether it should be re-created/relocated in `../plggmatic` — note it in the ADR so it is not lost.
