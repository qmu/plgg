# Coding Review — T2 (scaffold plgg-db-migration) — Architect

- **Reviewer**: Architect (analytical / code + architectural review; no test execution)
- **Ticket**: `20260627210146-scaffold-plgg-db-migration-package.md`
- **Verdict**: **Approve with minor suggestions**

---

## What I checked (against directory-structure + coding-standards + the clean-runner / plgg-bundle lessons)

**1. Package layout & hybrid library+CLI shape — correct (✓).**
The scaffold composes the two precedents exactly as the design requires:
- *Library* (plgg-sql precedent): `type:module`, dual `exports` (import→`index.es.js`,
  require→`index.cjs.js`, both with `types`), `main`/`module`/`types`, `build:
  plgg-bundle`, `bundle.config.ts` (single `index` entry, es+cjs, externals
  derived from package.json), `plgg-test.config.json` (threshold 91), own
  `.prettierrc.json` (printWidth 50). deps `plgg`+`plgg-sql` (file:), devDeps
  `@types/node`/`plgg-bundle`/`plgg-test`/`typescript`.
- *CLI* (plgg-bundle precedent): `bin` → `bin/plgg-db-migration.mjs`, which
  `register`s `bin/hook.mjs` then `await import`s `src/entrypoints/cli.ts` under
  Node type-stripping.
- `src/entrypoints/cli.ts` + `src/index.ts` present. `domain/` and `vendors/` are
  not yet on disk — **correct**: git does not track empty dirs, and T3/T4 create
  them with their first content. No empty-scaffold needed.

**2. Build wiring — clean-runner-safe (✓).**
- `bundle.config.ts` mirrors plgg-sql; the CLI/`bin` are deliberately *not*
  bundled (run via type-stripping), which the config comment states.
- `scripts/build.sh` builds `plgg-db-migration` **after** `plgg-sql` (line 36),
  with a comment explaining the ordering (it consumes plgg-sql's dist; both are
  external). So after T1's plgg-sql rebuild, this package resolves `execScript`
  from plgg-sql's freshly-built `dist/index.d.ts`. ✓
- `scripts/npm-install.sh` installs the package's own node_modules (line 19) —
  the file:-dep-doesn't-install-linked-node_modules lesson is handled.
- `plgg-bundle`'s own deps are already bootstrapped by build.sh's existing
  `npm ci` guard, and `plgg-db-migration`'s `build` invokes the `plgg-bundle`
  bin from its devDep. A clean runner therefore builds.

**3. Self-alias hook — faithful (✓).**
`bin/hook.mjs` is functionally identical to plgg-bundle's (verified by diff modulo
the package name): same `pick()` candidate order (`base`, `base.ts`,
`base/index.ts`), same `prefix` self-alias rewrite to `src/<sub>`, same
fall-through to Node default resolution for `plgg`/`plgg-sql`/`node:*`. Only the
prefix string and comment wording differ. The launcher mirrors plgg-bundle's
register-then-import pattern.

**4. exports / dual-format / type:module / no escape hatches — correct (✓).**
The `exports` map is the plgg-sql shape verbatim. `cli.ts` is a clean placeholder
(stdout write + `export {}`); `bin/*.mjs` are plain JS (bootstrap-exempt, the same
exemption plgg-bundle documents). No `as`/`any`/`ts-ignore` anywhere; tsconfig
keeps the full strict set incl. `erasableSyntaxOnly` (required so every src `.ts`
is type-strippable for the bin path) and `exactOptionalPropertyTypes` (matters for
the `Option` modeling T3 brings). `tsconfig.build.json` correctly narrows to
`src/**` and flips emit on for the `.d.ts` tree.

## Q3 — check-all.sh test-line deferral to T3: **agree, with a guardrail**

The deferral is the right call. After the config exclusions
(`["/index.ts", "/entrypoints/"]`), the only two src files that exist — `index.ts`
and `entrypoints/cli.ts` — are *both* excluded, so `plgg-test src` has zero spec
files and nothing to cover; the runner errors (no tests / the 91% gate has no
coverable surface). Adding the check-all line now would red the whole gate.
Forcing a `--passWithNoTests`-style escape would mask the real "no tests yet"
signal, which is worse. So: defer the line until T3 lands the first specs.

**Concern C1 (process, not code).** Deferring means that *between T2 and T3 the
package is invisible to the canonical gate* — if T3 forgets the line, the package
silently stays out of `check-all.sh` indefinitely. **Proposal**: make "add
`./scripts/test-plgg-db-migration.sh` to `scripts/check-all.sh`" an explicit,
checked acceptance item in the **T3** ticket (the per-package script, build.sh,
and npm-install.sh wiring are already correctly done here in T2 — only the
check-all line is outstanding). That closes the one wiring gap the deferral opens.

## Concern C2 (minor, non-blocking)

`engines: { node: ">=22.6" }` may be slightly loose for what the `bin` actually
needs. The launcher does `await import('…/cli.ts')`, which relies on Node running
TypeScript **without** a flag — unflagged only from ~Node 22.18 / 23.6; on
22.6–22.17 it requires `--experimental-strip-types`. **Proposal**: either tighten
`engines.node` to the version the repo actually targets for unflagged strip, or
drop the field to match plgg-bundle (which omits `engines` and works in this same
repo). Non-blocking — the lead confirmed `node bin/plgg-db-migration.mjs` runs, so
the active runner supports it; this is about the declared contract matching the
real requirement.

## Decision

**Approve with minor suggestions.** The scaffold faithfully composes the plgg-sql
library and plgg-bundle CLI precedents, the canonical-runner wiring (build.sh
order, npm-install.sh, per-package scripts, self-alias hook) is correctly in
place, and the check-all deferral is sound. C1 (make the check-all line a T3
acceptance item) is the one thing I want tracked so the package can't fall out of
the gate; C2 is a declared-contract tidy-up. Neither needs re-review.
