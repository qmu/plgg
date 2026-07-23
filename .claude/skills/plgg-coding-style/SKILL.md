---
name: plgg-coding-style
description: House coding style for the plgg monorepo. Use when writing or editing any TypeScript under packages/ (plgg, plgg-server, plgg-router, plgg-view, plgg-fetch, plgg-sql, example) — type-driven design, expression-style data-last pipelines (pipe/cast/proc/flow), Option not null, Result not throw, exhaustive match, the strict no-as/any/ts-ignore rule, and Prettier printWidth 50.
---

# plgg coding style

How code is written in this repo. A concrete distillation of
`standards:leading-validity` and `CLAUDE.md` — when in doubt, open an exemplar
(`packages/plgg-router/src/Routing/usecase/*.ts` is almost pure expression-style)
and match it. Longer catalog in [reference.md](reference.md).

## Hard rules (non-negotiable)

1. **No `as` / `any` / `@ts-ignore` / `@ts-expect-error`** to silence a type
   error — ever (CLAUDE.md). Narrow with `instanceof`, an `isX` guard, or an
   `asX` caster instead.
2. **No `null` / `undefined` in domain code** — absence is `Option<T>`.
3. **No `throw` in domain code** — failure is `Result<T, E>`.
4. **No classes, no methods on data, no method-chaining builders** — pure data
   plus standalone data-last functions composed through `pipe`.
5. **Close the loop before done**: `scripts/tsc-plgg.sh` (clean) +
   `scripts/test-plgg.sh` (green). After editing `packages/plgg/src`, rebuild
   (`npm run build` in the package) or dependents won't see new exports.

## Define the type first

Type alias → constructor → `asX` caster. Values are built/decoded through named
functions, never ad-hoc literals at call sites.

```ts
export type Str = Box<"Str", string>;                  // 1. the type
export const { is: isStr } = strRefinable;             // 2. a guard
export const asStr = (                                 // 3. a caster
  v: unknown,
): Result<Str, InvalidError> =>
  is(v)
    ? ok(v)
    : qualify(v)
      ? ok(box("Str")(v))
      : err(new InvalidError({ message: "…" }));
```

- Sum/variant and nominal-scalar types are `Box<TAG, CONTENT>` unions: one
  constructor per variant, a `$`-suffixed matcher where folded by `match`
  (`notFound$`). Prefer `Box<"Name", primitive>` for new nominal scalars.
- Object shapes: `Obj<{…}>` (decodable) or `Readonly<{…}>` (immutable plain data).
- A caster is required for anything crossing a boundary (DB / HTTP / JSON);
  internal helper aliases (`type Captured = Dict<…>`) may skip it.

## Fewer statements, less block scope

A function is ideally **one returned expression** — ternary, `pipe`, `reduce`,
`match*`. Avoid `let`, intermediate assignments, and `{ }` blocks.

```ts
// good — the whole function is one expression
export const compilePattern = (
  pattern: SoftStr,
): ReadonlyArray<Segment> =>
  splitPath(pattern).map((raw) =>
    raw === "*"
      ? wildcardSegment("*")
      : raw.startsWith("*")
        ? wildcardSegment(raw.slice(1))
        : raw.startsWith(":")
          ? paramSegment(raw.slice(1))
          : staticSegment(raw),
  );
```

`let` / `for` / `while` / blocks are allowed **only** at an irreducible
imperative seam (DOM walk, byte buffer), with a comment saying why:

```ts
// DOM parent-walk: narrow with instanceof, never cast
let el: Element | null =
  target instanceof Element ? target : null;
while (el !== null) {
  if (el instanceof HTMLAnchorElement) return some(el);
  el = el.parentElement;
}
```

## Data-last, composed with pipe

Operators take config first and return `(data) => result`. Builders are a seed
function plus data-last `T => T` transformers — no method chaining.

```ts
const app = pipe(
  router(),
  get("/", home),
  get("/users/:id", showUser),
  route("/admin", admin),
);
```

## Option, not null

```ts
// reach into the world, then eliminate with a combinator —
// never `x ?? d` or `if (x == null)`
pipe(
  fromNullable(parts[i]), // noUncheckedIndexedAccess ⇒ wrap indexed reads
  matchOption(
    () => none(),
    (p: SoftStr) => some(p),
  ),
);
pipe(loc, param("id"), getOr("?"));
```

On the JSON wire a `None` field is **omitted**, never `null` (`forOptionProp`
fails on a present `null`).

## Result, not throw

```ts
// sync validation: cast + forProp / refine
export const asTodo = (
  v: unknown,
): Result<Todo, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("id", asId),
    forProp("title", asTitle),
    forOptionProp("completedAt", asTime),
  );

// async server chain: proc, with ONE mapErr at the edge
get("/users/:id", (c) =>
  proc(
    c,
    param("id"),
    findUser,
    (u: User) => ok(jsonResponse(u)),
  ).then(mapErr(toHttpError)),
);
```

- Lift a throwing API with `tryCatch`, never a raw `try/catch` in domain code.
- `proc`'s error channel is fixed to `Error`, so client-side plgg-fetch code
  uses `pipe(await get(url), matchResult(onErr, onOk))`, not `proc`.

## Narrowing without escape hatches

When `pipe` inference yields `unknown`, **annotate the callback param** — an
annotation is not a cast:

```ts
pipe(
  findAnchor(target),
  chainOption((a: HTMLAnchorElement) => fromNullable(a.getAttribute("href"))),
);
```

`match*` needs an explicit return type and param annotations on **both** branches.

Prefer one annotation at the boundary — a function's return type — and let
contextual typing carry it inward, over repeating a generic at every call site.
Keep a local hint only where inference can't unify (e.g. one call mixing several
type-param variants across its own arguments).

## Naming & docs

`asX` caster · `isX` guard · `makeX` / lowercase-noun constructor (`box`, `web`,
`router`) · `X$` matcher · `xRefinable` / `xCastable` typeclass instances. JSDoc
blocks explain the *why*, not the signature.

## Formatting

Prettier `printWidth: 50`, `semi: true`, double quotes, `trailingComma: "all"`.
Don't fight the narrow wrap — expect tall, shallow files (one argument /
type-param per line); don't hand-pack onto fewer lines.

## Testing

One concise colocated `*.spec.ts(x)` per public function (args-in → values-out),
real components over mocks. ≥90% coverage is the natural outcome of writing
small pure functions, not a separate chore.

## Do NOT emulate

- A few plgg-core seams use escape hatches by necessity (`Functionals/tryCatch.ts`,
  `Abstracts/Principals/Kind.ts` HKT `@ts-ignore`, `Grammaticals/NonNeverFn.ts`
  `any[]`). They are **grandfathered exceptions** — don't add new ones, don't
  cite them as precedent.

## See also (authority — follow, don't duplicate)

- `standards:leading-validity` — the canonical lens (type-driven design,
  functional style, Minimum Test Harness, Ubiquitous Language).
- `CLAUDE.md` — the `as`/`any`/`ts-ignore` rule and the tsc/test loop.
- `.workaholic/constraints/quality.md`, `.workaholic/constraints/architecture.md`,
  `.workaholic/terms/core-concepts.md` — type-escape prohibition, strict flags,
  dependency direction, plgg idioms. (Repo-**structure** rules — dependency
  direction, the root `index.ts` export convention, the category taxonomy — live
  there, not in this coding-style skill.)
- [reference.md](reference.md) — exemplar map and fuller before/after examples.
