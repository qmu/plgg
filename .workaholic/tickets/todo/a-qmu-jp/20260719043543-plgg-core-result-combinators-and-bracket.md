---
created_at: 2026-07-19T04:35:43+09:00
author: a-qmu-jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# plgg core: `mapResult` loses the error channel point-free; no `bracket`/resource-scope combinator

Dogfooding feedback from rebuilding a real, non-trivial TypeScript codebase (a
public LLM benchmarking instrument, ~14 topics) on the plgg family. Two `plgg`
core gaps surfaced repeatedly. Neither blocked the rebuild — both had workarounds —
but both cost friction across many seams.

## 1. `mapResult` and the curried `Result` combinators lose the error type point-free (medium)

The curried combinators are typed `mapResult: <A,B,C>(f) => (fa: Result<A,C>) =>
Result<B,C>`, binding the error type `C` only when the returned function is
applied. Written point-free as `mapResult(f)(x)`, TypeScript resolves
`mapResult(f)` first with `C` unconstrained, so `C` collapses to `unknown` and
the result types as `Result<B, unknown>` — which then fails an explicit
`Result<B, MyError>` annotation. The callback `f` names only the success type, so
there is no inference site for the error channel. In practice this reliably bites
when folding an async `attempt` result across a package boundary, where it can
even surface as *"Two different types with this name exist, but they are
unrelated"* for `Result`. Data-first `pipe(x, mapResult(f))` and
`matchResult(onErr, onOk)` with an annotated `onErr` both work around it, but the
point-free form the combinator's shape advertises is a trap.

**Request:** reorder the type parameters so the error channel is inferable from
the enclosing context, or document `pipe(x, mapResult(f))` as the intended call
shape and note that point-free application is unsupported. Affects `mapResult`,
`chainResult`, and `mapErr`.

## 2. No `bracket` / resource-scope combinator for guaranteed teardown (low-medium)

There is no plgg primitive for "acquire a resource, use it in a body that returns
a `Result`, and always release it — even on `Err` or a throw." The only honest
guarantee today is a bare `try { … } finally { … }`, which forces code that is
otherwise errors-as-values to drop back into throw/catch for the teardown edge
(we hit this on a benchmark that must tear down a sandbox/backend even when the
trial errors). A `bracket(acquire, use, release)` (or a `Resource`/scope
combinator) that runs `release` unconditionally while keeping `use`'s `Result`
body would let the teardown guarantee and the errors-as-values body compose in
one place instead of straddling two idioms.

## Policies

- **workaholic:implementation** (functional-programming, type-driven-design) —
  the error channel is part of the type contract; a combinator whose advertised
  point-free shape silently widens it to `unknown` undermines type-driven design.
- **workaholic:implementation** (objective-documentation) — this report states
  observed compiler behavior and concrete call sites, not preference.

## Quality Gate

- `mapResult(f)(x)` (point-free) either preserves the error type `C` from context
  or is documented as unsupported with `pipe(x, mapResult(f))` as the blessed
  form; the "unrelated `Result`" cross-package error no longer arises from the
  point-free shape.
- A `bracket`/resource-scope combinator exists that guarantees `release` on
  success, `Err`, and throw, while keeping the `use` body's `Result` — verified
  by a test where `use` returns `Err` and where `use` throws, both releasing.
