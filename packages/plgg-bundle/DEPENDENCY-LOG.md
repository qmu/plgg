# plgg-bundle — Dependency Decision Log

Per `workaholic:implementation` / `vendor-neutrality.md` (Conservative Vendor
Dependence). The whole point of this effort is to **shed** a dependency (vite),
so the bundler must not trade it for new ones. **Outcome: zero new
dependencies.** The bundler reuses only `typescript`, which every package
already depends on for type-checking; everything else (the module-graph walk,
the dual-format registry emit, the config model, external handling, the
declaration-tree orchestration) is implemented in-house.

The motivating pain this effort retires: vite/rolldown's **native binding**
(a darwin-only optional dependency) broke the Deploy Guide CI. The bundler is
therefore pure JavaScript with **no native binding**, headless-CI-reproducible
on any platform.

---

## Dependency: typescript (reused — NOT new)
- Status: already a direct devDependency of every package.
### Reason (理由)
TS→JS transpilation and `.d.ts` emission are specialized domains where getting
the details wrong (decorator/enum/`export *`/CJS-interop lowering, declaration
inference) is fatal, and where the worldwide TypeScript team already guarantees
spec conformance. We do **not** reimplement them. The bundler uses
`ts.transpileModule` (per-module TS→JS) and `tsc --emitDeclarationOnly` (the
per-file `.d.ts` tree) — both from the `typescript` the type-checker already
runs, so there is no transpile/type-check drift and **no new dependency**.
`ts.transpileModule` and `tsc` are pure JS with **zero native bindings**.
### Assessment (点検)
- License: Apache-2.0 — compatible with our MIT use.
- Reputation: the reference TypeScript compiler; universal track record.
- Development status: actively maintained by Microsoft, frequent releases.
- Sustainability: corporate-backed (Microsoft); not single-maintainer risk.
### Monitoring plan (監視計画)
- Standpoints: the bundler pins to the project's existing `typescript` devDep;
  watch `transpileModule` API stability across majors and any reintroduction of
  a native fast-path that becomes load-bearing.
- Review frequency: whenever the shared `typescript` version is bumped.
### Exit strategy (撤退戦略)
- Candidate alternatives: Node's built-in `--experimental-strip-types`
  (the runtime already type-strips for plgg-test), Babel, or sucrase — all
  pure-JS, native-binding-free.
- Scope of impact: `src/vendors/transpiler.ts` (the ACL) and the `tsc` call in
  `src/domain/usecase/emitDts.ts`; the in-house domain is untouched.
- Anticipated effort: person-days.

---

## Dependencies deliberately NOT taken (the zero-new-dep decision)

An earlier PoC iteration added `terser` (minify) and
`@microsoft/api-extractor` (rolled-up `.d.ts`). Both were **rejected and
removed** on the developer's directive: shedding one dependency (vite) while
adding two defeats the vendor-neutrality goal.

- **terser (minify) — dropped, no replacement.** A library `dist` does not need
  to be minified: every `file:` consumer and the npm consumer re-bundle/minify
  themselves, and minified-ness was never part of the resolution contract (we
  already accepted structural-not-byte parity). The free size trim that remains
  is `ts.transpileModule`'s `removeComments` (no dependency). The emitted JS is
  unminified and larger than rolldown's; that is a publish-time concern tracked
  for a later ticket, not a resolution-contract issue.
- **@microsoft/api-extractor (rolled-up `.d.ts`) — dropped, no replacement.**
  The single-file `index.d.ts` (vite-plugin-dts `rollupTypes:true`, used by
  plgg-kit and plgg-foundry) was a stylistic choice, not a correctness
  requirement. Verified: no internal package depends on plgg-kit/plgg-foundry,
  both `index.ts` files only `export *` from their own submodules, and their
  `types` field is `dist/index.d.ts` either way — so the per-file tree every
  other package uses resolves types identically for consumers. This is a
  breaking-changes-OK project, so kit/foundry move to the same **single per-file
  `.d.ts` mode**. The bundler therefore has ONE dts mode (simpler).

---

## Bootstrap independence — plgg-bundle depends on NOTHING it builds (OBS-3)

A foundation build tool must not depend on the artifact it builds. plgg-bundle's
job is to produce `plgg`'s `dist`, so it must **not** import `plgg` — otherwise a
clean checkout with no `packages/plgg/dist` cannot start the tool
(`ERR_MODULE_NOT_FOUND`), violating the ci-cd policy (a fresh runner builds with
the same commands). Resolving `plgg` from *source* is also infeasible: plgg's
source does not load under Node type-stripping without converting the whole core
package to `verbatimModuleSyntax` + ESM (527 fixes / 109 files) — out of scope.

