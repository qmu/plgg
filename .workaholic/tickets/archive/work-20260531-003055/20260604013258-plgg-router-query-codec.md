---
created_at: 2026-06-04T01:32:58+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 1h
commit_hash: 754aa75
category: Added
depends_on:
---

# plgg-router: bidirectional typed query codec (serializeQuery + QueryCodec)

## Overview

plgg-router can read a query string but not write one, and everything it reads is
stringly-typed (`Dict<string, SoftStr>`). This ticket adds the two pieces nuqs
gives you on the **pure** side, so a query string and a typed value become a
lawful round-trip:

1. **`serializeQuery(query): SoftStr`** — the canonical inverse of `parseQuery`.
2. **`QueryCodec<T>`** — a typed `{ decode: Dict → T; encode: T → Dict }` built
   from per-field codecs (`queryInt`/`queryStr`/`queryBool`/`queryEnum`/
   `queryList`) with **defaults that round-trip and are omitted on encode** (a
   field equal to its default is not written → clean URLs; a missing key decodes
   back to the default). This is nuqs's `parseAsX` + default behavior, as pure
   data-last plgg code.

Both are pure, SSR-safe, and depend only on `plgg` — independently useful for SSR
link generation and plgg-server, and the foundation the plgg-view reflection seam
(follow-up ticket) composes into a `toUrl`. This is the **model→URL projection**
half: the URL is a pure projection of state, like the DOM (see depends-on ticket).

## Key Files

- `packages/plgg-router/src/Routing/usecase/parseQuery.ts` — the function
  `serializeQuery` must invert. Note its `Dict<string, SoftStr>` shape and the
  `safeDecode` (`tryCatch(decodeURIComponent) → toOption → getOr(raw)`)
  tolerance; encode mirrors with `encodeURIComponent` (no `tryCatch` needed to
  encode).
- `packages/plgg-router/src/Routing/usecase/serializeQuery.ts` — **new**. The
  canonical inverse.
- `packages/plgg-router/src/Routing/usecase/queryCodec.ts` — **new**. `QueryCodec<T>`
  + the field-codec builders. (If a `QueryCodec`/`FieldCodec` *type* reads better
  in `model/`, add `Routing/model/QueryCodec.ts` and keep the builders in usecase
  — follow the `Segment` model/usecase split.)
- `packages/plgg-router/src/Routing/usecase/index.ts` — barrel; add
  `export * from ".../serializeQuery"` and `".../queryCodec"`. Surfaces publicly
  through `Routing/index.ts` → `src/index.ts` automatically.
- `packages/plgg-router/src/Routing/model/Location.ts` — `Location.query` is the
  `Dict<string, SoftStr>` both `decode` consumes and `encode`/`serializeQuery`
  produce.
- `packages/plgg/src/Atomics/Int.ts`, `Bool.ts`, `Num.ts`,
  `packages/plgg/src/Basics/Str.ts`, `Atomics/SoftStr.ts` — the existing casters.
  **Critical**: `asInt`/`asBool`/`asNum` **refine** already-typed values
  (`asInt` rejects the string `"3"` — its guard checks `number`/`bigint`). So a
  field codec must do its **own** string→value parse (`Number(token)`,
  `token === "true"`) and may then validate the parsed value through the caster.
  Do not expect `asInt("3")` to work.
- `packages/plgg/src/Flowables/cast.ts`, `Abstracts/Servables/Castable.ts` — the
  `Result`-based `cast`/`Castable<T>` vocabulary to thread token→parsed→validated.
- `packages/plgg/src/Conjunctives/Dict.ts` — `Dict<T,U>`; built via object-literal
  / reduce-spread (no constructor), as `parseQuery` does.
- `packages/plgg-router/src/Routing/usecase/parseQuery.spec.ts` — test style to
  mirror (plain vitest, `toEqual` on Dicts, round-trip + edge cases).

## Related History

Net-new on top of shipped scaffolding; no prior ticket proposes the inverse codec
or field codecs, and the todo/icebox queues are empty.

- [20260529003601-add-plgg-router.md](.workaholic/tickets/archive/work-20260528-143038/20260529003601-add-plgg-router.md)
  — created plgg-router and the pure `parseQuery` this inverts; documents the
  zero-third-party-dep rule (hand-write `serializeQuery`, no `qs`).
- [20260527023824-compiled-route-table.md](.workaholic/tickets/archive/work-20260513-182057/20260527023824-compiled-route-table.md)
  — the server-side `Segment`/`compilePattern`/`matchSegments` design plgg-router
  mirrors; defines the query/path vocabulary this extends.

## Implementation Steps

1. **`serializeQuery(query: Dict<string, SoftStr>): SoftStr`** (new file). Map
   entries → `${encodeURIComponent(k)}=${encodeURIComponent(v)}`, **sort keys** so
   output is deterministic/canonical (required: the plgg-view seam string-diffs
   the serialized URL), drop empty-string values, join with `&`, prefix `"?"`
   only when non-empty (`""` for an empty dict). Pure, expression-style.
2. **Round-trip law**: `parseQuery(serializeQuery(d))` deep-equals `d` for any
   well-formed `Dict<string, SoftStr>` with non-empty values. Assert in specs.
