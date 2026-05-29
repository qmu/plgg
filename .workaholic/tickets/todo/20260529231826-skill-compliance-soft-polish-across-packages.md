---
created_at: 2026-05-29T23:18:26+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Skill-compliance soft polish across packages (no behavior change)

## Overview

The `plgg-coding-style` review found the six non-foundry/non-kit packages
(plgg-server, plgg-router, plgg-view, plgg-fetch, plgg-sql, example) have **zero
hard-rule violations** but a consistent set of small style/idiom drifts. This
ticket sweeps those soft findings so the whole repo matches the skill it now
ships. **No behavior or API change** — every edit is idiom conformance; each
package's existing tests must stay green.

Recurring themes: (a) `__tag ===` ternary folds where `match` + `$` matchers
belong, (b) raw nullable handling (`??` / `|| ""` / `=== undefined`) where
`fromNullable` + `matchOption` belong, (c) legitimate imperative seams missing
the "why imperative" comment the skill mandates.

## Findings by package (each cites file:line + the fix)

### plgg-server
- `src/Http/model/HttpError.ts:128-155` — `httpErrorToResponse` folds the union
  with an 8-deep `error.__tag === "…"` ternary **despite this file exporting the
  matching `$` matchers** (`notFound$`…`internalError$`). Rewrite as
  `match(error)([notFound$(), …], …)` with an explicit `HttpResponse` return
  type. (Highest-value soft fix.)
- `src/Routing/usecase/compileRoutes.ts:196` — `cache.get(routes) ?? remember(…)`
  → `pipe(fromNullable(cache.get(routes)), matchOption(() => remember(…), (t: RouteTable) => t))` (keeps the build lazy). The package's own `serve.ts` JSDoc disclaims `??`.
- `src/Http/model/Method.ts:26-31` — `plgg` import sits mid-file (below the type
  + `METHODS`); hoist it to the top so the type→guard→caster triad reads
  uninterrupted (cf. `HttpStatus.ts`).

### plgg-view
- `src/Vnode/model/VNode.ts` — the `Element`/`Text`/`Fragment` variants have **no
  named constructors and no `$` matchers**; they're built with inline
  `box("…")({…})` in `normalizeChild` (:93-95) and `jsx.ts` (:82-88). Add
  `text`/`element`/`fragment` constructors and `element$`/`text$`/`fragment$`
  matchers, and call the constructors instead of inline `box`.
- `src/Vnode/usecase/fold.ts:30-38` — `foldVNode` discriminates by raw
  `node.__tag === "…"` ternary + `node.content.*` poking and is **not
  exhaustiveness-checked** (a 4th variant would silently hit `element`). Rewrite
  as a single annotated `match(node)([element$(), …], [text$(), …], [fragment$(), …])`.
  (Depends on the constructors/matchers above.)

### plgg-fetch
- `src/Http/model/ClientError.ts:45-48` — `isNetworkError` hand-rolls
  `error.__tag === "NetworkError"` → `isBoxWithTag("NetworkError")(error)` (the
  canonical guard primitive). Also confirm the guard is actually consumed; if
  only `networkError$` is used at call sites, drop the redundant guard.
- `src/Http/usecase/seam.ts:41-49` — `withQuery` mutates `url.searchParams` via a
  comma-operator side effect with no seam comment → build the URL immutably, or
  keep the mutation but add a one-line "native URLSearchParams is imperative"
  comment (mirroring `findAnchor`).
- `src/Http/usecase/seam.ts:55-67` — `toRequestInit` duplicates the
  `{ method, headers: new Headers(…) }` literal in both ternary branches (double
  `Headers` construction) → compute the base once, spread the conditional `body`.

### plgg-router (exemplar — polish only)
- `src/Routing/usecase/client.ts:176-251` — `start`/`push`/`replace` are
  legitimate History/DOM seams but, unlike `findAnchor`, lack the "why
  imperative" comment the skill requires; add a one-line rationale.
- `src/Routing/usecase/client.ts:137-169` — `navTarget` opens with a 7-condition
  `if (…) return none()` block → extract an `isPlainLeftClick(e)` predicate and
  fold to a single `isPlainLeftClick(event) ? pipe(…) : none()` expression.
