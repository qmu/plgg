---
created_at: 2026-07-01T19:50:48+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort:
commit_hash:
category: Changed
depends_on:
---

# Give `defineSite` a typed author-facing argument so a `site.config` is sound before it runs

## Overview

`defineSite` (`packages/plgg-press/src/SiteConfig/model/SiteConfig.ts:242`) is
today the single **`unknown`-boundary caster**:
`defineSite(value: unknown): Result<SiteConfig, InvalidError>`. Because its
parameter is `unknown`, a config *author* gets **zero compile-time help** while
writing `site.config.ts` — the editor cannot autocomplete fields, cannot flag a
misspelled key or a wrong-typed value, and mistakes surface only at **runtime**
when the loaded module is validated. The evidence is
`packages/guide/site.config.ts`, which is forced to **hand-roll its own local
`Node` / `PackageGroup` shaping types** and helper constructors just to get any
type-checking at all before handing the assembled object to `defineSite`.

The ask: make `defineSite` take a **typed argument** — an author-facing
`SiteConfigInput` shape — so the author constructs a *sound value at authoring
time* (Vite `defineConfig`-style: full autocomplete + shape-checking in the
editor), **before the CLI runs**. `defineSite` keeps returning
`Result<SiteConfig, InvalidError>` (locked with the requester), so nothing
downstream that folds its `Result` has to change.

**The split this forces (the crux):** `defineSite` has two callers with
*different* input types, and they must not be conflated once the parameter is
typed:
- **Author path** — `guide/site.config.ts:309` `defineSite(config)`, where the
  author has (or should have) a statically-typed object.
- **Loader path** — `Config/usecase/loadConfig.ts:44` `defineSite(value)`, where
  `value` is genuinely `unknown` (a dynamically `import`ed module's `default`
  export) and MUST be runtime-validated.

A typed `defineSite(input: SiteConfigInput)` can no longer accept the loader's
`unknown`. So this ticket **separates the boundary caster from the authoring
helper**: keep the `unknown → Result<SiteConfig, InvalidError>` validator (for
`loadConfig`) under a boundary-caster name (`asSiteConfig`), and make
`defineSite` the **typed author-facing façade** over it.

**House constraints:** plgg is its own only consumer — breaking changes are fine
(this ticket *is* a breaking signature change to `defineSite`, and possibly a
rename of the internal caster). No `as`/`any`/`@ts-ignore`. `exactOptional
PropertyTypes` is on, so author-facing optionals are `key?: T` (absent), never
`key: T | undefined`. Prettier `printWidth: 50`. Coverage stays strictly > 90%.

## Scope

**In scope**
- A new exported **`SiteConfigInput`** type (and the nested `*Input` types it
  needs — at least `SidebarItemInput`/`SidebarGroupInput`, `HomeConfigInput`,
  and the small `NavItem`/`SocialLink`/`HomeAction`/`HomeFeature`/`DevConfig`
  author shapes) mirroring `SiteConfig` but **author-ergonomic**: plain `string`
  (not branded), `ReadonlyArray`, and **optional `?:` fields where the domain
  model uses `Option`** — specifically `home?` (domain `Option<HomeConfig>`) and
  a sidebar item's `link?` (domain `Option<SoftStr>`).
- Retype **`defineSite`** to `defineSite(input: SiteConfigInput):
  Result<SiteConfig, InvalidError>` — the typed authoring façade. Authors now
  get autocomplete/shape-checking; the return type is unchanged.
- Preserve the `unknown`-boundary validator for the loader under a boundary
  name, **`asSiteConfig(value: unknown): Result<SiteConfig, InvalidError>`**
  (the current `defineSite` body), and point `loadConfig` at it.
- Update `packages/guide/site.config.ts` to author against `SiteConfigInput`
  (and `SidebarItemInput`), **deleting its hand-rolled `Node`/`PackageGroup`
  local types** where `SiteConfigInput`'s shapes now cover them.
- Update the barrel export in `packages/plgg-press/src/index.ts` (add
  `SiteConfigInput` + the nested input types + `asSiteConfig`; keep
  `defineSite`).
- Update `packages/plgg-press/src/SiteConfig/model/SiteConfig.spec.ts` for the
  new surface (typed `defineSite` happy-path; `asSiteConfig` retains the
  `unknown`/malformed-rejection coverage the current `defineSite` tests assert,
  incl. the `{ title: 123 }` and `null` cases).

**Out of scope (note as follow-ons)**
- The **plgg-cli** ticket (`20260701184816-plgg-cli-command-line-program-wrapper-toolkit.md`)
  — a sibling change to the same plgg-press config/CLI path; this ticket does
  **not** depend on it and must not fold into it. Coordinate only so
  `cli.ts`/`loadConfig.ts` are not churned twice (see Considerations).