3. **Field codec type**: a `FieldCodec<T>` carrying `decode: (token: Option<SoftStr>) => T`,
   `encode: (value: T) => Option<SoftStr>`, where `encode` returns `none()` when
   `value` equals the field default (→ omitted from the Dict). Decoding a `none()`
   token (missing key) yields the default; a malformed token also yields the
   default (never throw — mirror `parseQuery`'s `safeDecode` tolerance via
   `Result`/`Option`, `getOr(default)`).
4. **Field-codec builders** (nuqs's `parseAsX`):
   - `queryStr(default: SoftStr)` — identity on the token; omit when `=== default`.
   - `queryInt(default: number)` — `Number(token)` then `Number.isInteger` /
     `asInt` validate; non-integer/`NaN` → default. Encode `String(value)`.
   - `queryBool(default: boolean)` — `token === "true"` (or `"1"`); encode
     `"true"`/`"false"`; omit when `=== default`.
   - `queryEnum(values: NonEmpty<readonly string literals>, default)` — token in
     `values` ? token : default. (Build fresh; plgg has no literal/enum caster.)
   - `queryList(item: FieldCodec, default)` — split on `,` / re-join; each element
     through `item`. (Defer if it complicates the first slice — note in
     Considerations.)
5. **`QueryCodec<T>` composer**: `queryCodec(fields: Record<keyof T, FieldCodec>)
   → QueryCodec<T>` where `decode(dict)` reads each field's key from the dict
   (`fromNullable`) through its `FieldCodec.decode`, and `encode(value)` folds
   each field's `encode` into a `Dict`, skipping `none()` (default) results.
   `decode`/`encode` must be identity on non-default values (`encode∘decode` and
   `decode∘encode` laws).
6. **Barrel exports**; keep DOM/runtime/`history` types entirely out (pure core).
7. **Specs** (≥91% coverage): `serializeQuery` round-trips `parseQuery` + canonical
   ordering + empty dict + percent-encoding; each field codec decode/encode
   including missing-key→default, malformed→default, default-omitted-on-encode,
   `queryEnum` invalid→default; the `queryCodec` composer round-trip.

## Considerations

- **`as*` casters refine, they don't parse strings** — the single biggest gotcha
  (`packages/plgg/src/Atomics/Int.ts`). Field codecs own the string→value parse;
  validate the *parsed* value through a caster, never feed the raw token to
  `asInt`/`asBool` (`packages/plgg-router/src/Routing/usecase/queryCodec.ts`).
- **Canonical serialization is a contract, not a nicety** — the follow-up
  plgg-view seam decides "did the URL change?" by string-diffing
  `serializeQuery` output, so key order and encoding must be deterministic
  (`serializeQuery.ts`). Document this coupling in the file's doc comment.
- **Result-not-throw / Option-not-null** (`standards:implementation`): malformed or
  missing query → the field default as a value; absent/default fields are
  **omitted** on the wire (the URL analogue of omit-None), never serialized empty
  (`queryCodec.ts`).
- **Codec laws as property tests** — `parseQuery∘serializeQuery` and
  `decode∘encode` are identity on the non-default subset; state them explicitly.
- **No third-party dep / no escape hatch** — hand-write everything on `plgg`'s
  `Result`/`Option`/`cast`; no `qs`, no `as`/`any`/`ts-ignore`.
- **`queryList` scope** — if list parsing (delimiter/escaping) bloats the first
  slice, ship `queryInt/queryStr/queryBool/queryEnum` and defer `queryList` to a
  follow-up; note the omission in the PR rather than half-implementing it.

## Final Report

Development completed as planned, with two deliberate refinements from the
original sketch (see insights). Shipped `serializeQuery` + `queryStr`/`queryInt`/
`queryBool`/`queryEnum` + `writeField`; `queryList` deferred as the ticket
allowed. 38 plgg-router tests pass; coverage 98.7% statements / 97.6% branches /
98.1% functions / 98.6% lines (gate 91%). dist rebuilt for the dependent ticket.

### Discovered Insights

- **Insight**: a generic `queryCodec({ k: fieldCodec, … })` auto-composer over a
  **heterogeneous** record cannot be typed without an `as` cast — TS cannot prove
  an object built by runtime key-iteration (`Object.keys`/`fromEntries`) equals
  the mapped type `{ [K in keyof T]: T[K] }`, and the no-`as` rule is the
  project's top rule. **Context**: the type-safe alternative is to assemble a
  `QueryCodec<T>` from an **explicit object literal** over the field codecs +
  `writeField` (decode reads each key via `fromNullable`, encode spreads
  `writeField` fragments). This is more verbose but fully checked and arguably
  more transparent — the pattern to reach for any time you'd want a "map a record
  of X<T[K]> into T" combinator here.
- **Insight**: `pipe(opt, matchOption(onNone, onSome))` fails to type-check when
  the match arms return a **bare generic type parameter** (`T`) — `pipe`'s
  `NonNeverFn` constraint rejects it (`queryCodec.ts:105`). **Context**: call
  `matchOption(onNone, onSome)(opt)` directly instead of threading through `pipe`
  whenever the result type is an unconstrained type parameter; concrete return
  types (number/boolean/string) work fine through `pipe`.
- **Insight**: plgg's `as*` casters (`asInt`, `asBool`, `asNum`) **refine**
  already-typed values and reject string tokens — `asInt("3")` is an error, not
  `3`. **Context**: any string-wire decoder (query, form, header) must do its own
  `Number(...)`/`=== "true"` parse first and only optionally validate the *parsed*
  value through a caster. Confirmed in `packages/plgg/src/Atomics/Int.ts`.
