---
created_at: 2026-07-01T01:33:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 0.5h
commit_hash: ae6eb00
category: Changed
depends_on:
---

# Tighten non-empty domain strings: `SoftStr` / bare `string` → `Str`

## Overview

`SoftStr` is the bare-string primitive, named verbosely **on purpose to
discourage use**; the branded non-empty `Str` (`Box<"Str", string>`,
`packages/plgg/src/Basics/Str.ts`) is the house default. Yet a monorepo-wide
sweep (15 packages, 212 findings) shows the domain model overwhelmingly reaches
no further than `SoftStr` or bare `string`: **~115 sites** across 14 packages
type a value as `SoftStr`/`string` when it is **non-empty by construction** —
URLs, filesystem paths, routes/hrefs, authored config labels, model ids / API
keys, identifiers, link targets, lookup-key parameter names. This is the single
dominant axis of the repo's loose-type debt.

Because plgg is **its own only consumer**, this repository is the
*self-evidential reference* of the plgg style — so the gap between "we tell
people to prefer `Str`" and "our own domain model is `SoftStr` end-to-end" is
exactly the credibility hole this ticket closes. Upgrading each field to `Str`
rejects the empty-string case at the type boundary and threads the brand through
the call graph, forcing construction to go through `asStr`/`isStr` at the real
input edge instead of trusting a bare `string`.

This is the largest of the five "by major definition" refinement tickets. It is
too big to land atomically (~115 sites); the **Implementation Steps** define an
ordered, per-package rollout so `/drive` can commit one package at a time behind
the single approval gate. Sibling tickets:
`[20260701013301-brand-case-shaped-strings-kebabcase.md]` (the case-shaped
subset, depends on this), and the number-axis trio
`[20260701013302-refine-number-to-int-ids-counts.md]`,
`[20260701013303-refine-number-to-sized-uint-resource-quantities.md]`,
`[20260701013304-refine-opacity-number-to-float.md]` (independent, may run in
parallel). Moderation: **clear** (no overlapping todo/icebox ticket).

## Scope (this ticket)

In scope: domain-model string **fields, parameters, and return types** that are
non-empty by construction, monorepo-wide, refined `SoftStr`/`string` → `Str`.

Explicitly **out of scope** (the sweep flagged these as deliberate / unsafe —
do **not** tighten them):

- Error-message fields across the Box error vocabulary (`PlggError`/`Cause`/
  `Defect`/`InvalidError`/`SerializeError` messages, `PressError` :19/:48,
  `plgg-sql` `Db.ts:58`, `CheckLinks` `reason` :43) — intentionally `SoftStr`
  so JSON snapshots survive.
- `SqlValue`'s `SoftStr | Num | Bool` bind-parameter union and `*.text` SQL-body
  fields (arbitrary developer SQL; `Migration.up`/`down` legitimately empty).
- Genuinely empty-capable values: `plgg-view` attribute **values**, the base
  `""` selector, empty text nodes, joined class list, search query; `plgg-router`
  query-param **values** and the search/path **input** params; `plgg-md`
  `slugify` return (all-special heading → empty); `plgg-router` `Location` params
  Dict **value** (wildcard remainder).
- The case-shaped subset (opcodes, CSS classes/props) — those go to `KebabCase`
  in `[20260701013301-brand-case-shaped-strings-kebabcase.md]`, not here.
- `plgg`'s own Atomics/Basics primitive definitions and generic combinator
  internals (`atProp`/`atIndex` keys, `Vec`/`Obj` plumbing) — not domain leaks.

## Key Files (per-package hotspots, in rollout order)

1. **plgg (the reference seed — lead here):**
   - `packages/plgg/src/Functionals/postJson.ts:12` — request `url: string` → `Str`.
   - `packages/plgg/src/Functionals/env.ts` — `env()` variable **name** (bare
     `string`) → `Str` (non-empty key). These two IO combinators are the only
     genuine domain leaks in plgg; fixing them first makes the reference itself
     exemplary before the brand ripples outward.
2. **plgg-press (biggest payoff, ~32 sites):** the `SiteConfig` IA contract
   (nav/sidebar/social/home entries + `title`/`description`/`base`), the
   `PressOptions`/`BuildReport`/`DevServer` pipeline I/O, the `CheckLinks` model
   (routes, slugs, hrefs), and the central resolver
   `packages/plgg-press/src/Href/usecase/href.ts:73`
   (`href(base: SoftStr)(path: SoftStr): SoftStr` → `Str` throughout).