- Any change to how `home`/`link` are *rendered*; this is purely the authoring
  boundary.
- A total (non-`Result`) `defineSite` — the requester chose the still-validating
  `Result`-returning variant.

## Design (starting point — `/drive` may refine within these defaults)

```ts
// Author-facing shape: plain strings, ReadonlyArray, optional `?` where the
// domain uses Option. This is what the editor type-checks site.config.ts against.
export type SidebarItemInput = Readonly<{
  text: string;
  link?: string;                       // domain: Option<SoftStr>
  items: ReadonlyArray<SidebarItemInput>;
}>;

export type SiteConfigInput = Readonly<{
  title: string;
  description: string;
  base: string;
  nav: ReadonlyArray<{ text: string; link: string }>;
  sidebar: ReadonlyArray<{
    text: string;
    items: ReadonlyArray<SidebarItemInput>;
  }>;
  social: ReadonlyArray<{ icon: string; link: string }>;
  home?: HomeConfigInput;              // domain: Option<HomeConfig>
  dev: { allowedHosts: ReadonlyArray<string> };
}>;

// The unknown boundary (today's defineSite body), used by loadConfig.
export const asSiteConfig = (
  value: unknown,
): Result<SiteConfig, InvalidError> => /* cast(value, asObj, forProp(...), forOptionProp("home", ...), ...) */;

// The typed authoring façade — same validation, narrower (helpful) parameter.
export const defineSite = (
  input: SiteConfigInput,
): Result<SiteConfig, InvalidError> => asSiteConfig(input);
```

Design intents:
- `SiteConfigInput` is **structurally** close to `SiteConfig` (SoftStr *is*
  `string`); the only real deltas are the `Option` fields becoming optional `?`.
  Validation/normalization (optional → `Option` via the existing
  `forOptionProp`/`fromNullable` path) already lives in the current `defineSite`
  body — moving it to `asSiteConfig` and delegating keeps one normalization
  source of truth. (If `/drive` finds the runtime re-validation of an
  already-typed input wasteful, a total normalize is acceptable *only* if
  `defineSite`'s return type stays `Result` — do not drop the loader's
  `unknown → Result` guarantee.)
- Because `SiteConfigInput` is assignable to `unknown`, `defineSite` delegating
  to `asSiteConfig` type-checks with no `as`.

## Key Files

- `packages/plgg-press/src/SiteConfig/model/SiteConfig.ts` — the `SiteConfig`
  type + all `asX` casters + `defineSite` (`:242`); where `SiteConfigInput`,
  `asSiteConfig`, and the retyped `defineSite` land.
- `packages/plgg-press/src/SiteConfig/model/SiteConfig.spec.ts` — existing
  `defineSite` tests (valid config; rejects `{ title: 123 }`; rejects `null`)
  to re-home onto `asSiteConfig` + add the typed-`defineSite` happy path.
- `packages/plgg-press/src/Config/usecase/loadConfig.ts` — `validate` calls
  `defineSite(value)` at `:44` with an `unknown`; must switch to `asSiteConfig`.
- `packages/plgg-press/src/index.ts` — barrel; add `SiteConfigInput` (+ nested
  input types) and `asSiteConfig`, keep `defineSite`.
- `packages/guide/site.config.ts` — the author site; drop the local
  `Node`/`PackageGroup` types in favour of `SiteConfigInput`/`SidebarItemInput`;
  `export const site = defineSite(config)` at `:309` now type-checks `config`.
- `packages/plgg-press/src/Config/usecase/fixtures/invalid.config.ts` — the
  intentionally-malformed fixture (`title` a number) that `asSiteConfig` must
  still reject via the `loadConfig` path.

## Related History

- `moderation: clear` — no existing ticket covers this. Sibling in-flight ticket
  on the same package/path: `20260701184816-plgg-cli-command-line-program-wrapper-toolkit.md`
  (reimplements `plgg-press/src/cli.ts` on a new `plgg-cli`); independent of this
  change but adjacent — sequence to avoid double-churn.
- `defineSite` was introduced as the no-`as` boundary caster replacing the old
  VitePress `defineConfig` (see `guide/site.config.ts` header comment); this
  ticket restores the *authoring ergonomics* of `defineConfig` (a typed
  argument) without giving up the `unknown`-boundary validation `defineSite`
  added.

## Implementation Steps

