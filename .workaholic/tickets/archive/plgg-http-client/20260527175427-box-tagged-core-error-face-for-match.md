---
created_at: 2026-05-27T17:54:27+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 2h
commit_hash: 2245358
category: Changed
depends_on:
---

# Give plgg core errors a `Box`-tagged, `match`-compatible face

## Overview

plgg models errors two incompatible ways, and only one folds through `match`:

- **Class-based exceptions** (`src/plgg/src/Exceptionals/`): `BaseError extends
  Error` → `InvalidError` / `Exception` / `SerializeError` / `DeserializeError`,
  unioned as `PlggError`, branded by a plain string field `.__ = "PlggError"`
  and guarded by `isPlggError` (keys off `.__`, **not** `__tag`). This is the
  throwable, Result-error face and the most-produced error in the codebase
  (`cast`, `jsonCodec`, `Ok.asOk`/`Err.asErr`).
- **`Box` tagged unions** (`Contextuals/Box`): `{ __tag, content }`, the **only**
  shape `match` dispatches on (`isBox` requires *both* a string `__tag` and a
  `content` prop; `pattern("Tag")()` compares `a.__tag`).

Because the Error classes carry no `__tag`/`content`, `match(someError)(...)`
can never fire a tag arm — `isBox` fails, so only `otherwise` or reference
equality match, and `ExtractBoxTag<PlggError>` is `never`, so exhaustiveness
cannot be certified. The most common core error is therefore **not
match-compatible**, which is the gap surfaced while folding `ClientError` in the
`plgg-http-client` example (a 9-variant `Box` union *did* fold, but only because
it is `Box`-based; an `InvalidError` could not).

Give the core error vocabulary a `Box`-tagged face so domain errors fold through
`match` exhaustively, **without** dropping `extends Error` (the throw/stack-trace
seam must survive). One error expression, `match` as its eliminator, `Error`
classes confined to the throw boundary.

This is the "what error core utility we should have… compatible with the match
function" half of the discussion. Sibling ticket:
`unify-match-nonexhaustive-runtime-with-coverageerror` (match's own failure
vocabulary) — keep the `Box`/`CoverageError` shapes consistent across both.

## Key Files

- `src/plgg/src/Exceptionals/BaseError.ts` - `extends Error`; brand
  `__ = "PlggError"` (string, not `__tag`); `name`, `detail`, `parent` chaining.
  Primary site to add a stable `__tag` (+ a `content` view) so instances satisfy
  `isBox` — additively, keeping `extends Error`.
- `src/plgg/src/Exceptionals/InvalidError.ts` - the most-produced error; adds
  `.sibling`; object-arg constructor `{ message, parent?, sibling? }`. Must gain
  a tag (e.g. `__tag: "InvalidError"`) and keep its public constructor shape.
- `src/plgg/src/Exceptionals/Exception.ts`, `SerializeError.ts`,
  `DeserializeError.ts` - the other arms; each needs a tag. **Note the
  inconsistency**: `DeserializeError` is a `BaseError` but is *excluded* from the
  `PlggError` union — decide whether it joins.
- `src/plgg/src/Exceptionals/PlggError.ts` - `PlggError` union, `isPlggError`
  (keys off `.__`), `printPlggError`, `toError`, `unreachable`. For `match` to
  drive exhaustiveness over `PlggError`, every arm must expose `__tag`.
- `src/plgg/src/Contextuals/Box.ts` / `Icon.ts` / `Pattern.ts` - the `isBox`
  contract a tagged error must satisfy; `Ok.ts`/`Err.ts` already show the idiom
  of spreading `box(tag)(payload)` into a richer object — the established way to
  give a class/object a `Box` face without `as`.
- `src/plgg/src/Flowables/cast.ts`, `src/plgg/src/Functionals/jsonCodec.ts` -
  InvalidError producers; `cast` reads `.sibling`/`.parent`. Any reshaping must
  preserve these or update these call sites.
