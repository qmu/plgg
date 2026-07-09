---
created_at: 2026-07-09T10:39:16+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Resume: settle plggmatic publish boundary before extraction B/C

## Overview

**Carry Origin:** `.workaholic/tickets/todo/a-qmu-jp/20260708195656-init-and-populate-plggmatic-repo.md` — carried on 2026-07-09 because the session was ending; this resumption ticket supersedes ticket B's remaining work and should be driven before ticket C.

## Carry Checkpoint (2026-07-09, second carry)

**The docs-builder boundary decision (this ticket's Step 2) is RESOLVED and IMPLEMENTED.** Rather than pin `site` to the old published `plggpress@0.0.1` or defer `site`, the developer chose **Option B: split local `plggpress` into a slim SSG `plggpress` + a new dynamic `plgg-cms`** (its own ticket `20260709110456-split-plggpress-ssg-and-plgg-cms`, now archived under `.workaholic/tickets/archive/work-20260706-120449/`).

**State as of commit `f3bb180a` (branch `work-20260706-120449`, monorepo green, `scripts/check-all.sh` passes fresh):**
- Slim `packages/plggpress` now depends on NO CMS packages (dropped `plgg-content`/`plgg-sql`/`plgg-auth`/`plgg-mcp`/`plgg-kit`); deps are only `plgg`/`plgg-http`/`plgg-server`/`plgg-view`/`plgg-md`/`plgg-highlight`/`plgg-cli`/`plgg-ui`. It exposes its framework as a public `plggpress/framework` subpath (built entry `frameworkEntry`, exports has a top-level `default` condition so plgg-bundle's require()-based surface reader can consume it) and re-exports `pressRouter`/`buildSpecOf` on its barrel.
- New `packages/plgg-cms` holds the dynamic surface (`Admin`/`api`/`auth`/`editing`/`media`/`ops`/`plugin`/`server`/`stakeholder`/`mcp`/`agent` + the `serve` CLI); it depends on `plggpress` one-way (zero reverse edges) and consumes it only via the public barrel + `plggpress/framework`.
- The extraction's `site` package can now consume the SSG surface it needs (`defineSite`/`SidebarItemInput`/`pressDevEntry`) from published slim `plggpress` — WITHOUT forcing publication of `plgg-content`/`plgg-mcp`/`plgg-domain`. The boundary concern that blocked ticket B is settled.

**Publish gate — the one thing standing between here and driving the extraction (developer-run, NEVER auto-performed):**
- `npm view` on 2026-07-09: `plgg-ui@0.1.0` published ✓; `plggpress@0.0.1` published but **STALE** — it is the OLD pre-split monolith (has CMS deps, no `./framework` subpath). `plgg-cms` unpublished (404).
- **Publishing the slim `plggpress` needs a VERSION BUMP** — `0.0.1` is taken and semantically different. Bump `packages/plggpress/package.json` to `0.0.2` (via `scripts/publish-release.sh` CalVer + `scripts/publish-npm.sh`, past the 1.0.0 ghost, `--tag latest`) so `../plggmatic`'s `site` can pin `plggpress@^0.0.2`.
- `plgg-cms` does NOT need publishing for the extraction (nothing in `../plggmatic` consumes it — `site` consumes `plggpress`, not `plgg-cms`). Only publish `plgg-cms` if/when an external consumer needs it.

**Next steps for a fresh `/drive` (in order):**
1. Developer publishes slim `plggpress@0.0.2` (+ confirm `plgg-ui@0.1.0` is consumable). Verify: `npm view plggpress@0.0.2 dependencies --json` shows NO `plgg-content`/`plgg-sql`/`plgg-auth`/`plgg-mcp`, and lists the `./framework` export.
2. Resume ticket B's populate-only extraction (Step 5 below): scaffold `/home/ec2-user/projects/plggmatic`, move the `plggmatic`/`plggmatic-example`/`site` cluster, rewrite cross-repo deps to published `^version` (`plgg@^0.0.27`, `plgg-view@^0.0.1`, `plgg-ui@^0.1.0`, `plggpress@^0.0.2`), write the split ADR, run `../plggmatic/scripts/check-all.sh` green standalone.
3. Then ticket C (`20260708195657`): remove the cluster from the monorepo (KEEP `plgg-ui` AND `plgg-cms`).

Steps 3–6 in "Implementation Steps" below are now largely satisfied by the split (patches reconciled, `plgg-ui` published); the OPEN work is the publish bump + the populate/remove.

## Carry Checkpoint (2026-07-09, third carry) — HARD PREREQUISITE BLOCKER FOUND

A `/drive` executed the populate-only extraction and hit a **hard,
previously-unforeseen prerequisite blocker at the build/test gate**. The
populate itself is done and correct; it cannot reach a green standalone
`check-all` until the plgg dev tooling is made registry-consumable.

**What was completed and is durable (uncommitted, on disk):**
- `../plggmatic` scaffolded: standard layout, `CLAUDE.md`, `README.md`,
  `.gitignore`, `docs/` (split ADR `docs/0001-plggmatic-repo-split.md` +
  carried Pragmatic specs under `docs/specs/`), and the canonical
  `scripts/*.sh` runner set (`npm-install`, `build`, `tsc-*`, `test-*`,
  `check-all`, `format`, `publish-npm`).
- The `plggmatic` / `plggmatic-example` / `site` cluster copied in (no
  `node_modules`/`dist`/lockfiles); external `file:` deps rewritten to
  published ranges (`plgg@^0.0.27`, `plgg-view@^0.0.1`, `plgg-ui@^0.1.0`,
  `plggpress@^0.0.2`); intra-repo `plggmatic` left as `file:../plggmatic`. Two
  monorepo-only cross-repo leaks in `site` repointed to be self-contained
  (`devEntry.ts` now imports `pressDevEntry` from the `plggpress` barrel;
  `bundle.config.ts` dev section dropped the `../../../plgg/...` source alias).
- Monorepo: `packages/plggpress` bumped to `0.0.2`; superseded ticket B
  archived.
- **Verified GREEN standalone:** the published-dependency contract resolves
  (`npm install` of `plggmatic`'s deps succeeds — needs
  `npm_config_min_release_age=0` only because the freshly-bumped plgg versions
  are <7 days old vs the local `min-release-age=7`), and `tsc --noEmit` passes
  clean against the published `.d.ts`.

**THE BLOCKER — plgg build/test tooling is not consumable from the npm registry
on Node 24:**
- `plgg-bundle` (the `build`) ships `files: ["src","bin"]` — NO `dist` — and its
  launcher `await import()`s `src/entrypoints/cli.ts`; `plgg-test` (the `test`
  runner) ships only `.d.ts` in `dist` and spawns
  `node --experimental-strip-types src/Cli/cli.ts` (+ `src/Resolve/hook.ts`).
  Both run from **TypeScript source** and depend on Node 24 type-stripping.
- Node 24 **refuses to strip types for `.ts` files under `node_modules/`**
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). In the plgg monorepo the
  tools work only because their `file:` links resolve to a realpath OUTSIDE
  `node_modules`; installed from the registry they are genuinely inside
  `node_modules`, so both `build` and the unit-test run fail.
- The publish smoke test did not catch this: it matches only
  `ERR_MODULE_NOT_FOUND`/"Cannot find", so a type-stripping failure reads as
  "bin ok".

**Required prerequisite (new work, in the plgg monorepo — its own ticket):**
make `plgg-bundle` and `plgg-test` registry-consumable — ship a runnable
compiled `dist` and have each launcher run from `dist` when it detects it is
executing under `node_modules` (fall back to `src` for the monorepo `file:`
case). Until that lands, NO standalone plgg consumer (not just plggmatic) can
`build`/`test` from published packages.

**Publish decision deferred.** Publishing `plggpress@0.0.2` was NOT performed:
it is a one-way registry action that would not produce a green standalone build
while the tooling blocker stands (and `plggmatic`/`plggmatic-example`, which
don't even use `plggpress`, are equally blocked). Bump is staged locally; publish
after the tooling prerequisite lands. Ticket C stays blocked (needs B green
standalone first).

## Carry Checkpoint (2026-07-09, fourth) — BLOCKER 1 FIXED; BLOCKER 2 (published drift) FOUND

**Blocker 1 (tooling launcher consumability) — FIXED and PROVEN.** Implemented
under ticket `20260709165827`: a `bin/relocate.mjs` preamble on the
run-from-source launchers (`plgg-bundle`, `plgg-test`, `plggpress`, `plgg-cms`)
that, when installed under `node_modules`, copies the package OUT and re-execs
(no-op on a monorepo `file:` link). Verified in `../plggmatic`: `plggmatic`
build + test + coverage all green; and a staged-tarball scratch install proved
`plggpress`'s bin relocates and runs (no more type-stripping error). `plgg-bundle`
bumped 0.0.2→0.0.3, `plgg-test` 0.0.3→0.0.4; publish smoke hardened to fail on
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.

**Blocker 2 (published-package drift) — the new gate.** The `plggpress` scratch
smoke then surfaced `SyntaxError: 'plgg-md' does not provide an export named
'githubSlugify'`: local `plgg-md@0.0.1` has it, published `plgg-md@0.0.1` does
NOT. The monorepo skips version bumps (single-consumer freedom), so **published
artifacts have drifted from local source at the SAME version number**. An
export-surface diff of the extraction's runtime closure (published vs local dist
`.d.ts`) found three drifted packages:
- `plgg-view@0.0.1` — missing `Cmd`/`Sub`/`runCmd`/`subBatch`/… (the dynamic
  Source/Cmd/Sub surface). Consumed by plggmatic-example + site + plggpress.
- `plgg-server@0.0.3` — missing `requireCsrf`/`requireRole`/`csrfCookie`/… (the
  CSRF/role guards). Consumed by plggpress.
- `plgg-md@0.0.1` — missing `HtmlBlock`/`githubSlugify`/YAML helpers. Consumed by
  plggpress.
(`plgg`, `plgg-ui`, `plgg-http`, `plgg-highlight`, `plgg-cli`, `plgg-parser` are
clean.)

**Consequence — a coordinated family release is the real prerequisite.** To give
the extraction a consistent published contract, the three drifted packages must
be republished at bumped versions — AND, because caret on `0.0.x` is exact,
every closure package that depends on a bumped one must also be republished to
re-pin it (else npm dual-installs the old + new copy). Bumping `plgg-view`
therefore ripples up through `plgg-md`/`plgg-server`/`plgg-ui`/`plggpress`. The
practical fix is a single dependency-ordered republish of the affected closure
via `scripts/publish-npm.sh`, with `../plggmatic` pins updated to match. This is
a release-hygiene operation distinct from the tooling fix and larger than the
originally-scoped `plggpress@0.0.2` bump — surfaced for a developer decision, not
auto-performed.

Ticket B was started but not completed. The initial blocker was that `plgg-ui@0.1.0` was not published while `plgg@0.0.27`, `plgg-view@0.0.1`, and `plggpress@0.0.1` were published. The session patched `scripts/publish-npm.sh` to support `ONLY=plgg-ui`, added `"files": ["dist"]` to `packages/plgg-ui/package.json`, and fixed an unrelated `plgg-content` gate failure caused by the new `HtmlBlock` variant in `plgg-md`. Work stopped at a product-boundary concern: the standalone `../plggmatic` repo should consume published packages, but should not force publication of `plgg-content`, `plgg-mcp`, or `plgg-domain` just because the current local `plggpress` has grown CMS/server features.

## Policies

- `workaholic:design` / `policies/modular-monolith-first.md` — governing policy: the split is the exception; keep the boundary justified and document the plggmatic/plggpress package split.
- `workaholic:design` / `policies/sacrificial-architecture.md` — keep the rebuildable identity/showcase separate from durable core packages.
- `workaholic:design` / `policies/vendor-neutrality.md` — the cross-repo edge is a published contract; do not publish unrelated packages just to satisfy local monorepo coupling.
- `workaholic:implementation` / `policies/directory-structure.md` — `../plggmatic` should keep the standard top-level layout.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- `workaholic:implementation` / `policies/type-driven-design.md` — the moved `Theme` contract and palette override API stay typed across the boundary.
- `workaholic:implementation` / `policies/test.md` — moved specs stay green standalone; coverage remains above the enforced threshold.
- `workaholic:operation` / `policies/ci-cd.md` — local script-driven publish and verification remain the release path.
- `workaholic:implementation` / `policies/command-scripts.md` — canonical scripts should remain the single development and publish interface.

## Implementation Steps

1. Verify the current registry state with `npm view plgg-ui@0.1.0 version`, `npm view plggpress@0.0.1 dependencies --json`, and the focused preflight `PREFLIGHT=1 ONLY=plgg-ui ./scripts/publish-npm.sh`.
2. Decide and implement the narrow docs-builder boundary before populating `../plggmatic`: either pin the extracted `site` to the already-published `plggpress@0.0.1` for this extraction, or split a small published SSG package from local `plggpress` so the extracted docs site does not need `plgg-content`, `plgg-mcp`, or `plgg-domain`.
3. Reconcile the in-flight publish patches already present in the working tree: keep `ONLY=...` support in `scripts/publish-npm.sh`, keep `"files": ["dist"]` in `packages/plgg-ui/package.json`, and keep the `HtmlBlock` handling in `packages/plgg-content/src/Ingest/usecase/chunkBlocks.ts` if the full gate still needs it.
4. If `plgg-ui@0.1.0` is still unpublished, publish only `plgg-ui` through the focused path after npm login: `ONLY=plgg-ui ./scripts/publish-npm.sh`. Do not publish `plgg-content`, `plgg-mcp`, or `plgg-domain` unless the boundary decision explicitly requires them.
5. Resume ticket B's populate-only extraction after the published-dependency boundary is settled: scaffold `/home/ec2-user/projects/plggmatic`, copy the `plggmatic`, `plggmatic-example`, and `site` cluster without `node_modules`, rewrite cross-repo deps to published `^version` ranges, write the split ADR, and run the standalone `../plggmatic` checks.
6. Only after the standalone `../plggmatic` check is green, resume ticket C to remove `packages/plggmatic`, `packages/plggmatic-example`, and `packages/site` from this monorepo while keeping `packages/plgg-ui`.

## Quality Gate

**Acceptance criteria:**

- The plggmatic extraction uses only published npm package ranges across the repo boundary.
- The extracted docs-site build does not require publishing unrelated CMS/server packages (`plgg-content`, `plgg-mcp`, `plgg-domain`) unless a deliberate SSG/package split decision records why.
- `../plggmatic` has the standard layout (`packages/`, `scripts/`, `README.md`, `CLAUDE.md`, `docs/` with the split ADR + Pragmatic concept/specs).
- Every moved `package.json` has no external `file:../` dependency pointing back into `/home/ec2-user/projects/plgg`.
- The split ADR records the modular-monolith rationale, the dependency decision log, and the D13/D1/D16 amendment.
- `../plggmatic` check-all passes standalone.
- The plgg monorepo remains green until ticket C removes the cluster.

**Verification method:**

- `PREFLIGHT=1 ONLY=plgg-ui ./scripts/publish-npm.sh` reports only `plgg-ui@0.1.0` when `plgg-ui` is the only needed unpublished package.
- `npm view plgg-ui@0.1.0 version` resolves before `../plggmatic` installs.
- `grep -rn "file:\\.\\./" ../plggmatic/packages/*/package.json` returns nothing pointing outside `../plggmatic`.
- `../plggmatic/scripts/check-all.sh` passes.
- This repo's relevant focused gates pass before committing the carry-forward patches; at minimum `./scripts/test-plgg-content.sh` for the `HtmlBlock` fix and the publish preflight for `scripts/publish-npm.sh`.

**Gate:**

- Published-dependency boundary settled and documented, `plgg-ui` published if needed, `../plggmatic` green standalone, and no forced publication of unrelated packages.

## Findings

- `npm view` confirmed `plgg@0.0.27`, `plgg-view@0.0.1`, and `plggpress@0.0.1` were published; `plgg-ui@0.1.0` initially returned `404 Not Found`.
- `npm whoami` returned `E401 Unauthorized` during the investigation, so unauthenticated publish attempts can fail with misleading `404 Not Found - PUT https://registry.npmjs.org/plgg-ui`.
- `scripts/publish-npm.sh` originally scanned the whole monorepo and would publish every public package whose local version exceeded the registry version; the session patched `ONLY=plgg-ui` so focused publishing can avoid unrelated packages.
- A full publish gate hit `plgg-content` because local `plgg-md` added `HtmlBlock`; `chunkBlocks.ts` was missing that match branch. The session patched it and `./scripts/test-plgg-content.sh` passed with 126 tests.
- `npm view plggpress@0.0.1 dependencies --json` shows the published plggpress is small (`plgg`, `plggmatic`), while local `plggpress` has grown imports of `plgg-content`, `plgg-mcp`, and other CMS/server features.

## Decisions

- Do not publish `plgg-content`, `plgg-mcp`, or `plgg-domain` merely to unblock the plggmatic extraction; that would couple the design-system/docs split to unrelated CMS/server libraries.
- Treat the correct long-term boundary as a small plggpress SSG/docs-builder surface plus a separate CMS/server surface, or pin this extraction to the already-published `plggpress@0.0.1` until that split is implemented.
- Keep publish safety in the repo script path rather than raw `npm publish`, because the script stages files and rewrites `file:` dependencies to published `^version` ranges.

## Considerations

- Uncommitted working-tree changes exist in `scripts/publish-npm.sh`, `packages/plgg-ui/package.json`, `packages/plgg-content/src/Ingest/usecase/chunkBlocks.ts`, and `packages/plgg-content/src/Ingest/usecase/chunkBlocks.spec.ts`; do not discard them.
- The original ticket B and ticket C are still queued. This resumption ticket supersedes B's remaining work; after this ticket lands, the developer can remove or archive the superseded B ticket through the normal workflow.
- The target repo `/home/ec2-user/projects/plggmatic` was observed as initialized but empty except for `.git`.