- `src/Routing/model/Location.ts:23-24` — `makeLocation` defaults `params`/`query`
  to fresh mutable `{}` literals; if an empty-`Dict` constructor exists, use it
  (otherwise leave — a defensible seed default).

### plgg-sql
- `src/Db/model/Db.ts` — `ExecResult` crosses the driver boundary but has no
  `asExecResult` caster (rows get `decodeRows(asRow)`; `run()`'s result does
  not). Add `asExecResult` and decode the DML result at the boundary for
  symmetry. (`SqlError extends BaseError` is idiomatic — leave it.)
- `src/Db/model/Db.ts:36` — for parity with `InvalidError`, optionally add a
  `get __tag(): "SqlError"` + export `sqlError$ = () => pattern("SqlError")()` so
  `SqlError` can be folded with `match` instead of only `instanceof` (low
  priority — `instanceof` is accepted narrowing).

### example
- `src/controller/app.ts:168` and `:262-291` — raw `todos[0] === undefined`
  indexed-access checks → `pipe(fromNullable(todos[0]), matchOption(…))` (the
  `/todos/:id` SSR block and the `fetchTodoById` fold).
- `src/controller/app.ts:111-128` — `toWireTodo` uses a `{ }` block + `const base`
  → single returned `pipe(todo.completedAt, matchOption(…))` expression (or keep
  `base` if the duplication is judged worse).
- `src/controller/app.ts:308,317,199` — annotate the `proc` callback params
  (`(newTodo: NewTodo)`, `(body: TodoPatch)`, `(result: ExecResult)`) for
  consistency with their annotated neighbours.
- `src/client.tsx` `wire` (:257-285) — add the "irreducible DOM-event seam"
  comment, and fold the `id === undefined` guard through `fromNullable`/`mapOption`.
- `src/models/Todo.ts:21,26` — annotate `asId`/`asTitle` return types
  (`: Result<Id, InvalidError>`) for symmetry with the other casters.

## Key Files

All listed above. The plgg-view constructor/matcher addition + `foldVNode`
rewrite is the only change with real reach (a core view primitive); everything
else is local and behavior-preserving.

## Implementation Steps

1. Work package-by-package in this order: plgg-server, plgg-fetch, plgg-sql,
   plgg-router, example, plgg-view (view last — it's the most invasive). After
   each package, run its `scripts/tsc-<pkg>.sh` + `scripts/test-<pkg>.sh` green
   before moving on.
2. For plgg-view, add the constructors + `$` matchers first, then rewrite
   `foldVNode` as `match`, then update `normalizeChild`/`jsx.ts` to use the
   constructors; run the view specs (the fold + jsx specs must stay green).
3. Confirm no behavior change: the full `scripts/check-all.sh` must be green
   end-to-end (all suites + example), and `git grep` for escape hatches stays
   clean. plgg coverage unaffected (core untouched).

## Considerations

- **No behavior change is the contract.** Every edit is idiom conformance —
  `match`-folds must produce identical responses, `fromNullable` folds identical
  values. Lean on the existing specs as the regression net; add a spec only if a
  rewrite (e.g. `foldVNode`) leaves a branch uncovered.
- **plgg-router is already the exemplar** — its three items are genuinely
  optional polish (seam comments + one expression refactor). Don't over-engineer
  it; a reviewer could reasonably skip the `makeLocation` nit.
- **`foldVNode` is load-bearing** — every renderer (SSR string + CSR DOM) folds
  through it. The `match` rewrite must stay total and keep the `<R>` generic;
  verify both `render.spec` (server) and the view fold specs pass.
- **Scope/split**: this is one cohesive "conformance polish" ticket but touches
  six packages. If the diff feels too large to review in one commit, it's
  reasonable to land plgg-view separately — note any split in the Final Report.
- This is **soft** work (the skill's HARD violations live in the separate
  plgg-foundry and plgg-kit tickets); prioritize accordingly if time-boxed —
  the plgg-server `match`-fold and plgg-view constructors/`foldVNode` are the
  highest-value items.

## Open Questions

- Land plgg-view in this ticket or split it to its own (its `foldVNode` rewrite
  is the riskiest change). Decide by diff size; record in Final Report.
- Drop `isNetworkError` (if unused) vs reimplement via `isBoxWithTag` — confirm
  consumers during implementation.
