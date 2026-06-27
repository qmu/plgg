# Codebase Discovery Map — queue-20260626-221353

Architect session note. Five queued tickets: (1) refactor spec `validateX`
examples to `cast`+`refine`; (2) build in-house bundler + PoC on plgg core;
(3) migrate every library `vite build`; (4) de-vite `example`; (5) purge vite +
grep gate. Tickets 2→{3,4}→5; ticket 1 is independent.

---

## Ticket 1 — `validateX` examples → `cast`+`refine`

Four colocated spec files, each with one teaching `validateX` written in the
named anti-pattern (`asX` → `isErr` early-exit → `.content` read → `if/err`):

| File | Fn | Lines | Steps to thread |
|---|---|---|---|
| `packages/plgg/src/Atomics/BigInt.spec.ts` | `validateUserId` | 135–195 | `asBigInt` + 2 refine (`>=1n`, `<=9999999999999999n`) |
| `packages/plgg/src/Atomics/Num.spec.ts` | `validatePrice` | 92–146 | `asNum` + 2 refine (`>=0` "Price cannot be negative", `<=10000` "Price too high") |
| `packages/plgg/src/Atomics/SoftStr.spec.ts` | `validateEmail` | 89–128 | `asSoftStr` + 1 refine (`includes("@") && includes(".")`, "Invalid email format") |
| `packages/plgg/src/Atomics/Bin.spec.ts` | `validateBinaryData` | 156–226 | `asBin` + 2 refine (`length>0` "Binary data cannot be empty", `length<=1024` "Binary data too large (max 1KB)") |

Note: ticket calls it `validateData`; the actual symbol is `validateBinaryData`.

Target shape (per `reference.md` "Sync validation pipeline" row →
`cast(v, asX, refine(…))`):
```ts
const validateUserId = (input: unknown) =>
  cast(input, asBigInt,
    refine((id: bigint) => id >= 1n, "User ID must be positive"),
    refine((id: bigint) => id <= 9999999999999999n, "User ID too large"));
```

Reviewable invariants:
- `refine` (`Functionals/refine.ts`): `(predicate, errMessage?) => (a) => Result`.
  Predicate param needs an explicit annotation because `cast` infers `unknown`
  mid-pipe — an annotation is NOT a cast and is the prescribed narrowing.
  Ticket patch writes `(id: BigInt)`; `asBigInt` yields native `bigint` (the
  alias `type BigInt = bigint`), so either `bigint` or the `BigInt` alias works
  if it resolves in scope — confirm whichever the implementer uses type-checks.
- `cast` (`Flowables/cast.ts`): variadic value-first, short-circuits on first
  `Err`. On failure it wraps a NEW `invalidError` whose `message` is "Cast
  failed at N of M step(s)…" and nests the original errors under `.sibling`.
  **RISK / must-verify:** the existing `errThen((e) => toBe(<msg>)(e.content.message))`
  assertions read the message of the TOP-level error. With hand-rolled code that
  top error IS the refine/`asX` error, so `.message` is "User ID must be
  positive" etc. With `cast`, the top error may instead be the "Cast failed at…"
  wrapper and the business message demoted into `.sibling`. If so, the existing
  assertions would FAIL unless `cast` returns the inner error directly for a
  single failing step. Reviewers must check the green test output proves the
  message assertions still match verbatim — this is the single highest-risk point
  of ticket 1. (Ticket claims "every existing assertion unchanged"; verify, don't
  assume.) The `asX`-failure assertions (e.g. "Value is not a valid BigInt") are
  the first step failing — same concern applies.
- Imports: drop now-unused `isErr` (and possibly `err`/`ok`/`invalidError` if no
  longer referenced elsewhere in each file); add `cast`/`refine`. `tsconfig`
  has `noUnusedLocals: true` so `scripts/tsc-plgg.sh` is the arbiter — a stale
  import is a hard error, not a warning. Bin.spec also imports `toEqual`,
  `toBeInstanceOf`, `toBeGreaterThan` (still used elsewhere — keep).
- Out of scope (carry-over `41-existing-specs-still-read-error-content`): do NOT
  bulk-migrate the `e.content.message` reads to `plggErrorMessage`. Leave the
  ~40 assertion sites' read style alone.
- Pure refactor: the existing `check(...)` assertions ARE the regression guard.

---

## Ticket 2 — in-house bundler foundation + PoC on plgg core

### Current vite/dts contract for plgg core (the PoC reproduction target)
- `packages/plgg/vite.config.ts`: lib `entry: src/index.ts`, name `plgg`,
  `fileName: (format) => index.${format}.js`, formats `["es","cjs"]`,
  `minify: true`, `external: []`, `output.exports: "named"`.