1. In `SiteConfig.ts`, add the `*Input` types: `SidebarItemInput`,
   `SiteConfigInput`, `HomeConfigInput` (and inline the small nav/social/action/
   feature/dev author shapes or name them), each `Readonly`, plain `string`,
   `?:` for the `Option`-typed domain fields (`home`, sidebar `link`). Respect
   `exactOptionalPropertyTypes` (`key?: T`, never `| undefined`).
2. Rename the current `defineSite` body to **`asSiteConfig(value: unknown):
   Result<SiteConfig, InvalidError>`** (unchanged logic). Add the new
   **`defineSite(input: SiteConfigInput): Result<SiteConfig, InvalidError>`** as
   `asSiteConfig(input)`.
3. Point `loadConfig.ts`'s `validate` at `asSiteConfig` (was `defineSite`).
4. Update `packages/plgg-press/src/index.ts`: export `SiteConfigInput` (+ nested
   input types) and `asSiteConfig`; keep `defineSite`.
5. Rewrite `packages/guide/site.config.ts` to author against
   `SiteConfigInput`/`SidebarItemInput`, deleting the local `Node`/`PackageGroup`
   types and adjusting the `leaf`/group helpers to build the input shapes.
   Confirm `defineSite(config)` type-checks with no `as`.
6. Update `SiteConfig.spec.ts`: keep the `unknown`/malformed rejection cases on
   `asSiteConfig` (incl. `{ title: 123 }` and `null`); add a typed-`defineSite`
   happy-path test proving the author shape compiles and validates.
7. Green the gates: `scripts/tsc-plgg-press.sh`, `scripts/test-plgg-press.sh`
   (with `--coverage`), and the guide build/typecheck; then `scripts/check-all.sh`.

## Considerations / Risks

- **Two callers, two input types — do not merge them.** The whole point is that
  `loadConfig` keeps an `unknown → Result` boundary (`asSiteConfig`) while
  authors get a typed `defineSite`. A tempting "just widen `defineSite` to
  `SiteConfigInput | unknown`" defeats the type help — reject it.
- **`exactOptionalPropertyTypes`:** author optionals must be genuinely optional
  (`home?: HomeConfigInput`), and the normalization must map *absent* → `none()`
  the same way the current `forOptionProp` path does.
- **Guide parity:** `guide/site.config.ts` must still validate to the *same*
  `SiteConfig` values it does today (the deploy `base`/`DOCS_BASE` logic, the
  full sidebar tree). The rewrite is types-only ergonomics, not a data change —
  diff the produced `SiteConfig` mentally against the current output.
- **Coordinate with the plgg-cli ticket:** both touch `plgg-press`. `loadConfig`
  is edited here (one line) and *read* by the plgg-cli `cli.ts` reimplementation;
  neither changes `loadConfig`'s public signature, so order is not strictly
  forced, but landing them back-to-back avoids re-touching the same files.
- **No new deps / no escape hatches** (vendor-neutrality; the strict no-`as`
  rule). `SiteConfigInput` is a pure type addition — it must not require any
  runtime cast to bridge to `SiteConfig`.

## Quality Gate

The `/drive` approval gate is met only when **all** hold:

1. **`defineSite` is typed.** Its signature is
   `defineSite(input: SiteConfigInput): Result<SiteConfig, InvalidError>`, and
   `SiteConfigInput` (+ nested input types) is exported from the plgg-press
   barrel. Authoring `site.config.ts` yields real editor type errors on a
   misspelled key or wrong-typed field (verified by a deliberately-wrong local
   probe during dev, reverted before commit).
2. **Loader boundary intact.** `asSiteConfig(value: unknown): Result<SiteConfig,
   InvalidError>` exists and `loadConfig` uses it; the malformed-config path
   still fails (the `invalid.config.ts` fixture and the `{ title: 123 }` / `null`
   cases still reject with an `InvalidError`/`ConfigLoadError`).
3. **Guide de-duplicated and green.** `packages/guide/site.config.ts` authors
   against `SiteConfigInput`/`SidebarItemInput` with its hand-rolled
   `Node`/`PackageGroup` types removed, `defineSite(config)` type-checks with no
   `as`, and the guide build/typecheck passes producing the same `SiteConfig`.
4. **tsc + tests + coverage green, no escape hatches.**
   `scripts/tsc-plgg-press.sh` and `scripts/test-plgg-press.sh --coverage` pass;
   plgg-press coverage stays strictly > 90%; zero `as`/`any`/`@ts-ignore`; zero
   new dependencies; `scripts/check-all.sh` is green.

**Edge cases the tests must cover:** a valid typed config → `ok(SiteConfig)`
with `home` present *and* absent (→ `some`/`none`); a sidebar item with and
without `link` (→ `some`/`none`); and the loader path on a malformed `unknown`
(number `title`, `null`) → `Err`.
