# Architect Review Checklist + Integration-Surface Discovery

Author: Architect (QA — analytical review only; no test execution)
Status: prep note for the Coding-Phase review
Scope: read-only discovery to ground the later review of Constructor's code
against the 7 plan amendments, the structural model, and the dependency
boundary.

## A. Integration surface (verified against the worktree)

- **No root `package.json`.** This is NOT an npm-workspaces monorepo;
  each `packages/<pkg>/` self-installs (`scripts/npm-install.sh`
  `cd`s into each package and runs `npm install`). Consequence:
  plgg-test cannot be wired via a workspace root; it must be added to
  `npm-install.sh`, `build.sh`, and `check-all.sh` like every sibling.
- **CI only runs `packages/plgg`.** `.github/workflows/run-tests.yml`
  runs `npm ci` / `tsc --noEmit` / `npm test` / `npm run build` /
  `npm run coverage` all with `working-directory: packages/plgg` only
  (Node `22.x`, cache keyed on `packages/plgg/package-lock.json`).
  So the CI green/red signal for the *whole repo* rides on plgg's
  `npm test` + `npm run coverage`. **Review implication:** once plgg's
  scripts switch from vitest to plgg-test, CI exercises plgg-test
  exactly via those two npm scripts — no workflow YAML change needed,
  but the exit-code contract (amendment "Exit-code") is the CI gate.
- **All 10 packages share identical scripts:**
  `test: "tsc --noEmit && vitest --run"`, `tsc: "tsc --noEmit"`,
  `test:watch: "vitest"`, `coverage: "vitest --run --coverage"`.
  Migration = change what these four invoke (vitest → plgg-test CLI),
  keeping `tsc --noEmit` as the pre-test gate. Command-scripts policy:
  the `scripts/test-<pkg>.sh` / `-watch-` / `coverage-plgg.sh` family
  just shells into `npm run …`; those wrappers should stay byte-for-byte.
- **Script family to extend (not multiply):** `test-<pkg>.sh`,
  `test-watch-<pkg>.sh`, `tsc-<pkg>.sh`, `tsc-watch-<pkg>.sh` per
  package, plus `coverage-plgg.sh`, `check-all.sh`, `build.sh`,
  `npm-install.sh`, `menu.sh`. New package gets its own
  `test-plgg-test.sh` etc. following the exact template and is appended
  to `check-all.sh` / `build.sh` / `npm-install.sh` lists.

## B. plgg-test scaffold already committed (Constructor)

Files present: `package.json`, `tsconfig.json`, `vite.config.ts`,
`.prettierrc.json`. **No `src/` yet** — do not review non-existent code.

Scaffold observations to carry into the review:

- `package.json` `dependencies` = `{ "plgg": "file:../plgg" }` ONLY;
  devDeps = `@types/node`, `typescript`, `vite`, `vite-plugin-dts`.
  **Dependency boundary is clean** (no third-party runtime dep) — this
  is the SC6 win; verify it stays clean as `src/` lands.
- `bin: { "plgg-test": "./bin/plgg-test.mjs" }` and the scripts call
  `node ./bin/plgg-test.mjs src [--watch|--coverage]` **without**
  `--experimental-strip-types --import <register>`. Design §2.3 and
  amendment 1 require those flags for TS execution + resolver. **Flag
  for review:** the `bin/plgg-test.mjs` shim MUST itself inject the
  strip-types + `module.register` resolver (and, for `--coverage`, the
  `NODE_V8_COVERAGE` self-re-exec). If the shim is a plain `.mjs` that
  imports `.ts` without registering the loader, intra-package specifiers
  (`plgg-test/...`) and the corpus's `plgg/index` etc. will not resolve.
- `engines.node: ">=22.6"` — correct floor for native strip-types;
  CI is 22.x. Note `recursive: true` `fs.watch` on Linux needs ≥20 (ok),
  and `module.register` needs ≥20.6 (ok).
- tsconfig is cloned from plgg with `paths: { "plgg-test*": ["./src/*"] }`,
  `module: NodeNext`, `isolatedModules`, `erasableSyntaxOnly` — TS is
  type-erasable, the precondition for native strip-types. Good.

## C. Resolver-fidelity baseline (the spec to review the hook against)

