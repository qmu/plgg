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
