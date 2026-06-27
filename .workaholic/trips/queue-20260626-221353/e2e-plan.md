# E2E / External Validation Plan — queue-20260626-221353

Planner session note (not a design artifact). Scope of this role: **E2E /
external-interface validation only** — externally observable behavior, produced
artifacts, build/test gates. No unit tests, no compiler-internals review, no
code review. The Constructor owns `tsc`/code; I assert on what the build *emits*
and what consumers can *resolve*.

## Dev environment (confirmed, do NOT run heavy builds yet)

- Node v24.13.1, npm 11.12.1 present.
- Typecheck: `scripts/tsc-plgg.sh` → `cd packages/plgg && npm run tsc` (`tsc --noEmit`).
- Test (plgg only): `scripts/test-plgg.sh` → `cd packages/plgg && npm run test`
  (`tsc --noEmit && plgg-test src`). Per-package equivalents exist
  (`scripts/test-plgg-*.sh`).
- Build (all libs, dep-ordered): `scripts/build.sh` runs `npm run build`
  (= `vite build` today) across plgg → plgg-kit → plgg-http → plgg-router →
  plgg-view → plgg-server → plgg-fetch → plgg-sql. **plgg-foundry is absent**
  from this list today (ticket B2 must decide whether to fold it in).
- Full acceptance gate: `scripts/check-all.sh` = `build.sh` then every
  `test-plgg-*.sh` + `test-example.sh`. This is the cross-package `file:`
  resolution gate — the single most important external signal for B2/B5.
- Publish: `scripts/publish-plgg.sh` → `cd packages/plgg && npm run publish`
  (`vite build && npm publish`). Releases are CI-owned CalVer; `/ship` must not
  publish a GitHub Release manually.

## The dist contract (what B1–B3 must reproduce, observed from live `packages/plgg/dist/`)

Current `vite build` for plgg core emits, exactly:
- `index.es.js` (ESM, minified, ~32 KB), `index.cjs.js` (CJS, minified, ~27 KB).
- `index.d.ts` (rolled-up re-export entry, ~367 B — from `insertTypesEntry`) +
  `index.d.ts.map`.
- A **per-file `.d.ts` tree** mirroring `src/` (directories: `Atomics/`,
  `Flowables/`, `Disjunctives/`, … 11 dirs) — this is the `rollupTypes:false`
  output every consumer with default dts expects.

`packages/plgg/package.json` `exports` is the resolution contract downstream
`file:` consumers depend on:
- `import` → `./dist/index.es.js`, `require` → `./dist/index.cjs.js`,
  `types` → `./dist/index.d.ts` (both conditions).

Five bundler shapes catalogued from the vite configs (B1 must support all five
before B2 can migrate the matching package):
1. **Single-entry, per-file dts**: plgg (PoC), plgg-http, plgg-router, plgg-sql,
   plgg-fetch — `index.${format}.js`, `exports:"named"`, minify.
2. **Rolled-up dts** (`rollupTypes:true`, no minify): plgg-kit, plgg-foundry —
   single `index.d.ts`, no per-file tree.
3. **Multi-entry + node externals + case-collision rename**: plgg-server
   (`index/node/bun/deno/ssgEntry`; externals `node:http`, `node:stream`,
   `node:fs/promises`, `node:path`) — `${entryName}.${format}.js`.
4. **Multi-entry + case-collision rename**: plgg-view (`index/client/styleEntry`).
5. **Predicate external**: plgg-fetch (`isFrameworkDep` → `plgg`, `plgg/*`,
   `plgg-server`, `plgg-server/*` external; the bundle must NOT inline them).

The `styleEntry`/`ssgEntry` output keys exist so `dist/styleEntry.*` /
`dist/ssgEntry.*` do not case-collide with the `dist/Style/` / `dist/Ssg/`
declaration trees on case-insensitive filesystems. The published `./style` /
`./ssg` `exports` subpaths point at the `*Entry.*` files (verified in
plgg-view/package.json). This rename surviving the bundler is a hard
external-contract assertion.

---

## Per-ticket E2E / external validation scenarios

### Ticket 1 — refactor spec `validateX` to `cast`+`refine` (no deps)

Pure style refactor of teaching example code in four `*.spec.ts`; behavior must
be unchanged. External signal = **the existing test suite passes verbatim**.

- **PASS gate**: `scripts/tsc-plgg.sh` clean AND `scripts/test-plgg.sh` green.
  The four touched files — `BigInt.spec.ts`, `Num.spec.ts`, `SoftStr.spec.ts`,
  `Bin.spec.ts` — run inside `plgg-test src`; every existing `check(...)`
  assertion (including the `validateX` happy-path AND the `errThen` error-message
  reads) must still pass with no assertion edits.