vite's `resolve.alias` today aliases ONLY each package's own name to
`./src` (verified per package): `plgg → ./src`, `plgg-kit → ./src`,
`plgg-fetch → ./src`, etc. Cross-package deps are NOT aliased — they
resolve to built `dist` via `file:` node_modules.

So the `module.register` hook must reproduce, **parametric on the
running package's name** (read from its tsconfig `paths` `<pkg>*`):

1. **Self `/index`** — `from "plgg/index"` (74×), `"plgg-server/index"`
   (13×), `"plgg-http/index"` (5×), `"plgg-sql/index"` (4×),
   `"plgg-fetch/index"` (4×), `"plgg-foundry/index"` (3×),
   `"plgg-kit/index"` (1×) → `./src/index.ts`.
2. **Self deep path (no extension)** — e.g.
   `"plgg/Functionals/bind"`, `"plgg-view/Html/model/element"` (8×),
   `"plgg-view/Html/model/Attribute"` (8×),
   `"plgg-foundry/Foundry/usecase"` (5×),
   `"plgg-router/Routing/usecase/parseQuery"` (2×) → must append `.ts`
   AND fall back to `/index.ts` for directory specifiers like
   `"plgg-foundry/Example"` / `"plgg-foundry/Foundry/usecase"`.
3. **Self subpath entrypoints** — `"plgg-server/node"`,
   `"plgg-server/deno"`, `"plgg-server/bun"` (1× each) → `./src/node.ts`
   etc. Same rule as (2); just flagging these are real and live under src.
4. **Cross-package bare** — `from "plgg"` (38×), `"plgg-view"` (4×),
   `"plgg-http"` (3×) → fall THROUGH to normal node_modules/`file:`
   resolution against built `dist` (requires `build.sh` ran first; CI
   builds plgg before coverage). The hook must NOT rewrite a bare
   cross-package specifier to the current package's `./src`.

**Acceptance-fixture check (amendment 4):** the resolver acceptance
test must exercise all three intra shapes (`/index`, `/deep/path`,
directory→`/index.ts`) AND confirm cross-package bare falls through —
case (4) is the one most likely to regress if the hook over-matches.

## D. Coverage-config unevenness (amendment 6 — per-package verdict)

Thresholds are MORE uneven than amendment 6's two-example summary; the
ship-or-defer verdict must be recorded per package against the real
baseline:

- **Gated at 91:** plgg, plgg-fetch, plgg-router, plgg-server,
  plgg-sql, plgg-view.
- **Gated at 90:** plgg-http (note: different number — do not normalize
  silently to 91).
- **No thresholds (just `coverage.all: true`):** example, plgg-foundry,
  plgg-kit.

All use the v8 provider today. **Review implications:**
- plgg-test's coverage gate must read each package's *own* threshold
  (91 / 90 / none), not a hardcoded 91, or it changes the gate for
  plgg-http and the three ungated packages — a silent policy change
  amendment 6 forbids.
- The `exclude` globs that the gate must honor (from plgg's vite
  config): `index.ts`, `**/*.spec.ts`, `**/*.test.ts`, `Abstracts/**`,
  `Grammaticals/Brand.ts`, `Grammaticals/NonNeverFn.ts`,
  `Grammaticals/PromisedResult.ts`, plus `node_modules/dist/coverage`.
  These are per-package in vite today; verify how plgg-test sources its
  exclude list (config file vs CLI flag vs convention).

## E. Amendment-by-amendment review checklist

1. **Coverage collection process named (amend. 1).** Confirm the
   `--coverage` path does a self-re-exec setting `NODE_V8_COVERAGE=<tmp>`
   **plus** strip-types + `--import <register>`, runs in-process in the
   child, and a parent post-pass folds the dumped V8 JSON + applies the
   gate. The collected-from process MUST be named in code/comments.
   (Reject in-process `node:inspector` unless documented as the fallback.)
2. **Two-tier migration (amend. 2).** Confirm a checked-in codemod
   rewrites `"vitest"` → `"plgg-test"` across all spec files (no hand
   edits) AND the single hand-touched spec
   (`plgg-kit/.../generateObject.spec.ts`) is refactored to inject
   `postJson` (default real) with the `vi.mock` deleted. **Reject any
   ESM module-mock engine in v1** (named follow-up only).
