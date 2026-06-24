# plgg (core)

`plgg` is the core library every other package in the
family is built on: type-safe functional primitives —
[`Result`](/concepts/result), [`Option`](/concepts/option),
the [`pipe`/`cast`/`proc`](/concepts/composition)
pipelines, branded/validated types, and exhaustive
[`match`](/concepts/match).

This guidance is in two parts, organized by what the
vocabulary is *for*:

- **[Values & effects](/packages/plgg/values-effects)** —
  the value types (Atomics, Basics, Disjunctives) and the
  composition combinators (Flowables, Functionals).
- **[Structures & errors](/packages/plgg/structures-errors)**
  — collections, the errors-as-data model, and the
  advanced type-level/typeclass layers.

::: tip Full API reference
These pages teach the shape and the concepts. For the
complete, signature-level vocabulary, see the
**[plgg API reference](/api/plgg/)**.
:::
