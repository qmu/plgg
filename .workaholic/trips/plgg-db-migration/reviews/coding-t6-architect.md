# Coding Review — T6 (CLI + new-migration) — Architect

- **Reviewer**: Architect (analytical / code + architectural review; no test execution)
- **Ticket**: `20260627210150-cli-and-new-migration.md`
- **Verdict**: **Approve with minor suggestions**

Both architecture decisions are sound and I **accept** them as built; the bug
fixes are real-validation guards with no escape hatches. One DX guard and a couple
of forward notes below.

---

## Decision 1 — bin loads the BUILT `dist/cli.es.js` (not source-strip): **ACCEPT (a)**

This is the structurally sounder call for *this* package, and the plgg-bundle
source-strip precedent does **not** transfer here. plgg-bundle source-strips its
`cli.ts` because it is a **bootstrap** tool that cannot require its own build
output to exist (it *produces* dist). plgg-db-migration has no such constraint —
it is an ordinary *published* CLI, and shipping + loading `dist` is exactly the
conventional npm-CLI shape (`npm publish` runs `build`; `npx plgg-db-migration`
gets the built dist).

The deciding factor is failure mode. Option (b) (keep source-strip via
`import type`) would require strict type/value-import discipline across `cli.ts`
forever, and **without `verbatimModuleSyntax`** a future missing `import type`
breaks at **runtime** (a missing named binding from plgg's dist) — a silent,
cryptic regression. Option (a) trades that for a **loud, early** failure (no dist
→ "run `npm run build`"). Loud-and-early beats silent-and-late for a tool that
touches production schema. Accept (a). *(If the team ever wants source-strip parity
with plgg-bundle, the only safe way is (b) **plus** `verbatimModuleSyntax` so the
discipline is compiler-enforced — but I'd not spend the churn; (a) is right.)*

**Concern C1 (the one to fix) — guard the missing-dist path.** The bin already
guards the config path with `existsSync` + a clear message, but it does
`await import(join(here,"..","dist","cli.es.js"))` with **no** such guard. A local
dev who hasn't built yet gets a raw `ERR_MODULE_NOT_FOUND`, which contradicts the
whole "loud-and-early" justification for (a). **Proposal**: mirror the config
guard — `existsSync` the dist CLI and `throw new Error("plgg-db-migration: run
'npm run build' first (dist/cli.es.js missing)")` before importing. ~3 lines; it
makes the load-dist tradeoff humane.

## Decision 2 — dynamic config import in the plain-JS bin, injected as `loadConfig`: **SOUND (✓)**

A clean edge/core inversion: the **bin** (untyped, unbundled) owns the dynamic
`import()` the bundler can't see and the cwd/`PLGG_DB_MIGRATION_CONFIG` path
resolution; **`cli.ts`** (typed, bundled) receives `loadConfig: () => Promise<unknown>`
and validates the result (`asMigrateConfig(pickDefault(await loadConfig()))`). The
typed core never knows *how* config is loaded — only that it yields `unknown`,
which it then validates — so `run()` is unit-testable with a stub loader, and the
domain stays `Result`-based. The outer `try/catch` in `run()` is the legitimate
framework-edge catch: a rejected `loadConfig` (config-not-found throw, or an import
error) propagates through `await loadConfig()` and folds to `fail()`. Endorsed.

**Forward note (T8 docs).** The user's `migrate.config.ts` is loaded by the bin via
raw Node type-stripping (same path as `bundle.config.ts`), so the **user's config
must itself be type-strippable** — any type-only import in it needs `import type`,
or it breaks at runtime. The example/README must show a config that only imports
values (`defineConfig`, `sqlite`, the app's `open`) or uses `import type` for types.
Bounded and consistent with the repo's `bundle.config.ts` precedent, but a real
consumer footgun worth one explicit doc line.

## The three bug fixes — all correct, real validation, no escape hatches (✓)

- **(a) `isRecord` (not `isObj`) + `isDb` guard.** Correct: plgg's `isObj` requires
  every value to be a serializable `Datum`, which *rejects* a `Db` (function-valued)
  and any config holding one — so `isObj` would wrongly fail a valid config.
  `isRecord = typeof === "object" && !== null` is the right boundary check. `isDb`
  is a **genuine** guard — `hasProp` + `isFn` on all six seam methods
  (`all`/`run`/`execScript`/`begin`/`commit`/`rollback`) — so `value is Db` is
  backed by real runtime checks, not an assertion (satisfies the "an `is` without
  validation is the same as `as`" rule). `isDialect` likewise validates `name ∈
  DIALECT_NAMES` + `boolean` flag. The final `ok({ db: value.db, … })` is type-safe
  because `isDb`/`isDialect` narrow — no `as`.
- **(b) raw `typeof`/`hasProp` for ESM-namespace default.** Correct: a module
  namespace is an exotic object `isObj` rejects, so `pickDefault` uses raw
  `typeof === "object"` + `hasProp(mod,"default")`, tolerating a module that *is*
  the config. Right tool for the exotic-object boundary.
- **(c) removed the stale `isDialect` `schemaMigrationsDdl` check.** Consistent with
  the T3 flags-only `Dialect` (`{ name, supportsTransactionalDdl }`); the per-engine
  SQL lives in `dialectSql.ts`. `isDialect` now validates only the two real fields.
  Correct.

Escape-hatch scan of `cli.ts`/`newMigration.ts`: clean — no `as`/`any`/`ts-ignore`;
`throw`/`process`/`try-catch` confined to the `cli.ts` edge per coding-standards.

## newMigration & MigrateConfig — good, two micro-hardenings (✓)

`formatTimestamp` uses **UTC** (documented: stable id across author timezones) —
the right call to keep versions monotonic across a team. The clock is injected
(`now: Date`) for deterministic testing; the CLI passes `new Date()`. `SKELETON` is
the dbmate up/down stub; `writeFileText` mkdir-recursives the parent, so `new`
works on a fresh dir. `MigrateConfig`/`defineConfig` is a clean
`{ db, dialect, migrationsDir }` + identity helper — exactly the shape T8's example
needs (`export default defineConfig({ … })`).

Two low-severity hardenings (optional):
- **Name sanitization.** `newMigration` does not validate `name`; `new "../evil"`
  yields `joinPath(dir, "<ts>_../evil.sql")`, escaping the migrations dir. The
  operator runs `new` with their own input so impact is low, but rejecting names
  containing path separators (`/`, `\`) is cheap prudence.
- **Arg parsing.** The parser is naive: `down --to` with the value omitted
  (`--to` last) silently degrades to "roll back last" (`argValue` returns
  `undefined` → `to: undefined`), rather than erroring. Adequate for four commands;
  a `--to` present-but-empty could warrant an explicit error. Optional.

## Decision

**Approve with minor suggestions.** Accept Decision 1 (load-dist — sounder than
source-strip for a non-bootstrap published CLI, with the loud-failure property) and
Decision 2 (the `loadConfig` injection / edge-core split). The three bug fixes are
correct real-validation guards. Fold **C1** (existsSync guard on the dist CLI so
the missing-build case fails clearly) — it directly upholds the rationale for
accepting (a); carry the **type-strippable-user-config** note and **name
sanitization** into T8. Nothing needs re-review. T7 and T8 unblocked.
