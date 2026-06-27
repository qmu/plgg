# Queue Review — Constructor (queue-20260626-221353)

Branch: `work-20260626-221353` · Mode: queue-execute (tickets are the spec, no design phase)

## System safety

`detect.sh` → `{"is_provisioning": false, "system_changes_authorized": false}`.
**Project-local alternatives only**: no global npm installs, no system config
changes. Any tooling (transpiler, api-extractor) must come from package-local
devDeps already present or added to a package's `package.json` — never `-g`.

## House rule (reconfirmed)

NO `as` / `any` / `ts-ignore` under any circumstances. Prettier printWidth 50
(each package carries its own `.prettierrc.json` — 12 present). Follow the
`plgg-coding-style` skill: Option not null, Result not throw, exhaustive
`match`, data-last `pipe`/`cast`/`proc`/`flow`, validate at `unknown` boundary.

## Ordering verdict — matches the lead's drive order exactly

| # | Ticket | `depends_on` | OK |
|---|--------|--------------|----|
| 1 | refactor-spec-validation-examples-to-cast-refine | (none) | ✓ |
| 2 | bundler-foundation-poc-against-plgg-core | (none) | ✓ |
| 3 | migrate-library-builds-to-in-house-bundler | [2] | ✓ |
| 4 | replace-example-vite-dev-server-and-app-bundle | [2] | ✓ |
| 5 | purge-vite-and-final-grep-gate | [3, 4] | ✓ |

`depends_on` frontmatter confirms the chain. 1 is independent (pure style
refactor). 2 is the gate for both 3 and 4; 5 is the closing purge. No reorder
needed.

## Buildability verdict: BUILDABLE AS-IS

All five are the spec. Ticket 1 ships a literal patch template. Tickets 2–5 are
the proven "build tool → migrate per-package → purge + grep gate" arc the
just-finished vitest→plgg-test trip already executed, so the sequencing
template is precedented. No rollback-to-design warranted.

**One honest flag (not a blocker):** Ticket 2 deliberately leaves the transpile
mechanism and final package name as implementation decisions, and explicitly
authorizes a build-vs-buy "the bundler can't reproduce plgg's dist" outcome per
`proactive-poc.md`. That is intended latitude, not underspecification — but it
means ticket 2 carries real design risk inside execution. If the PoC gate (diff
`dist/` byte-shape + plgg-test green against in-house dist) fails, that finding
gets surfaced rather than forced, and tickets 3–5 are then blocked by
construction (their deps). Lead should expect ticket 2 to be the long pole.

## Per-ticket: files to touch + policy hard copies to open

### Ticket 1 — spec cast+refine refactor
Touch (4 spec files only):
- `packages/plgg/src/Atomics/BigInt.spec.ts` (`validateUserId`)
- `packages/plgg/src/Atomics/Num.spec.ts` (`validatePrice`)
- `packages/plgg/src/Atomics/SoftStr.spec.ts` (`validateEmail`)
- `packages/plgg/src/Atomics/Bin.spec.ts` (`validateData`)
Read-only refs: `Flowables/cast.ts`, `Functionals/refine.ts`. Do NOT touch
`errThen(e => e.content.message)` reads (deferred concern 41), nor the
irreducible monad-seam `if (isOk/isErr)` sites.
Policies: `implementation/coding-standards.md`,
`implementation/directory-structure.md`, plus `standards:leading-validity`
(ticket cites it; not in the three skill policy dirs — locate via that skill).

### Ticket 2 — bundler foundation + PoC
New package under `packages/` (suggested `plgg-bundle`): `src/domain`,
`src/entrypoints` (CLI bin), `src/vendors` (TS→JS transpiler ACL boundary),
own `.prettierrc.json` + `tsconfig*.json` + `bin`.
Read/PoC against: `packages/plgg/vite.config.ts` (single-entry, es+cjs,
`index.${format}.js`, minify, rollupTypes:false), `packages/plgg/package.json`
(dist contract), `packages/plgg/tsconfig.build.json`, `scripts/build.sh`.
api-extractor confirmed present in `packages/plgg-test/package.json` devDeps
(candidate for rolled-up `.d.ts`).
Policies (HEADLINE = vendor-neutrality): `implementation/vendor-neutrality.md`,
`implementation/directory-structure.md`, `implementation/coding-standards.md`,
`planning/proactive-poc.md`, `planning/it-investment-evaluation.md`.
Must record the 4-point vendor decision log (Reason/Assessment/Monitoring/Exit).
Constraint: do NOT reintroduce a native-binding bundler (rolldown is the
fragility being retired).

### Ticket 3 — migrate library builds (dep: 2)
Per-package, in build.sh order: plgg-kit → plgg-http → plgg-router →
plgg-view → plgg-server → plgg-fetch → plgg-sql, then plgg-foundry + plgg-test.
Shapes to reproduce: single-entry/per-file-dts (http/router/sql); rolled-up dts
(plgg-kit, plgg-foundry); multi-entry + node externals + case-collision renames
(plgg-server ssgEntry, plgg-view styleEntry — the U0 fix, must survive on
case-insensitive FS); predicate external (plgg-fetch `isFrameworkDep`, confirmed
at vite.config.ts:33). DECISION: whether to fold plgg-foundry into `build.sh`
(currently absent). Leave vite devDeps/lockfiles in place (B4 purges).
Policies: `implementation/{vendor-neutrality,command-scripts,directory-structure,coding-standards}.md`.

### Ticket 4 — de-vite `example` (dep: 2)
Touch: `packages/example/vite.config.ts` (delete; es-only single `dist/main.js`
from `src/main.ts` — confirmed), `packages/example/package.json` (scripts
build/serve/serve:ssr + devDeps), `index.html`, `src/main.ts`,
`src/app.spec.ts` (keep green). DECISIONS: app-bundle target on the bundler;
dev-server replacement (minimal in-house static/dev server with
rebuild-on-change vs approved non-vite path); SSR `serve:ssr` keep `tsx` or fold
in. Private package, no dist contract — safest to iterate.
Policies: `implementation/{directory-structure,coding-standards,vendor-neutrality,command-scripts}.md`,
`design/` reach/modeless (showcase UX — keep DX simple).

### Ticket 5 — purge + grep gate (deps: 3, 4)
Touch: `scripts/build.sh`, `scripts/check-all.sh`, `scripts/publish-plgg.sh`
(`vite build && npm publish` → in-house), `.github/workflows/deploy-guide.yml`
(remove the `rm -f package-lock.json` workaround — ONLY after native-binding is
gone), `.github/workflows/run-tests.yml`, every `packages/*/package.json` (drop
vite + vite-plugin-dts devDeps), every `packages/*/package-lock.json`
(regenerate), any remaining `vite.config.ts` (delete — GUIDE EXCEPTED).
Grep gate MUST be scoped: guide uses vite transitively via VitePress
(`packages/guide/.vitepress/config.ts` confirmed) — gate on direct devDeps /
configs / build imports only, not "zero vite anywhere".
Policies: `implementation/{vendor-neutrality,command-scripts,directory-structure}.md`,
`operation/ci-cd.md`. Releases stay CI-owned CalVer — no manual GitHub Release.

## QA gates I own each ticket
`scripts/tsc-plgg.sh` clean → `scripts/test-plgg.sh` green (and per-package
test scripts / `scripts/check-all.sh` for cross-package resolution) → Prettier
printWidth 50. Existing `check(...)` assertions are the regression guard for
ticket 1.