- **Externally observable invariant**: test *count* and assertion outcomes are
  identical before/after. No new test added, none removed. (Constructor confirms
  via the runner summary; I assert the suite stays green and the
  `e.content.message` reads were NOT churned.)
- **Coverage**: plgg's >90% statements/branches/functions/lines threshold must
  still hold (per the coverage-threshold standard) — confirm via
  `scripts/coverage-plgg-test.sh` if coverage shifts are suspected; a pure
  refactor should not drop it.
- **Negative check**: no escape hatch leaked in — `grep -rn 'as any\|@ts-ignore\|\bas \b'`
  over the four files returns nothing new (the no-escape-hatch rule is the
  point of this idiom fix).

### Ticket 2 — bundler foundation PoC against plgg core (no deps)

The PoC gate is itself a diff-against-vite acceptance test. External signal =
**in-house dist reproduces vite dist + plgg suite passes against it**.

- **Artifact-shape PASS gate** (the ticket's own gate): build plgg with the new
  bundler into a fresh `dist/`, then assert against a captured baseline of the
  current vite `dist/`:
  - Exact file names present: `index.es.js`, `index.cjs.js`, `index.d.ts`,
    and the full per-file `.d.ts` tree mirroring `src/` (same directory set).
  - `index.es.js` is valid ESM (`node --input-type=module -e "import * as p from
    './dist/index.es.js'"` resolves; named exports present, `exports:"named"`
    semantics).
  - `index.cjs.js` is valid CJS (`node -e "require('./dist/index.cjs.js')"`
    resolves with named exports, no default-only).
  - Both JS outputs minified (no multi-line pretty source).
  - **Method**: capture `git stash`/copy of the vite `dist/` first, build
    in-house into a clean dir, `diff -rq` the two trees. Byte-identical JS is NOT
    required (different transpiler); the **contract** is: same filenames, same
    module format per file, same named-export surface, present `.d.ts` tree.
- **Behavioral PASS gate**: run plgg's plgg-test suite *against the
  in-house-built dist* (`scripts/test-plgg.sh` exercises `src`, so additionally
  resolve the built dist from a sibling — at minimum `node` import smoke of the
  built `index.es.js`/`index.cjs.js` succeeds with the public API surface
  intact).
- **Vendor-neutrality external evidence**: the four-point decision log
  (Reason/Assessment/Monitoring/Exit) exists in the package README or a
  `.workaholic/` note; the transpiler chosen is **not** a native-binding bundler
  (no rolldown/esbuild-native reintroduction — `grep` the new package's deps).
  CI-reproducible (headless) is the operation-policy bar.
- **Build-vs-buy escape**: if the bundler cannot reproduce plgg's dist within
  reasonable effort, that negative finding is a *valid* PoC outcome — I surface
  it, do not force cutover.

### Ticket 3 — migrate every library `vite build` to in-house bundler (← T2)

The payload migration. External signal = **every package's dist matches its
prior vite output AND cross-package `file:` resolution stays intact**.

- **Per-package dist-diff gate** (do this after each package, in build order):
  capture the vite `dist/` baseline, rebuild with the bundler, `diff -rq`.
  Filenames + module format + `.d.ts` mode must match. Specific must-survive
  assertions:
  - plgg-kit, plgg-foundry: a **single rolled-up `index.d.ts`** (no per-file
    tree), **not minified**.
  - plgg-server: five entries `index/node/bun/deno/ssgEntry.{es,cjs}.js`;
    `node:http`/`node:stream`/`node:fs/promises`/`node:path` stay **external**
    (grep the built JS — they must appear as imports, not inlined).
  - plgg-view: three entries `index/client/styleEntry.{es,cjs}.js`;
    `dist/styleEntry.*` present and NOT case-colliding with `dist/Style/`.
  - plgg-fetch: `plgg`/`plgg-server` (and `/*`) stay **external** in the built
    JS (not inlined) — the predicate-external proof.
  - plgg-http, plgg-router, plgg-sql: single-entry `index.{es,cjs}.js`, no
    externals inlined needed, minified.
- **Subpath-resolution gate**: for plgg-view/plgg-server, assert the published
  `exports` subpaths still resolve to real files —
  `require.resolve('plgg-view/style')` → `dist/styleEntry.*`,
  `…/ssg` → `dist/ssgEntry.*`. A renamed/missing output here silently breaks
  downstream on case-insensitive FS.
- **Cross-package PASS gate**: `scripts/check-all.sh` green end to end — this is
  the authoritative external signal that every `file:` consumer resolves the
  in-house-built upstream dist and every suite passes. Run it once after all
  packages migrate, and rely on per-package `test-plgg-*.sh` between steps.
- **Command-invariance** (operation/command-scripts policy): `npm run build`
  remains the per-package entry and `scripts/build.sh` keeps orchestrating — no
  bespoke per-package shell script appears. Assert `build.sh` contents still call
  `npm run build` only.

### Ticket 4 — replace `example` vite dev server, SSR serve, app bundle (← T2)

`example` is private (no dist contract for others). External signal = **the page
loads/renders, SSR serves, the app bundle is produced, and the suite stays
green** — observable behavior, not artifact-byte parity.

- **App-bundle gate**: `cd packages/example && npm run build` produces
  `dist/main.js` (single ESM) from `src/main.ts`, loadable by `index.html`
  (the `<script>` resolves; no missing-module error).
- **Dev-server gate**: `npm run serve` starts the chosen non-vite dev server,
  serves `index.html` + the bundled client on a local port; a `curl`/headless
  fetch of `/` returns the HTML and the client script 200s. Rebuild-on-change is
  a nice-to-have, not a gate.
- **SSR gate**: `npm run serve:ssr` boots the SSR path (tsx-or-folded-in) and a
  fetch returns server-rendered HTML that then boots client takeover (the
  pageResponse contract from plgg-server).
- **Suite gate**: `scripts/test-example.sh` (runs `app.spec.ts`) stays green
  after the swap.
- **Non-reintroduction**: the chosen dev server does NOT pull vite back in
  (directly or via the same native binding) — `grep` example's deps for `vite`
  after the rewrite; exit strategy documented.

### Ticket 5 — purge direct vite + final grep gate (← T3, T4)

The closing acceptance gate, mirroring the proven vitest-purge recipe. External
signal = **the scoped grep gate proves zero direct vite, lockfiles flushed, and
the full build + CI go green**.

- **Grep-gate PASS** (scoped — must NOT false-positive on the guide's transitive
  VitePress vite): the canonical `scripts/` runner asserts zero, across migrated
  packages only:
  - `vite` / `vite-plugin-dts` in any `packages/*/package.json` devDeps
    (excluding `packages/guide`),
  - any `packages/*/vite.config.ts` (excluding the guide's VitePress config),
  - any `from "vite"` / `import … "vite"` build import (excluding guide).
  The gate intentionally allows vite *transitively* under `packages/guide` —
  assert the gate's scoping excludes that path so it does not regress to a naive
  "zero vite anywhere" check.
- **Lockfile-flush evidence**: regenerated `packages/*/package-lock.json` no
  longer contain `rolldown`/vite native optional-binding entries (the
  darwin-only rot that broke CI). `grep` the lockfiles for `rolldown` → none.
- **CI / workflow gate**: `.github/workflows/deploy-guide.yml` and
  `run-tests.yml` build with the in-house bundler; the `rm -f package-lock.json`
  workaround is **removed from deploy-guide** — and removal is only validated
  after step-1/3 confirm no native-binding bundler remains. Closing proof: the
  Deploy Guide workflow goes **green on a real push** (per the ticket's step 5);
  `plgg-guide.qmu.dev → :5181` still serves (cloudflared tunnel reference).
- **Full acceptance**: `scripts/check-all.sh` green (dep-ordered build + all
  suites + example) as the final repo-wide gate.
- **Publish path**: `scripts/publish-plgg.sh` / `npm run publish` repointed to
  the in-house bundler (no `vite build`); releases stay CI-owned CalVer.

---

## Validation sequencing & dependencies

- T1 is independent and cheap — validate it first/standalone (tsc + test-plgg).
- T2 is the gating PoC; its dist-diff + behavioral gate must pass before any T3
  per-package migration is trustworthy. If T2 surfaces a build-vs-buy negative,
  T3–T5 are blocked and that finding is escalated, not worked around.
- T3 validation is incremental per package (dist-diff + per-package suite),
  capped by one full `check-all.sh`.
- T4 validation is behavioral (page loads, SSR serves, suite green) — no
  artifact-parity gate since example is private.
- T5 is the closing gate: scoped grep + lockfile-flush + full `check-all.sh` +
  real-push Deploy Guide green.

## Baseline-capture note (for the dist-diff gates)

Before T2/T3 start mutating builds, capture the current vite `dist/` for each
package as the diff baseline (e.g. copy `packages/*/dist` to a scratch dir, or
rely on a clean `git` checkout of the pre-migration commit). Diffing against a
captured baseline is the only way the "reproduces vite output" gate is concrete.
Byte-identical JS is explicitly NOT the bar (different transpiler) — same
filenames, module format per file, named-export surface, and `.d.ts` mode are.