- `src/plgg/src/Disjunctives/Result.ts` (`mapErr`, `matchResult`) - the error
  channel; a tagged error lets callers `match` the `F` payload by tag inside
  `onErr`.

## Related History

This extends the `Box`-tagged-error convention (proven by `HttpError`) down into
the core `Exceptionals`, building on the `Result` error-channel plumbing.

- [20260527023825-http-failure-vocabulary.md](.workaholic/tickets/archive/work-20260513-182057/20260527023825-http-failure-vocabulary.md) - Establishes the `HttpError` `Box` union as the worked example of a match-compatible error vocabulary; its fold is a hand-rolled ternary precisely because the core error face is not yet match-ready.
- [20260526210115-match-narrowed-box-handler-and-atomic-coverage.md](.workaholic/tickets/archive/work-20260513-182057/20260526210115-match-narrowed-box-handler-and-atomic-coverage.md) - Curried `match` so tag arms receive the narrowed box; the capability a tagged `InvalidError` would unlock for error handling.
- [20260527023826-result-maperr-and-json-codec.md](.workaholic/tickets/archive/work-20260513-182057/20260527023826-result-maperr-and-json-codec.md) - Added `mapErr`/`matchResult` and surfaced the `InvalidError.message`-loss problem when bridging class errors into value flows — the channel a tagged error must interoperate with.
- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) - The consuming POC whose `ClientError` fold motivated this; documents that only `Box`-based errors are match-foldable today.

## Implementation Steps

1. Choose the bridge shape (capture the decision in the ticket discussion):
   - **(a) `__tag` + `content` on `BaseError`:** add a literal `__tag` per
     subclass and a `content` accessor exposing the payload (message + structured
     detail), so each instance satisfies `isBox`. Most direct; one hierarchy,
     two faces.
   - **(b) Tagged twin:** a parallel `Box<"InvalidError", {…}>` value
     constructed alongside the class, with helpers to convert. Cleaner type story
     but duplicates the vocabulary — weigh against ubiquitous-language.
   Prefer **(a)** if it can satisfy `isBox` additively without disturbing
   `instanceof Error`, `printPlggError`, or `toError`.
2. Add stable `__tag`s: `"InvalidError"`, `"Exception"`, `"SerializeError"`,
   `"DeserializeError"`. Expose `content` as a **structured object payload per
   variant** — NOT the raw `message` string. Error content is heterogeneous (the
   existing `HttpError` vocabulary already carries `Method[]` for
   `MethodNotAllowed` and `{ status, message }` for `StatusError`), so the core
   `content` must be object-shaped and variant-specific so future errors carry
   richer `Box`-wrapped objects:
   - `BaseError` → `content: { message: SoftStr }` (the common payload).
   - `InvalidError` → `content: { message: SoftStr; sibling: ReadonlyArray<InvalidError> }`.
   - others inherit the base object.
   Preserve `.message`/`.parent`/`.sibling` instance access for `cast` (the
   handler still receives the narrowed class instance, with `.content` as its
   structured payload).
3. Resolve the `PlggError` union: include `DeserializeError` (or document why
   not). Ensure `ExtractBoxTag<PlggError>` is the full tag set so `match` can
   certify exhaustiveness over `PlggError` without `otherwise`.
4. Keep `isPlggError` working; consider aligning it (or adding a guard) so the
   `.__` brand and the new `__tag` are consistent (one discriminator story).