3. **Parity gate on the SET + real corpus (amend. 3).** Confirm the
   parity check asserts (a) identical *discovered spec-file set* (closes
   partial-discovery false green) and (b) identical per-test verdicts on
   the real `Datum`/`Dict`/Result/Option shapes — not synthetic.
4. **`toEqual` + resolver are gated (amend. 4).** Confirm `toEqual` deep
   equality is in the plain-`throw` meta-harness primitive checks
   (failing/passing/async-reject + toEqual on plgg shapes with
   `undefined` fields). Confirm the resolver acceptance fixture (§C)
   runs+imports before any migration.
5. **Assertion boundary THROWS (amend. 5).** Confirm `expect`/`assert`
   throw `AssertionError` and `assert` is `function assert(c, m?):
   asserts c` (the 448 narrowing call sites depend on it; `assert.fail`
   used 4×). Confirm matchers are NOT "Result-ified" — Option/Result/
   `match` govern internal runner orchestration only. This must be stated
   in code. (House-style nuance: the throwing boundary is the ONE
   sanctioned throw; everything internal stays Result/Option, no
   `as`/`any`/`ts-ignore` — run `scripts/tsc-plgg.sh`-style check mentally
   against any `as`.)
6. **Per-package coverage ship-or-defer verdict (amend. 6).** Confirm
   the definition of done records, per migrated package, whether the gate
   is enforced at that package's own threshold (91/90/none) — accurate
   number or explicit named deferral, no silent gap. Confirm plgg-http's
   90 and the three ungated packages aren't silently normalized.
7. **Housekeeping (amend. 7).** Confirm figures distinguish FILE counts
   vs CALL counts (`assert` 64 files / 448 calls; `test` 125 files / 744
   calls; `it` 88 calls; `assert.fail` 4; matcher counts per design §1.3
   table — all independently re-verified accurate). Confirm policy slugs
   resolved against the implementation/operation skill indexes.

## F. Structural-model conformance checks (my lens)

- **Component boundaries clean (model L0–L3):** L0 pure domain
  (Suite/Test/Hook tree, matcher predicates, deep-equal, AssertionError)
  must have NO I/O; L2 effectful edges (Discovery `fs`, Watch
  `fs.watch`, Coverage V8, Resolver `module.register`, CLI) isolated so
  the parity-critical core can be reasoned about independently. Flag any
  `fs`/process import leaking into L0.
- **Discovery glob fidelity:** must find `**/*.spec.ts` AND `**/*.test.ts`
  (the vite `exclude` lists both); roots default to `src`. Verify the
  fs-walk matches vite's discovery set — discovery mismatch IS the
  partial-discovery false green amendment 3 guards.
- **Async correctness (model false-green vector):** runner must `await`
  the test fn's return and treat a rejected promise / unhandled
  rejection within the test window as failure (~208 async tests;
  `await expect(p).resolves.toBe(...)` is the dominant form). Verify
  `.resolves`/`.rejects` adapt a Promise actual to the inner sync matcher.
- **Watch reliability:** `fs.watch({recursive:true})` + debounce;
  re-add on rename (editor atomic-save). Verify watch never exits
  non-zero to kill the loop, prints verdict, waits.
- **Dependency boundary stays at `plgg` + Node built-ins** as `src/`
  grows: allowed `node:fs`/`fs/promises`, `node:path`, `node:module`,
  `node:process`, `node:child_process` (for the coverage re-exec),
  `node:inspector` (fallback only). Flag ANY new third-party dep — that
  would defeat the trip's raison d'être (SC6).

## G. Cross-cutting things I will reject on sight

- Any `as` / `any` / `ts-ignore` anywhere in `src/` (CLAUDE.md
  THE MOST IMPORTANT RULE).
- A bin shim that imports `.ts` without registering the strip-types
  loader + resolver (would break the whole corpus's specifiers).
- A coverage gate hardcoding 91 (breaks plgg-http=90 and the 3 ungated).
- A resolver that rewrites cross-package bare `"plgg"` to local `./src`.
- An ESM module-mock engine smuggled into v1 (amendment 2 forbids).
- Result-returning matchers (breaks `assert`'s `asserts cond`,
  amendment 5).
- Prettier hand-packing onto fewer lines (printWidth 50 per package).
