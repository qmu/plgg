---
created_at: 2026-07-08T19:56:56+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260709000045-parameterize-plgg-ui-theme.md]
mission:
---

# B — Initialize `../plggmatic` and populate it with the Pragmatic design-system + showcase (on published `plgg-ui`)

## Overview

Fourth step of the extraction (`/trip` `plggmatic-extraction-cut`),
refined. The developer has already `git init`'d an empty repo at
`../plggmatic` (`/home/ec2-user/projects/plggmatic`, currently just
a `.git`). This ticket turns it into a standalone plgg-style
monorepo and moves the plggmatic **cluster** into it — the
`plggmatic` design-system package, `plggmatic-example` (workbench +
Demo 1), and `site` (docs) — re-pointing every cross-repo
dependency at **published npm `^version`** packages.

**What moves is the design system + showcase, NOT the engine.** The
`/trip` settled that the engine+theme is `plgg-ui`, which STAYS in
the plgg monorepo. So after A1–A3, `plggmatic` is a thin-but-real
design-system package (the `Theme` contract + branded `--pm-*`
default + palette-override API + concept/spec/DSL docs) that depends
on `plgg`, `plgg-view`, and **`plgg-ui`** — all of which stay in the
plgg monorepo and are consumed here across the boundary via
published `^version`. `site` additionally consumes `plggpress`
(stays) across the boundary.

This is deliberately **populate-only**: the plgg monorepo keeps its
copy of the cluster until ticket C removes it, so neither repo is
ever red between B and C.

**Publish prerequisite (surfaced, NEVER auto-performed).** This
ticket pins published `^version` of `plgg`, `plgg-view`, and
`plgg-ui` (+ `plggpress` for `site`). Those packages must be
published to npm at a consumable version **before** `../plggmatic`
installs, or its install fails. Publishing is a developer-run step
(`scripts/publish-release.sh` + `scripts/publish-npm.sh`, CalVer,
past the 1.0.0 ghost, `--tag latest`) — the trip/drive surfaces it
as a gating prerequisite and does not run it autonomously. A
pre-release/tag strategy is the fallback if publishing the whole
chain up front is undesirable.

**Split justification (required by policy).** `modular-monolith-first`
treats a separate repo as the exception and requires the rationale
recorded in an ADR. This ticket writes that ADR into `../plggmatic`
(and references it from the plgg monorepo PR): why plggmatic warrants
its own repo (independent versioning/release cadence of the design
system + showcase, decoupled from the plgg core stack), the
cross-repo published-contract implications (breaking-changes-OK /
single-consumer freedom no longer holds across the boundary —
plggmatic is now a versioned consumer of `plgg-ui`), the roadmap
amendment (**D13 reversed** — plggmatic no longer canonical in this
monorepo; **D1 refined** — the scheduler *engine* is `plgg-ui`,
plggmatic is its branded/DSL home; **D16 guarded** — `plgg-ui`'s
`defaultTheme` carries `--pm-`/`vp-appearance`), the fate of ticket
`20260708192518` (its framework half lands in `plgg-ui`; its Demo 1
half follows the showcase here), and the exit strategy.

## Policies

- `workaholic:design` / `policies/modular-monolith-first.md` — **governing policy**: the split is the exception; record the justification in an ADR (this ticket writes it); A3 ensured the extracted package is not an empty shell
- `workaholic:design` / `policies/sacrificial-architecture.md` — the design-language values + showcase are the rebuildable identity; the durable core (data/domain/contracts) reasoning is recorded
- `workaholic:design` / `policies/vendor-neutrality.md` — the cross-repo edge is a published contract; log the dependency decision (Reason/Assessment/Monitoring/Exit) in the new repo
- `workaholic:implementation` / `policies/directory-structure.md` — `../plggmatic` reproduces the top-level-by-role layout (`packages/`, `scripts/`, `workloads/`, `docs/`, `outputs/` gitignored); public API via root `src/index.ts`
- `workaholic:implementation` / `policies/coding-standards.md` — carry the same `CLAUDE.md` (no `as`/`any`/`ts-ignore`, Prettier printWidth 50) into the new repo
- `workaholic:implementation` / `policies/type-driven-design.md` — the moved `Theme` contract + palette-override API stay typed across the boundary
- `workaholic:implementation` / `policies/test.md` — the moved specs stay green standalone; coverage ≥ the enforced threshold
- `workaholic:operation` / `policies/ci-cd.md` — one reproducible local check-all; its own script-driven CalVer release flow (`publish-release.sh` + `publish-npm.sh`)
- `workaholic:implementation` / `policies/command-scripts.md` — the new repo gets its own canonical `[verb]-*.sh` runner set (install/build/test/tsc/check-all/format/publish); CI calls the same scripts

## Trip Origin

`.workaholic/trips/plggmatic-extraction-cut/designs/design-v2.md`
§4 (cluster-vs-package — extract now, not empty), §5 (Delivery —
B), §6 (roadmap amendment), and §8 (cross-repo contract + the
publish prerequisite).

## Key Files