3. **plgg-http:** `packages/plgg-http/src/Http/model/HttpRequest.ts:21`
   `path: SoftStr` → `Str` (a path is always ≥ `"/"`); matched path-param values;
   `NotFound` error `path`; redirect `Location` header.
4. **plgg-fetch:** `packages/plgg-fetch/src/Http/usecase/request.ts:79` request
   `url: SoftStr` → `Str` across every verb (get/post/put/patch/del) and the
   internal `HttpRequest` builder. (headers/query Dict **keys** — lower-confidence,
   include only if clean.)
5. **plgg-md:** `packages/plgg-md/src/Block/model/Block.ts:96` `CodeFence.lang:
   Option<SoftStr>` → `Option<Str>` (Some-branch built only when non-empty);
   `Callout.title` (same), link/image URL targets, layout name. (`Callout.kind`
   is case-shaped → KebabCase ticket.)
6. **plgg-router:** path segments produced after empty-filtering, route literals,
   parameter **names**, the pathname (≥ `"/"`) — `SoftStr` → `Str`.
7. **plgg-server:** route patterns, URL paths, output dirs, segment/param names,
   page titles, script `src`s in the routing/SSG/view layers → `Str` (re-exported
   plgg-http model types are out of this package's scope).
8. **plgg-kit:** `packages/plgg-kit/src/LLMs/model/Provider.ts:27` `model: string`
   → `Str`; `apiKey: Option<string>` → `Option<Str>`; the `Config` Obj decodes
   both via `asSoftStr` → switch to `asStr`. (`systemPrompt`/`instructions` stay
   `SoftStr` — may be empty.)
9. **plgg-view:** the always-non-empty subset only — content-hashed CSS
   `className`, URL `pathname`, reconciliation `key`, DOM event/attribute **names**
   (some of these are case-shaped → KebabCase ticket; tighten the rest to `Str`).
10. **example:** `Todo.title` (length-guarded before insert), `Toast.message` /
    `pushToast` (always built from non-empty literals), `server.ts` content-hash
    token → `Str`. (`Model.draft`/`Model.q`, search/draft `Msg` values,
    `Query.q` stay `SoftStr`.)
11. **plgg-db-migration:** the two filesystem paths (`migrationsDir`, tenant db
    path) and the migration human `name` → `Str` (`appliedAt` raw timestamp and
    SQL bodies stay loose — see Scope).
12. **plgg-highlight:** language-alias map **keys** that are non-empty (the
    `tok-*` class output is case-shaped → KebabCase ticket).

## Implementation Steps

1. **plgg seed first.** Refine `postJson` url and `env` name to `Str`; route their
   construction through `asStr` at the boundary. Update specs. Land + commit. This
   establishes the pattern the rest copy.
2. **Roll out package-by-package in the order above**, one commit per package.
   For each field: change the type to `Str` (or `Option<Str>`), then follow the
   compiler — every producer must construct via `asStr`/`box("Str")` at the true
   input edge (config decode, request entry, parse constructor), and every
   consumer that needs the raw string unwraps `.content`. Push the cast to the
   edge; do not sprinkle `asStr` mid-pipeline.
3. **No escape hatches.** Where a value is provably non-empty by an existing guard
   (e.g. press `title` from required config, md Some-branch), construct `Str` via
   the validated path — never `as`/`any`/`ts-ignore` to bridge the brand.
4. **Per package:** `scripts/tsc-plgg.sh` clean and `scripts/test-plgg.sh` green
   before moving on, so a regression is isolated to one package's commit.
5. **Add a boundary-tightening spec** in at least the seed (plgg) and the densest
   consumer (plgg-press): assert the refined constructor/`asStr` path **rejects**
   `""` (a value the old `SoftStr` field silently accepted), proving the boundary
   actually tightened rather than merely renamed.
6. **Final sweep:** re-run the loose-type grep over the in-scope fields; the
   `SoftStr`/bare-`string` domain-field count must **drop**, with the only
   remaining `SoftStr` being the Scope-excluded deliberate cases.

## Considerations

- **Push casts to the edge.** The win is a *narrow* validation boundary, not
  `asStr` scattered through pipelines. Decode config / parse input / accept a
  request once at the edge; carry `Str` thereafter.
- **`Option<Str>` vs `Str`.** Several md/kit fields are `Option<SoftStr>` whose
  `Some` is only built when non-empty — model them `Option<Str>`, not `Str`, so
  the absence case stays explicit.
- **Breaking changes are fine** (plgg is its own only consumer) — prefer the best
  branded signature over source compatibility; just keep each package's commit
  self-consistent.
- **Don't over-reach.** Re-read the Scope exclusions before each package; the
  sweep deliberately left empty-capable and free-text fields loose. Tightening
  one of those would be a *correctness regression*, not an improvement.
- **Large ticket discipline.** Treat each package as an independent milestone; the
  single approval gate covers the plan, but commits are per-package so review and
  rollback stay tractable.
- **Tooling:** typecheck `scripts/tsc-plgg.sh`, test `scripts/test-plgg.sh` (keep
  the >90% coverage gate intact). Prettier `printWidth: 50` — write narrow.

## Quality Gate

The `/drive` approval gate for **each package milestone** requires **all** of:

1. **tsc + tests green:** `scripts/tsc-plgg.sh` clean and `scripts/test-plgg.sh`
   passing, with the >90% statements/branches/functions/lines coverage thresholds
   intact (no threshold lowered to absorb the change).
2. **No new escape hatches:** zero `as` / `any` / `ts-ignore` introduced; every
   `SoftStr`→`Str` bridge goes through `asStr`/`isStr`/`box("Str")` at a real
   boundary.
3. **Boundary actually tightened:** a runnable spec (≥ plgg seed + plgg-press)
   shows the refined type **rejects** an empty/blank string that the prior
   `SoftStr` field accepted.
4. **Loose-type count drops:** a grep over the package's in-scope domain fields
   shows fewer `SoftStr`/bare-`string` declarations than before — the change
   removes debt, it does not move it sideways. Any field left loose must match a
   documented Scope exclusion.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — prefer branded
  `Str` over `SoftStr`; **no** `as`/`any`/`ts-ignore` (CLAUDE.md top rule);
  Option/Result; validate at boundaries.
- `workaholic:implementation` / `policies/type-driven-design.md` — move the
  non-emptiness check from runtime trust to a type boundary so domain reasoning
  gaps fail at compile time.
- `workaholic:implementation` / `policies/directory-structure.md` — refinement
  lands in each package's existing `model/` + `usecase/` role files; no new
  structure.

## Final Report (resolved under principle (a): brand boundaries, not author-facing inputs)

The author's decision — *利用者が書く引数をブランド化 shouldn't be too strict* — supersedes this ticket's original premise (branding ~115 domain string fields to `Str`).

**Empirical evidence (why (a) is right here):** the plgg seed was attempted first — `postJson.url` and `env` key → `Str` — and it immediately rippled `box("Str")("literal")` into ~10 files: every developer-typed literal (`env("OPENAI_API_KEY")`, endpoint URLs) got a **no-op box** that validates nothing (a compile-time literal is self-evidently non-empty), only adding friction. That seed was **reverted** (`9920ef2`).

**Applying (a) to the ticket's key files:**
- `plgg-fetch` request `url`, LLM endpoint URLs, `env` keys — **developer-written literals** → stay `SoftStr`/`string`.
- `plgg-press` `SiteConfig` fields — **author config**; the author already writes plain strings via `SiteConfigInput` (ticket 195048), and the values are validated at the `asSiteConfig` caster. Branding the internal `SiteConfig` type to `Str` would ripple `.content` across the whole theme for a non-emptiness guarantee the caster already provides.
- `HttpRequest.path`, router segments, parsed md URLs — **already validated** at their decode casters (`asSoftStr`/`cast`) and non-empty by construction; a `Str` re-brand is a wide `.content` ripple for marginal gain.

**Conclusion:** under (a), no new `Str` branding is warranted — author-facing strings stay plain, and the genuine untrusted-string boundaries already validate through existing casters. The `Str`/`asStr` primitive remains the right tool *when a new untrusted non-empty string enters the system*; this ticket's blanket domain-wide sweep is superseded. Same reasoning applies to the dependent case-shaped ticket (013301).

Verification: seed revert green (plgg 483, plgg-kit 12). No code branded; `env`/`postJson` remain plain `string`.
