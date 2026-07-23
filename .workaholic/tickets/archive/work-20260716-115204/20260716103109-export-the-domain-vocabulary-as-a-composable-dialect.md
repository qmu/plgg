---
created_at: 2026-07-16T10:31:09+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Added
depends_on:
mission:
---

# Export the domain vocabulary as a composable `Dialect`, so a consumer can compose its own dialect onto it

## RESOLUTION (2026-07-16): delivered — the shape the consumer should target

```ts
import { compose, mapDialect } from "plgg-ir-language";
import { Module, manifestDialect } from "plgg-ir-manifest";

type PortalNode = Module | ViewNode; // the consumer's union

const language = compose(
  mapDialect((m: Module): PortalNode => m)(manifestDialect),
  viewDialect, // the consumer's own forms, natively Dialect<PortalNode>
);
```

`manifestDialect` is the domain vocabulary (name `"domain"`); `manifestLanguage` is now
derived from it. `mapDialect` exists because `Dialect<N>` is invariant in `N` — a measured
compile fact, not a style choice — so the lift to the consumer's node type is an explicit,
supported seam. The bound chosen by this repo: a composed dialect **adds forms only**; it
may reference domain declarations through the composition's scope but never extends a
domain type. Every item of this request's quality gate is a passing test in
`packages/plgg-ir-manifest/src/domain/usecase/manifestDialect.spec.ts`. See the resumption
ticket's RESOLUTION for the full decision record.

**Filed via `/request` by a downstream consumer of this family.**
Sizing is deliberately left empty — this repo owns that judgement.

## Overview

`plgg-ir-manifest` exports a `Language<Module>`. It does not export a
composable `Dialect`. So the composition this family's own design shows
is not reachable through the public API:

```ts
// design.md §24 — "Dialect Composition"
const language = compose(
  coreDialect,
  domainDialect,
  viewDialect,
  policyDialect,
)
```

`viewDialect` in that sketch is not hypothetical — there is a UI
consumer waiting for exactly it. A `Language` is a finished language;
you cannot compose onto it. A consumer that needs the domain vocabulary
AND its own forms in one checked language therefore has no supported
route.

**This is a request to finish §24, not to change it.** §25 already says
this package "should not define … view … It should only provide the
machinery required to define and analyze them." Exporting the domain
vocabulary as a `Dialect` is what makes that division of labour usable
from outside: the machinery stays here, the view forms live in the
consumer, and `compose` puts them in one language.

## Why the consumer cannot work around it

There is a workaround for the *procedure* case and it does not
generalize to the *structure* case.

A consumer's flow language needs cross-dialect references — a flow
naming a domain-declared choice. Its reader seeds the flow checker's
scope from a manifest-shaped schema (collection, choice, and field names
with their field types), which supplies the same binding set a
composition would, as scope rather than as a merged registry. That works
and ships today.

Reading a domain document into a consumer's own vocabulary cannot use
that trick. There is nothing to seed *into*: the consumer is not
checking its own forms against the domain's names — it needs the
domain's forms and its own forms checked together, in one language. The
only two alternatives are both bad:

1. **Fork the reader** — reimplement the domain vocabulary in the
   consumer. Two definitions of the same subject, drifting.
2. **Define a purpose-specific manifest** — a "view manifest" beside the
   Domain Manifest. This is explicitly ruled out by the consumer's own
   frozen decision: *"There is no purpose-specific manifest: one Domain
   Manifest, many consumers; purpose-specific needs are added as
   dialects, never as purpose-specific manifests."* That decision was
   made in this family's favour, and it is exactly what the missing
   export makes impossible to honour.

So the consumer is currently choosing between forking your vocabulary
and breaking its own rule. That is the whole of this request.

## What is being asked for

A composable `Dialect` for the domain vocabulary, exported alongside the
existing `Language<Module>` — additive, nothing removed.

Concretely, enough that a consumer can write:

```ts
const language = compose(coreDialect, domainDialect, myViewDialect)
```

and get one checked language in which a document may use both the
domain's forms and the consumer's, with cross-dialect references
resolving through the composition rather than through seeded scope.

**Open, and yours to decide:**

- Whether `Language<Module>` is then derived from the dialect (so the two
  exports cannot drift), or the two stay independent.
- Whether the dialect is one export or splits by subject (fields,
  choices, actions), given that `compose` concatenates registries and a
  name registered twice is a composition error.
- Whether a consumer's dialect can extend a domain *type*, or only add
  forms — the answer bounds what a view dialect is allowed to be.

## Design notes / prior art to reuse

- `design.md §24` — the composition sketch this request asks to make
  reachable. `viewDialect` is already in it.
- `design.md §25` — non-responsibilities: this package provides the
  machinery, not the `view`/`policy` definitions. The requested export is
  what lets a consumer supply those without forking.
- `design.md §5, §36.2` — the family ships no evaluator. Unchanged by
  this: a dialect is static registration, not dynamic extension, exactly
  as §24 says ("This does not mean dynamically evaluating arbitrary
  extensions").
- `design.md §37` — consumer independence: one Domain Manifest, many
  consumers. This request is what makes a *second* consumer possible
  without a second manifest.

## Key Files

- `packages/plgg-ir-manifest/` — the package that exports
  `Language<Module>` today.
- `packages/plgg-ir-language/` — `compose`, `Dialect`, and the
  registries the composition concatenates.

## Policies

- **`workaholic:implementation` / `anti-corruption-structure`** — the
  request is precisely an anti-corruption concern seen from outside: the
  consumer should depend on the domain vocabulary through a declared
  seam, not by copying it inward. A forked vocabulary is the corruption
  this policy exists to prevent.
- **`workaholic:design` / `vendor-neutrality`** — "Where to draw the
  anti-corruption layer is based on whether that dependency might be
  replaced in the future." `Dialect` is a narrower, more stable seam than
  a finished `Language`, so exporting it *reduces* what a consumer is
  coupled to.
- **`workaholic:implementation` / `type-driven-design`** — the export
  should keep the closed-registry property `compose` already relies on: a
  duplicate name is a composition error, not a source diagnostic, so the
  merged vocabulary stays closed and unambiguous.
- **`workaholic:design` / `sacrificial-architecture`** — the consumer's
  current scope-seeding is a deliberately disposable workaround. This
  request is what lets it be discarded rather than entrenched.

## Quality Gate

Owned by this repository — the requester should not set another team's
bar. What would let the requester retire the workaround:

- `compose(coreDialect, domainDialect, consumerDialect)` type-checks and
  returns a `Language` from the published package, with no
  `as`/`any`/`ts-ignore` at the call site.
- A document using forms from both dialects reads and checks, and a
  cross-dialect reference resolves through the composition.
- A name registered by two dialects is a composition error, as §24
  specifies.
- The existing `Language<Module>` surface still works — this is
  additive.

## Considerations

- **Not urgent in the sense of blocking a build.** What ships today
  works. What it blocks is a consumer's next step: reading a
  domain document written by an LLM and turning it into a running,
  operable UI with no compile step. That consumer's whole thesis rests
  on this seam, so the request is load-bearing even though nothing is
  currently red.
- **The requester will follow whatever shape you choose.** The consumer
  has a recorded destination — "when the domain vocabulary exports a
  composable dialect, the seam moves from scope-seeding to `compose`
  without changing the flow language" — so a design decision here does
  not strand work there.
- **If the answer is "not this shape"**, the useful reply is which shape
  the consumer should target instead. The requester's constraint is only
  that it must not fork the vocabulary and must not define a
  purpose-specific manifest; any export that honours both is workable.