- dts plugin: `insertTypesEntry: true`, `rollupTypes: false` (per-file tree),
  no `tsconfigPath` (uses base `tsconfig.json`).
- `packages/plgg/package.json` dist contract consumers resolve:
  `main: dist/index.cjs.js`, `module: dist/index.es.js`,
  `types: dist/index.d.ts`, dual `exports` import/require → es/cjs +
  `./dist/index.d.ts`. `build: "vite build"`, `publish: "vite build && npm publish"`.
  Published to npm at v0.0.27 — the ONLY published-with-version-bump package.

### STRUCTURAL DISCREPANCY (ticket vs repo) — flag to Constructor
- Ticket 2 Key Files cites `packages/plgg/tsconfig.build.json` as the source of
  `declaration:true, rootDir:src, outDir:dist` to feed `tsc`. **That file does
  NOT exist for plgg core.** plgg core has only `tsconfig.json`, which already
  carries `declaration:true, declarationMap:true, sourceMap:true, rootDir:src,
  outDir:dist, noEmit` is NOT set (so emit is on). Six OTHER packages have a
  `tsconfig.build.json` (fetch/http/router/server/sql/view) used via
  `dts({tsconfigPath})`; kit/foundry/test/plgg do NOT (they rely on base
  tsconfig). So the bundler's per-file-dts step must handle BOTH: packages with
  a dedicated `tsconfig.build.json` and packages without (fall back to
  `tsconfig.json`). The PoC on plgg core specifically exercises the no-build-
  tsconfig path. Verify the implementer either reads `tsconfig.build.json` when
  present or correctly drives `tsc` from `tsconfig.json` for plgg.
- `tsconfig.build.json` (fetch sample) sets `noEmit:false, declaration:true,
  declarationMap:true, sourceMap:true, rootDir:src, outDir:dist`, includes
  `src/**/*` — it exists to narrow away `example.ts` outside rootDir and re-
  enable emit. plgg's base tsconfig has no `noEmit`, so `tsc -p tsconfig.json`
  already emits .d.ts — but ALSO emits .js + .js.map into dist, which vite's dts
  plugin does not. The bundler's dts step must emit declarations only (or clean
  up the stray .js), or it will pollute/overwrite the bundler's own JS output.
  **This is a real reproduction trap; reviewers must check dist contains exactly
  the vite-equivalent file set, no `tsc`-emitted .js leakage.**

### Two dts modes (both mandatory)
- Per-file tree (`rollupTypes:false`): plgg, plgg-http, plgg-router, plgg-sql,
  plgg-view, plgg-server, plgg-fetch, plgg-test. Mirrors `src/` into `dist/`.
- Rolled-up single `index.d.ts` (`rollupTypes:true`): plgg-kit, plgg-foundry.
  Candidate tool: `@microsoft/api-extractor` (already a plgg-test devDep
  v7.58.9). Note kit/foundry also have `minify` OFF (no `minify:true` in their
  configs) — the bundler config must carry a per-package minify flag.

### Vendor-neutrality constraints (headline policy)
- "As a rule implement it ourselves" + anti-corruption layer: the TS→JS transpile
  must sit behind `src/vendors/`. Domain names in domain terms, vendor types
  confined to the boundary, thin translate-and-delegate wrapper, unidirectional
  dependence ours→vendor.
