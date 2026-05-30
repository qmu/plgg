# plgg coding style — reference

Extended catalog for [SKILL.md](SKILL.md): the combinator cheat-sheet, fuller
before/after examples, and a map of exemplar files to read when matching the
house style.

## The plgg combinator cheat-sheet

Reach for the right tool; don't reinvent control flow with statements.

| Concern | Use | Not |
|---|---|---|
| Absence of a value | `Option<T>` — `some`/`none`, `fromNullable`, `getOr`, `mapOption`, `chainOption`, `matchOption` | `null` / `undefined`, `?.`, `??` |
| Fallible computation | `Result<T, E>` — `ok`/`err`, `mapResult`, `chainResult`, `mapErr`, `matchResult` | `throw` / `try`/`catch` |
| Sync value threading | `pipe(value, f, g, …)` | nested calls / temp `const`s |
| Sync validation pipeline | `cast(v, asObj, forProp(…), refine(…))` | hand-rolled `if` checks |
| Async pipeline (error = `Error`) | `proc(seed, f, g, …)` then `.then(mapErr(toEdgeError))` | `async`/`await` with `try`/`catch` |
| Point-free function build | `flow(f, g)` | inline lambdas wrapping calls |
| Exhaustive variant handling | `match(x)([tag$(), fn], …)`, `matchOption`, `matchResult` | `switch` on `__tag`, `if`-chains |
| Lift a throwing API | `tryCatch(fn)(arg)` → `Result` | bare `try`/`catch` |
| Narrow `unknown` | `instanceof`, `isX` guard, `asX` caster, annotate the lambda param | `as`, `any`, `@ts-ignore` |

`proc` vs `pipe+matchResult`: `proc`'s error channel is fixed to `Error`. Server
chains (SqlError/InvalidError fold to `Error` then to `HttpError`) use `proc`.
plgg-fetch returns a `ClientError` Box union (not an `Error`), so client code
uses `pipe(await get(url), matchResult(onErr, onOk))`.

## Type-first triad — the full pattern

From `packages/plgg/src/Basics/Str.ts`:

```ts
export type Str = Box<"Str", string>;          // the type leads

const qualify = (v: unknown): v is string =>   // shared predicate
  isSoftStr(v) && v.length > 0;
const is = (v: unknown): v is Str =>           // guard
  isBoxWithTag("Str")(v) && qualify(v.content);

export const strRefinable: Refinable<Str> = { is };
export const { is: isStr } = strRefinable;     // exported guard

export const asStr = (                          // caster: Result, never throws
  v: unknown,
): Result<Str, InvalidError> =>
  is(v)
    ? ok(v)
    : qualify(v)
      ? ok(box("Str")(v))
      : err(new InvalidError({ message: "Value is not a Str …" }));

export const strCastable: Castable<Str> = { as: asStr };
```

Every consumer either gets a `Str` it can trust (already built) or decodes one
through `asStr` at the boundary — there is no third path.

## Box-union variants with `$` matchers

From `packages/plgg-server/src/Http/model/HttpError.ts` (shape):

```ts
export type HttpError =
  | Box<"NotFound", { path: SoftStr }>
  | Box<"MethodNotAllowed", { allowed: ReadonlyArray<Method> }>
  | Box<"BadRequest", { message: SoftStr }>;
// …one constructor per variant…
export const notFound = (path: SoftStr): HttpError =>
  box("NotFound")({ path });
// …and a `$`-suffixed matcher for `match`:
export const notFound$ = () => pattern("NotFound")();
```

Fold them exhaustively with `match(err)([notFound$(), (e) => …], …)` — never a
`switch (err.__tag)`.

## Expression-only files (the norm)

`packages/plgg-router/src/Routing/usecase/resolve.ts` is a single `reduce`;
`matchSegments.ts` is a single `pipe`/`reduce` with `chainOption`;
`compilePattern.ts` is a single `map` with a ternary. Read these three before
writing a new usecase — they set the bar for "no statements."

The rare justified exception — `client.ts`'s `findAnchor` DOM parent-walk — uses
`let`/`while` because the DOM API is imperative, narrows with `instanceof` (no
cast), and carries a comment. That is the only shape of `let`/loop that belongs
in new code.

## Decode-at-boundary + single edge fold

`packages/example/src/controller/app.ts`: each route is a `proc` chain
(parse → validate → SQL → decode → respond) with exactly one
`.then(mapErr(toHttpError))` at the edge that folds `SqlError` / `InvalidError` /
a domain `RowNotFoundError` into the shared `HttpError` vocabulary. Don't map
errors to status codes in the middle of a handler.

Wire-shape invariant: a `Todo`'s `completedAt: Option<Time>` is **omitted** from
JSON when `None` (the server's `compactRow` strips it; `forOptionProp` only
decodes an absent key to `None`, and rejects a present `null`).

## Exemplar map

| Convention | Read |
|---|---|
| Type+constructor+caster, typeclass instances | `packages/plgg/src/Basics/Str.ts`, `packages/plgg/src/Contextuals/Box.ts` |
| Expression-only usecases | `packages/plgg-router/src/Routing/usecase/{compilePattern,matchSegments,resolve}.ts` |
| Box-union model + data-last builders | `packages/plgg-router/src/Routing/model/{Segment,Router}.ts`, `packages/plgg-server/src/Routing/model/Web.ts` |
| Box-union error vocabulary + `$` matchers | `packages/plgg-server/src/Http/model/HttpError.ts` |
| `cast`/`forProp`/`forOptionProp` decoding | `packages/example/src/models/Todo.ts` |
| `proc` chain + single `mapErr` edge | `packages/example/src/controller/app.ts` |
| Justified imperative seam (instanceof, no cast) | `packages/plgg-router/src/Routing/usecase/client.ts` (`findAnchor`) |
| Colocated Minimum Test Harness | any `*.spec.ts(x)` beside its source, e.g. `…/usecase/resolve.spec.ts` |

## Layout orientation (structure, not style)

For where files go — `model/` (Box-union types + constructors) vs `usecase/`
(pure functions), `index.ts` barrels with `export *`, package-alias imports
(`plgg-router/Routing/model/Segment`), the strict tsconfig flag set, and the
vite lib + dts scaffolding — see `.workaholic/constraints/architecture.md` and an
existing package. Those are repo-structure rules; this skill governs how the code
*inside* those files is written.