5. Preserve the public surface: `InvalidError`'s name and `{ message, parent?,
   sibling? }` constructor, and its assignability into `Result<_, InvalidError>`
   (consumed by `plgg-http-router`/`plgg-http-client`). No signature breakage.
6. Add a small demonstration/test: `match(plggError)([pattern("InvalidError")(),
   …], …)` folds exhaustively and each arm gets the narrowed payload.
7. Verify `sh/tsc-plgg.sh` + `sh/test-plgg.sh`, update Exceptionals specs
   (`PlggError.spec.ts` etc.) and keep coverage > 90%; rebuild `src/plgg` so the
   sibling http worktrees still type-check against the new shape.

## Considerations

- **Keep `extends Error` (the throw seam).** Do **not** rip out the `BaseError`
  hierarchy — stack traces, `instanceof Error`, `printPlggError`, `toError`, and
  `tryCatch` (`E extends Error`) all depend on it. The `Box` face is *additive*
  (`src/plgg/src/Exceptionals/BaseError.ts`, `Functionals/tryCatch.ts`).
- **Type-driven design lens (`standards:leading-validity`).** Tagged errors make
  error handling exhaustiveness-checked rather than ad-hoc; push the discrimination
  into the type layer so a tag arm statically receives the right payload.
- **No `as`/`any`/`@ts-ignore`** (CLAUDE.md). The `Box` face must satisfy
  `isBox`/`Box<TAG,_>` structurally — `Ok.ts`/`Err.ts` show the cast-free idiom.
- **Ubiquitous language.** One discriminator story: reconcile the existing `.__
  = "PlggError"` brand with the new `__tag` rather than leaving two parallel
  discriminators (`src/plgg/src/Exceptionals/PlggError.ts`).
- **Public-API stability across worktrees.** `plgg-http-router` and
  `plgg-http-client` construct `new InvalidError({ message })` and carry
  `Result<_, InvalidError>`; preserve both (`src/plgg-http-router/src/Http/model/Method.ts`,
  `src/plgg-http-client/src/Http/usecase/decode.ts`).
- **Producer call sites.** `cast.ts` reads `acc.content.sibling`; reshaping
  `InvalidError` must keep `.sibling`/`.parent` accessible or update `cast.ts`
  and `jsonCodec.ts` in the same change.
- **Sibling ticket.** Coordinate the `Box`/`CoverageError` vocabulary with
  `unify-match-nonexhaustive-runtime-with-coverageerror` so match's own error and
  domain errors are the same comparable expression.
- **Content is object-shaped, not a string.** A `Box` error's `content` is the
  structured payload the variant carries (an object), mirroring `HttpError`'s
  `Method[]` / `{ status, message }` contents — do not collapse it to the bare
  `message` string (`src/plgg/src/Exceptionals/BaseError.ts`).

## Discussion

### Revision 1 — 2026-05-27T20:58:00+09:00

**User feedback**: "Error is not always string, will write more error object
wrapped by Box."

**Ticket updates**: Rewrote Implementation Step 2 — `content` is now a
**structured object payload per variant** (`BaseError` → `{ message }`,
`InvalidError` → `{ message, sibling }`), not the raw `message` string. Added a
Considerations bullet making this explicit.

**Direction change**: The first implementation made `BaseError.content` a
`get content(): string` returning `this.message`, which wrongly assumes an
error's content is always a string. Errors carry heterogeneous structured data
(as `HttpError` already shows: `Method[]`, `{ status, message }`). The boxed
core error's `content` must therefore be an object so it composes with the
broader `Box`-wrapped-object error vocabulary. Re-implement the `content` getters
to return the structured object; keep `__tag` literals, the `extends Error`
seam, and instance-field access (`.message`/`.sibling`) unchanged.

### Revision 2 — 2026-05-27T21:15:00+09:00

**User feedback**: The `plgg-http-client` `example.ts` still folds errors whose
`content` is a bare string (`${e.content}` for `NetworkError`/`NotFound`,
`.join` for `MethodNotAllowed`). The object-content principle must apply to the
**HTTP error vocabularies** too, not just core.

**Ticket updates**: Expanded scope (and `layer` → `[Domain, Infrastructure]`) to
reshape the HTTP error vocabularies to object content:
- `plgg-http-router` `HttpError`: each variant carries an object —
  `NotFound: { path }`, `MethodNotAllowed: { allowed }`, `BadRequest`/
  `Unsupported`/`Unauthorized`/`Forbidden`/`InternalError: { message }`,
  `StatusError: { status, message }` (already an object). Constructor signatures
  unchanged (they wrap args into the object); update the `httpErrorToResponse`
  fold to read `.content.<field>` and update `HttpError.spec.ts`.
- `plgg-http-client` `NetworkError: { message }`; update the seam/request usage
  and specs (`result.content.content` → `result.content.message`).
- `example.ts`: each arm reads the structured field (`e.content.message`,
  `e.content.path`, `e.content.allowed.join(", ")`, …).

**Direction change**: One object-content error vocabulary end-to-end — core
`Exceptionals` and the HTTP errors alike. Rebuild `plgg-http-router` before
`plgg-http-client` (the client consumes the router's reshaped `HttpError` types
via its `dist`). Preserve constructor signatures so the router/client call sites
(`notFound(path)`, `badRequest(msg)`, `networkError(msg)`) are unchanged.

### Revision 3 — 2026-05-27T21:40:00+09:00

**User feedback**: "I don't wanna see that string based pattern matching anymore
… but like the ADT pattern matching." (Objecting to `pattern("NetworkError")()`
spelling the tag as a string literal at the match site.)

**Ticket updates**: Every error variant now exports a `$`-suffixed ADT pattern
(the established `ok$`/`err$`/`none$` convention, `() => pattern(tag)()`), and
all match sites reference them instead of inline `pattern("Tag")()`:
- core: `invalidError$`, `exception$`, `serializeError$`, `deserializeError$`
- router `HttpError`: `notFound$`, `methodNotAllowed$`, `badRequest$`,
  `unsupported$`, `unauthorized$`, `forbidden$`, `statusError$`, `internalError$`
- client: `networkError$`
- `example.ts`, `PlggError.spec.ts`, `HttpError.spec.ts`, `ClientError.spec.ts`
  fold via the `$` patterns.

**Direction change**: ADT-style pattern matching — match arms name the variant
(`[networkError$(), …]`), never a bare tag string. Tag constants infer as
literals so narrowing/exhaustiveness hold without `as const`.

## Final Report

Development completed, with three revisions driven by review (object content,
HTTP-vocabulary expansion, ADT `$` patterns). One object-content, `Box`-tagged
error vocabulary end-to-end — core `Exceptionals`, router `HttpError`, client
`NetworkError` — each variant matchable by a named `$` ADT pattern, all folds
exhaustive, `extends Error` preserved. plgg 452/452, router 88/88, client 25/25,
all coverage > 90%; example type-checks; all three packages build.

### Discovered Insights

- **Insight**: Over a `Box`-tag union, `match`'s `otherwise` does **not** backfill
  uncovered variants — the all-box-pattern path requires the explicit tags to
  already cover the union (`match.completeness.spec.ts`, GAP 5). So an
  error-union fold must enumerate every variant; a 2-arm "one tag + otherwise"
  is a `CoverageError`.
  **Context**: This is why both the example and the `ClientError`/`HttpError`
  spec folds list all variants — exhaustiveness is the feature, not a nuisance.
- **Insight**: Making the `Error` classes satisfy `isBox` is a *global*
  reclassification, but it is safe here because `isOk`/`isErr`/`isSome` check a
  specific tag, `asBox`/`unbox` have no external callers, and `content`/`__tag`
  are non-enumerable getters (JSON output unchanged). The full suite (incl.
  `NominalDatum`/serialization specs) confirmed no regression.
  **Context**: When bolting a structural face onto existing instances, prefer
  non-enumerable getters and lean on the existing specs to prove containment.
- **Insight**: `content` must be a structured **object** per variant, never the
  bare `message` string — error payloads are heterogeneous (`Method[]`,
  `{ status, message }`), and a string content forces a lossy mold. This (and the
  `$`-pattern ADT style) should have been agreed *before* coding; the three
  re-passes trace directly to not fixing the design with the maintainer first.