- **Do NOT reintroduce a native-binding bundler.** rolldown (vite 8's bundler)
  is the exact fragility being retired — its darwin-only optional binding broke
  Deploy Guide CI (see deploy-guide.yml comment + the `rm -f package-lock.json`
  workaround). The transpiler choice must be headless-reproducible in CI on
  linux-x64. Prefer a pure-JS / WASM transpiler with a documented exit strategy.
- Mandatory four-point dependency-decision log (Reason / Assessment /
  Monitoring / Exit) for whatever transpiler is chosen — in package README or a
  `.workaholic/` note. Reviewers: confirm it exists and names a real alternative
  + impact scope + effort order.
- proactive-poc: "build small with intent to discard," validate against the real
  plgg before commitment. PoC gate = bundler-built `dist/` diffs clean against
  vite output (JS shape, `exports` resolution, per-file `.d.ts` tree) AND plgg's
  plgg-test suite passes against the in-house-built dist. **Build-vs-buy escape
  hatch is explicitly sanctioned**: if the bundler can't reproduce plgg's dist
  in reasonable effort, surfacing that is a valid outcome — don't force cutover.

### directory-structure for the new package
- One package under `packages/` with a pronounceable `plgg-*` name (suggested
  `plgg-bundle`). Internal split: `src/domain` (pure bundling/config logic),
  `src/entrypoints` (CLI bin), `src/vendors` (transpiler boundary). Own
  `.prettierrc.json` (printWidth 50), `tsconfig*.json`, a `bin` entry. Config
  model parsed/validated at the `unknown` boundary (Result, no `as`/`any`).
- `scripts/build.sh` (REPO_ROOT, dependency-ordered) must gain the bundler's own
  bootstrap build BEFORE it can build others. Today its order:
  plgg → plgg-kit → plgg-http → plgg-router → plgg-view → plgg-server →
  plgg-fetch → plgg-sql. (plgg-foundry and plgg-test are NOT in build.sh today;
  deploy-guide.yml's loop DOES include them — order divergence to reconcile.)

---

## Ticket 3 — migrate every library build (depends on T2)

Catalogue of each package's vite config shape the bundler config must reproduce:

| Package | entry(ies) | externals | minify | dts mode | tsconfigPath |
|---|---|---|---|---|---|
| plgg-kit | single `index` | `[]` | NO | rolled-up | (base) |
| plgg-foundry | single `index` | `[]` | NO | rolled-up | (base) |
| plgg-http | obj `{index}` | `[]` | yes | per-file | tsconfig.build.json |
| plgg-router | obj `{index}` | `[]` | yes | per-file | tsconfig.build.json |
| plgg-sql | single `index` | `[]` | yes | per-file | tsconfig.build.json |
| plgg-view | `{index,client,styleEntry}` | `[]` | yes | per-file | tsconfig.build.json |
| plgg-server | `{index,node,bun,deno,ssgEntry}` | `["node:http","node:stream","node:fs/promises","node:path"]` | yes | per-file | tsconfig.build.json |
| plgg-fetch | single `index` | predicate `isFrameworkDep` | yes | per-file | tsconfig.build.json |
| plgg-test | single `index` | `["plgg", /^node:/]` | yes | per-file | (base) |

Three external forms the bundler must support: string[] (server, test),
`/^node:/` regex (test), predicate fn (fetch's `isFrameworkDep`: matches `plgg`,
`plgg/*`, `plgg-server`, `plgg-server/*`).

**Case-collision renames (U0 fix — must survive):**
- plgg-view: output key `styleEntry` ← `src/styleEntry.ts`; `dist/styleEntry.*`
  must NOT collide with the `dist/Style/` per-file dts tree on case-insensitive
  FS. `package.json` `./style` exports → `./dist/styleEntry.{es,cjs}.js` +
  `./dist/styleEntry.d.ts`. Plus `.` → index, `./client` → client.
- plgg-server: output key `ssgEntry` ← `src/ssgEntry.ts`; vs `dist/Ssg/`.
  `package.json` `./ssg` → `./dist/ssgEntry.*`. Plus `.`/`./node`/`./bun`/`./deno`.
- The bundler MUST honor the output-KEY naming (`fileName: (format, entryName)
  => ${entryName}.${format}.js`), not derive the name from the source basename,
  or these subpaths break. Highest-risk reproduction point of ticket 3.

Per-package recipe (mirrors the 9 vitest→plgg-test migrations): author bundler
config = vite config, swap `build`/`publish` scripts from `vite build` to the
bundler, `rm vite.config.ts` after parity, diff `dist/` + run that package's
plgg-test suite + `scripts/check-all.sh`. Migrate in build.sh dependency order.
command-scripts policy: keep npm `build` as the canonical entry + `scripts/`
runners orchestrating; no bespoke per-package shell scripts. Leave vite devDeps
+ lockfiles for T5.

**Cross-package `file:` resolution risk:** every downstream package builds
against upstream `dist/` resolved via `package.json` `exports`. A single
mismatched output filename breaks the downstream build. Diff every dist before
moving on. `scripts/check-all.sh` = `build.sh` (dep-ordered) then all 11 test
scripts incl. example — the cross-package gate.

Open decision (ticket flags it): whether to fold plgg-foundry into build.sh now.

---

## Ticket 4 — de-vite `example` (depends on T2)

- `packages/example/vite.config.ts`: app-bundle mode — lib `entry: src/main.ts`,
  formats `["es"]` ONLY, `fileName: () => "main.js"` → single `dist/main.js`.
  No dts, no externals. (App bundle, not the dual-format library target — the
  bundler needs an app/single-ESM target distinct from the library target.)
- `packages/example/package.json` (private, `@plgg/example`, no `exports` — no
  dist contract for others): `build: "vite build"`, `serve: "vite"` (CSR dev
  server for index.html), `serve:ssr: "tsx src/server.ts"`. vite + tsx devDeps.
- `index.html`: `<div id="root">` + `<script type="module" src="/src/main.ts">`
  — vite dev server transpiles `src/main.ts` on the fly for CSR dev.
- `src/main.ts`: CSR entry — mounts `application(app)` onto `#root` via
  plgg-view/client. `src/server.ts`: SSR entry — reads `dist/main.js` off disk,
  serves it at `/main.js?v=<hash>`, SSR-renders `view(init)` via plgg-server's
  `pageResponse`; runs on `node:fs`/`node:path`/`node:crypto` + plgg-server/node
  `serve`. Server depends on `dist/main.js` existing (degrades to 404 if absent).

Two distinct concerns (ticket is explicit a bundler is NOT a dev server):
1. App bundle `src/main.ts → dist/main.js` (single ESM) — bundler app target.
2. Dev server + SSR. `serve` = vite dev server (index.html + on-the-fly main.ts,
   rebuild-on-change). `serve:ssr` already uses `tsx` (not vite) — decide keep
   tsx or fold in. Replacement must NOT reintroduce vite / a native-binding
   bundler; record an exit strategy. example is private/no downstream consumers
   → safest place to iterate; keep dev DX simple (it's the showcase front door).
- `app.spec.ts` references vite only incidentally — must stay green post-swap.

---

## Ticket 5 — purge vite + grep gate (depends on T3, T4)

- Remove `vite` + `vite-plugin-dts` from every migrated `packages/*/package.json`
  devDeps; delete remaining `vite.config.ts` (10 today: example, fetch, foundry,
  http, kit, router, server, sql, test, view — NOT guide).
- `scripts/publish-plgg.sh` → `cd packages/plgg && npm run publish` (currently
  `vite build && npm publish`); repoint to bundler. Releases stay CI-owned
  CalVer — `/ship` must NOT manually publish a GitHub Release (memory:
  reference_release_flow).
- `.github/workflows/deploy-guide.yml`: build loop `for pkg in plgg plgg-test
  plgg-http plgg-router plgg-view plgg-kit plgg-server plgg-fetch plgg-sql
  plgg-foundry; (cd packages/$pkg && rm -f package-lock.json && npm install &&
  npm run build)`. The `rm -f package-lock.json` is the rolldown-native-binding
  workaround — REMOVE only AFTER step1/3 confirm no native-binding bundler
  remains (sequencing matters; lockfile regen reintroduces the cross-platform
  optional-binding rot only if a native tool is still present).
- `.github/workflows/run-tests.yml`: builds plgg then plgg-test then runs
  tsc/test/coverage — `npm run build` = vite indirectly; repoint.
- Regenerate every `packages/*/package-lock.json` to flush vite + rolldown
  (darwin-only optional-binding entries).
- **grep gate MUST be scoped:** guide legitimately depends on vite transitively
  via VitePress (`packages/guide/{package.json, .vitepress/config.ts,
  typedoc.base.json}`). Gate on direct `vite`/`vite-plugin-dts` devDeps + configs
  + `from "vite"` build imports across migrated packages — NOT "zero vite
  anywhere in the graph." Put the gate in the canonical `scripts/` runner
  (mirror the vitest grep gate), no bespoke per-check script (command-scripts).
- ci-cd policy: deploy/test/publish must build deterministically with the same
  commands developers run. Finalize the vendor-neutrality dependency-decision log
  (vite shed, bundler adopted, with monitoring + exit).
- Closing acceptance gate: `scripts/check-all.sh` full green + Deploy Guide
  workflow green on a real push.

---

## Cross-cutting structural risks (for later reviews)
1. **`cast` error-wrapping vs existing message assertions** (T1) — top-level
   error message may become "Cast failed at…" not the business message; the
   green suite is the only proof. Highest T1 risk.
2. **Missing `tsconfig.build.json` for plgg core** (T2) — ticket assumes one;
   bundler must drive per-file dts from base `tsconfig.json` and must NOT leak
   `tsc`-emitted `.js`/`.js.map` into dist.
3. **Native-binding re-lock-in** (T2/T5) — the whole point is to retire rolldown;
   any transpiler with a platform-specific native binding defeats the effort and
   re-breaks Deploy Guide CI. Must be CI-reproducible on linux-x64.
4. **Output-KEY-based filenames** (T3) — `styleEntry`/`ssgEntry` renames and the
   exact `index.${format}.js` / `${entryName}.${format}.js` patterns are the
   dist contract `file:` consumers + `package.json` `exports` resolve. One wrong
   name cascades into downstream build failures.
5. **Two dts modes** (T2/T3) — per-file (8 pkgs) AND rolled-up (kit, foundry).
   A single mode is insufficient; api-extractor already available for rolled-up.
6. **build.sh vs deploy-guide.yml order divergence** (T2/T5) — foundry + test in
   the CI loop but not build.sh; reconcile so the bundler bootstrap + foundry
   build order is coherent across both.
7. **Dependency-decision log presence** (T2/T5) — vendor-neutrality requires the
   four-point log; its absence is a policy gap, not a nicety.