**Resolution:** plgg-bundle is written in **plain TypeScript** — no `plgg`
runtime dependency at all (native control flow, `throw` caught once at the bin
boundary). The FP idiom governs the library and consumers, not bootstrap
tooling (repo precedent: plgg-test's plain `.mjs` launcher). The CLAUDE.md hard
rule — no `as`/`any`/`ts-ignore` — still applies. See README. The clean-checkout
build is therefore correct by construction: `rm -rf packages/plgg/dist` then
build succeeds. plgg-bundle's only `dependency` is `typescript` (reused).

---

## What stays in-house (no vendor)
- Bundler **config model** (entries / formats / fileName template / external
  string[]|regex|predicate) — `src/domain`.
- **Module-graph resolution** (walk the package self-alias + relative
  specifiers from the entry) — `src/domain`.
- **Dual-format emission** (ESM `index.es.js` + CJS `index.cjs.js` via a
  collision-free module-registry runtime, `exports:"named"`) — `src/domain`.
- **Export-surface discovery** (run the self-contained CJS bundle in `node:vm`
  to read its keys, since ESM cannot declare exports dynamically) —
  `src/vendors/runner.ts` (uses the `node:vm` builtin, no dependency).
- **External handling** and the per-file `.d.ts` alias-rewrite + tree
  orchestration — `src/domain`.

---

## Known gaps carried to B2 (migrate-library-builds)

The plgg-core PoC validated the foundation; these are unsolved by design and
must be addressed before the externals-bearing packages cut over.

1. **ESM external emission is unimplemented.** plgg core has zero externals, so
   the ESM emitter currently throws on any external id. The
   **externals-bearing** packages — blocked until this lands — are
   **plgg-server** (`node:http`/`node:stream`/`node:fs/promises`/`node:path`),
   **plgg-fetch** (`isFrameworkDep` predicate), and **plgg-test**
   (`["plgg", /^node:/]`). They need the ESM bundle to emit a real top-level
   `import` for each external and route the registry's `__require` to those
   bindings. CJS externals already work (host `require` fall-through). The
   **zero-external** packages — free to migrate now — are **plgg-http**,
   **plgg-router**, **plgg-sql**, **plgg-kit**, **plgg-foundry**, and
   **plgg-view** (all `external:[]`).
2. **Export-surface discovery via `node:vm` only works for a side-effect-free,
   externals-free CJS bundle** (true for plgg core). A bundle that `require`s a
   real external (e.g. `node:http`) cannot be executed in a bare vm at build
   time to enumerate its ESM export names. Options for B2 (not yet chosen):
   stub the externals in the vm sandbox so the bundle runs, or derive the
   export-name set from the emitted `.d.ts` / the entry AST instead of
   executing. Record and decide in B2.
3. **Multi-entry + output-key renames** (plgg-view `styleEntry`, plgg-server
   `ssgEntry` — the U0 case-collision fix) are supported in the config/emit but
   not yet exercised against a real package.
4. **Per-file dts for plgg-kit/plgg-foundry** is verified safe (no internal
   consumer; stylistic-only rollup) but the definitive gate is B2 actually
   building them per-file and a consumer type-checking against the tree —
   watch for any kit/foundry public type that referenced a non-public plgg type
   the rollup used to inline.
5. **Bootstrap ordering:** `scripts/build.sh` must build `plgg-bundle` (via its
   own `tsc`) before using it to build the other packages.
6. **Unminified bundle size** (~3–4× rolldown's minified output) is a
   publish-time / B4 concern, not a resolution-contract issue — consumers
   re-minify.
7. **`rewriteDtsAliases` specifier-anchoring.** It currently replaces *any*
   quoted `"<prefix>/…"` string in a `.d.ts`. Safe for plgg core, but before B2
   runs it over more packages, anchor the rewrite to import/export specifier
   positions (`from "…"` / `import("…")`) so a literal string-type
   `"plgg/…"` appearing in a declaration cannot be corrupted.

---

## Ticket 3 — build determinism (root cause + fix)

**Symptom.** `scripts/build.sh` failed intermittently (Planner ~33%, four
signatures) — a consumer package's build could not see an upstream sibling's
`dist`: `EvalError: Cannot find module …/plgg/dist/index.cjs.js`, tsc
`TS7016` (`plgg → index.cjs.js` implicit-any), `TS2305` (incomplete barrel),
and `ENOENT scandir …/dist`.

**Root cause.** Under externalization (ruling B) each bundle reads its sibling
dists at build time, at TWO points: (1) export-surface discovery executes the
CJS bundle (`vendors/runner.ts`), which `require`s siblings; (2) the tsc dts
emit resolves each sibling's `.d.ts`. The destructive rebuild —
`build.ts:emptyDir` doing `rm -rf dist; mkdir dist` then refilling file-by-file
— left a multi-second window where a package's `dist` was missing or partial.
On a shared working tree (parallel agents, the test harness, overlapping/
orphaned `build.sh` invocations) a concurrent reader hit that window and tore.
Proven: against a STABLE sibling dist the consumer build is deterministic
(plgg-http 20/20, plgg-kit 30/30); with an active concurrent sibling rebuilder
it fails (~24%) with exactly the four signatures.

**Fix (atomic publish).** Each package now builds into a private `dist.stage`
(both the JS bundles and the tsc dts emit, via an `outDir` override in
`emitDts.ts`), then swaps it into place with `swapIntoPlace` in `build.ts`
(rename `dist→dist.old`, rename `dist.stage→dist`, rm `dist.old`; cold builds
skip step 1 and are gap-free). The destructive window shrinks from the whole
build to a single same-filesystem `rename`, so a concurrent reader observes
only a complete old or complete new `dist` — never torn. The loud guards
remain: `runner.ts` throws `EvalError` and `emitDts.ts` throws `DtsError`
(surfacing tsc's `TS7016`) rather than emitting `any`. Result: cold
`build.sh` 10/10; consumer-under-concurrent-rebuilder 25/25.

**Gap #2 disposition (DEFERRED, not required).** Static export-surface
discovery — deriving the entry's export names from the module graph / emitted
`.d.ts` instead of executing the CJS bundle — would remove reader point (1)
and the "execute freshly-built code at build time" smell. It is recorded as a
future architectural cleanup but is NOT needed for determinism: it addresses
only reader (1), while the tsc dts emit (reader (2)) reads sibling `.d.ts`
regardless; atomic publish closes BOTH. Leader-accepted deferral.

**Known residual (warm concurrent rebuild).** The COLD path — `dist` absent,
which is how `check-all`/CI run (dist is cleaned first) — publishes via a
single atomic `rename(dist.stage→dist)`: ZERO absence window, the production
gate is fully closed. A WARM rebuild (an existing `dist`) uses the two-rename
dance, which has a ~microsecond window where `dist` is briefly ABSENT (between
`rename(dist→dist.old)` and `rename(dist.stage→dist)`). A concurrent reader
hitting exactly that window gets ENOENT → a LOUD fail (EvalError/DtsError),
never a silent `any`, and it did not occur in 25/25 builds under an aggressive
concurrent rebuilder. Fully eliminating even this microsecond (a stable `dist`
with symlink-swap, so the path is never absent) is deferred — not worth the
published-artifact-as-symlink complexity for a loud-fail, rare, non-CI case.

---

## Final status — vite fully shed (Ticket 5)

The sovereignty move is complete. **`vite` and `vite-plugin-dts` are removed
as direct dependencies from every package** (plgg, plgg-kit, plgg-foundry,
plgg-http, plgg-router, plgg-view, plgg-server, plgg-fetch, plgg-sql,
plgg-test; example de-vited in Ticket 4). The in-house `plgg-bundle` is the
sole build tool — every package's `build` script is `plgg-bundle`, driven by
`scripts/build.sh`. **Net dependency change: −2 (vite, vite-plugin-dts), +0.**

- **Native binding retired.** vite's rolldown optional native binding (the
  darwin-only `@rolldown/binding-*` skew that broke the Deploy Guide CI) is
  gone from every non-guide `package-lock.json` — the locks were regenerated
  clean, and the `rm -f package-lock.json` deploy-guide workaround is removed.
  The bundler is pure JS (`ts.transpileModule` + `tsc`), reproducible on any
  platform with no optional-binding rot.
- **Intentionally retained:** `packages/guide` keeps `vitepress` (vite is its
  transitive dep) — the docs site is out of scope for the build-tool move.

**Monitoring (the gate).** `scripts/check-all.sh` runs a fail-fast grep gate
asserting zero DIRECT vite: no `vite`/`vite-plugin-dts` devDeps, no
`vite.config.*`, no `from "vite"` build import — scoped to exclude the guide's
transitive VitePress. A reintroduced direct vite dep fails the gate.

**Exit strategy.** If the in-house bundler ever proves insufficient, the
return path is adding a bundler devDep back to the affected package's
`package.json` + a config; the per-package `build` script is the single seam.
Prefer a pure-JS / zero-native-binding tool to preserve cross-platform CI
reproducibility (the failure mode this whole effort retired).