- `/home/ec2-user/projects/plggmatic/` — the target repo (empty; init the standard layout here)
- `packages/plggmatic/`, `packages/plggmatic-example/`, `packages/site/` — the cluster to move (with co-located specs)
- their `package.json`s — `file:../` deps to rewrite to published `^version` (`plgg`, `plgg-view`, **`plgg-ui`**, and `plggpress` for `site`)
- `CLAUDE.md`, `.prettierrc.json`, `scripts/{tsc-plgg,test-plgg,check-all,build,publish-npm,publish-release}.sh` — templates to adapt for the new repo's own runners
- `.workaholic/specs/20260708-pragmatic-*` (concept + two model specs) + `20260704-plggmatic-scheduler-design.md` — the north-star docs that travel with the package
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — reconcile the extracted design against D1–D16 (record the D13/D1/D16 amendment)

## Related History

- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - the earlier plggmatic already lived in its own repo; the external-dep-vs-move framing informs the cross-repo dep choice
- [20260704131134-fix-plggmatic-publish-script.md](.workaholic/tickets/archive/work-20260704-130317/20260704131134-fix-plggmatic-publish-script.md) - plggmatic-specific publish concerns the new repo's release flow must reproduce
- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - the build/publish ordering + guide-container provisioning this split reverses

## Implementation Steps

1. **Confirm the publish prerequisite is satisfied** (surfaced, developer-run): `plgg`, `plgg-view`, `plgg-ui` (+ `plggpress` for site) are published to npm at the `^version` this repo will pin — or a pre-release/tag strategy is chosen. Do NOT auto-publish.
2. **Scaffold `../plggmatic`**: standard top-level layout (`packages/`, `scripts/`, `workloads/`, `docs/`, `outputs/` gitignored), a `CLAUDE.md` (same house rules), root `.gitignore`, and the canonical script runners (`tsc`, `test`, `build` dependency-ordered, `check-all`, format, `publish-release`/`publish-npm` CalVer) adapted from the plgg monorepo, documented in a `README.md`.
3. **Move the cluster** `plggmatic` + `plggmatic-example` + `site` into `../plggmatic/packages/` with their co-located `*.spec.ts` and per-package `.prettierrc.json`/tsconfig; carry the Pragmatic concept/spec/scheduler-design docs into `../plggmatic/docs/` (or `.workaholic/specs/`).
4. **Re-point cross-repo deps to published npm**: in each moved `package.json`, rewrite `file:../plgg`, `file:../plgg-view`, `file:../plgg-ui`, and (for site) `file:../plggpress` to `^<published version>`.
5. **Write the split ADR** under `../plggmatic/docs/` (referenced from the plgg monorepo PR): justification, published-contract implications, dependency decision log (Reason/Assessment/Monitoring/Exit), the D13/D1/D16 amendment, and the `20260708192518` fate note.
6. **Wire the new repo's build/test order** in its own `scripts/build.sh`/`check-all.sh` (plggmatic → plggmatic-example → site; site build via published plggpress), a guide/preview container if needed, and README index.
7. Run the new repo's `scripts/check-all.sh` standalone and confirm green (install published deps, build, tsc clean, tests, coverage).

## Quality Gate

**Acceptance criteria:**

- `../plggmatic` has the standard layout (`packages/` with the three moved packages, `scripts/` canonical runners, `README.md`, `CLAUDE.md`, `docs/` with the split ADR + Pragmatic concept/specs).
- Every moved `package.json` depends on `plgg`/`plgg-view`/`plgg-ui`/`plggpress` via published `^version` (no `file:../` pointing outside `../plggmatic`).
- The split-justification ADR exists in `../plggmatic/docs/` with the modular-monolith rationale + dependency decision log + the D13/D1/D16 amendment.
- `../plggmatic` check-all passes standalone (install from npm, build, tsc clean, tests green, coverage ≥ threshold).
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` in moved/new code.
- The plgg monorepo is untouched except the ADR reference (its copy of the cluster still builds — ticket C removes it).

**Verification method:**

- Run the new repo's canonical check command from a clean `../plggmatic` checkout (deps installed from npm).
- `grep -rn "file:\.\./" ../plggmatic/packages/*/package.json` returns nothing pointing outside the repo.
- Prettier printWidth 50 across the new repo.

**Gate:**

- `../plggmatic` check-all green standalone AND no external `file:../` deps AND the ADR present AND the publish prerequisite satisfied AND no escape hatches.

## Considerations

- **Depends on A3**, not just the re-home: the moved `plggmatic` must carry the `Theme` contract + branded default (A3), or it is an empty shell. Do not start until A1–A3 have landed and `plgg`/`plgg-view`/`plgg-ui` are publishable.
- **Publish is a surfaced prerequisite, never auto-performed by the trip/drive** — the developer runs the release flow (or picks a pre-release/tag strategy), then this ticket proceeds.
- `site` depends on `plggpress` (staying); its cross-repo consumption is the trickiest edge — confirm plggpress is published and the SSG build works against the published artifact, not a local path.
- Populate-only: MUST NOT delete the cluster from the plgg monorepo (that is ticket C). Keeping both copies temporarily is intentional to avoid a red monorepo.
- The open `20260708192518` targets engine internals now in `plgg-ui`; its framework half stays in the plgg monorepo (re-pointed at `plgg-ui`), its Demo 1 half follows the showcase here — record in the ADR so it is not lost.
