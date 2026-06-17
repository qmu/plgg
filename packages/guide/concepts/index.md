# Core concepts

This section defines the **plgg ethos** — the handful of
ideas every package in the family assumes. It is the
single source of truth: the per-package pages link back
here instead of re-explaining `Option`, `Result`,
`cast`, `proc`, and `match`.

The whole library follows a few rules:

- **Type-driven** — model the domain in types first, so
  the compiler rejects illegal states before they run.
- **Absence is a value** — use [`Option`](/concepts/option),
  never `null`/`undefined`.
- **Errors are values** — use [`Result`](/concepts/result),
  never `throw`; expected failures are
  [tagged data](/concepts/tagged-data) you fold by tag.
- **Data-last composition** — build behavior by
  [piping values through functions](/concepts/composition),
  config-first / data-last.
- **Exhaustive handling** — fold unions with
  [`match`](/concepts/match); the compiler flags a
  missing case.

## The concepts

1. **[Tagged data (`Box`)](/concepts/tagged-data)** — the
   `Box<Tag, Content>` foundation everything is built on.
2. **[Option, not null](/concepts/option)** — absence as a
   first-class value.
3. **[Result, not throw](/concepts/result)** — errors as
   tagged data flowing through the happy path.
4. **[Validation with `cast`](/concepts/validation)** —
   turn `unknown` into typed values, accumulating errors.
5. **[Async with `proc`](/concepts/async)** — pipelines
   over promises and results, with precise error types.
6. **[Exhaustive `match`](/concepts/match)** — pattern
   matching that the compiler checks for completeness.
7. **[Data-last composition](/concepts/composition)** —
   `pipe` and `flow`, and the config-first idiom.

Once these are familiar, the API details live on the
core package pages:
[Values & effects](/packages/plgg/values-effects) and
[Structures & errors](/packages/plgg/structures-errors).
