---
created_at: 2026-07-16T11:26:12+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on: 20260716103109-export-the-domain-vocabulary-as-a-composable-dialect.md
mission: plggmatic-ai-native-ui-toward-a-dsl
---

# Resume: decide the domain `Dialect`'s SHAPE — the request is verified and the code is ready; only the design call is missing

## RESOLUTION (2026-07-16, `/drive` on `work-20260716-115204`)

All three questions answered and the export shipped:

1. **Derive `Language<Module>` from the dialect** — done; `manifestLanguage = manifestDialect`
   (the assignability claim compiled clean, exactly as this ticket predicted).
2. **One dialect** — done; `manifestDialect`, named `"domain"` per design.md §24.
3. **Forms only** — decided by the developer when asked: a consumer's dialect may only ADD
   forms alongside the domain vocabulary, never extend a domain type. Recorded in
   `manifestDialect`'s doc comment and the manifest README.

**One finding this ticket did not anticipate:** `Dialect<N>` is *invariant* in `N`
(`AnalysisContext<N>` carries `N` in both variance positions through `ctx.language` and
`ctx.analyzeForm`), so exporting the dialect alone cannot satisfy the request's gate —
`compose` at the consumer's wider node type rejects `Dialect<Module>`. The additive fix is
`mapDialect` in `plgg-ir-language`: a functor over the node type whose mapped forms keep
their own closed vocabulary (the forms-only bound, by construction) while the composition's
scope — and with it cross-dialect references — flows through. The request's whole quality
gate is pinned in `manifestDialect.spec.ts` and `mapDialect.spec.ts`.

## Overview

**Carry origin:** a `/drive` session on 2026-07-16 that contexted the `/request`
ticket `20260716103109-export-the-domain-vocabulary-as-a-composable-dialect.md`.
This is a DESIGN checkpoint, not a feature ticket: the investigation is done and
does not need redoing. **Do not re-derive the findings below — they were measured,
and the measurements are cited.**

The request asks `plgg-ir-manifest` to export its domain vocabulary as a composable
`Dialect` so a consumer can `compose(coreDialect, domainDialect, myViewDialect)`.
Every claim in it was verified. What blocks it is **one design decision**, and only
this repository can make it.

## What was VERIFIED (do not redo)

| the request's claim | verdict |
|---|---|
| `plgg-ir-manifest` exports only a `Language<Module>` | **TRUE** — `manifestLanguage`, `domain/usecase/compileManifest.ts:33` |
| `plgg-ir-language` already has `Dialect` and `compose` | **TRUE** — `domain/model/Language.ts:202`, `domain/usecase/compose.ts:33` |
| `design.md §24` shows the composition sketch, `viewDialect` included | **TRUE** — line 1160 of the mission's `design.md`, quoted verbatim in the request |
| `design.md §25` says this package must not define `view` | **TRUE** — line 1184 |
| `compose` makes a duplicate name a composition error | **TRUE** — stated in its own doc comment |

Unusually for this repo's recent tickets, **the request's premises all held.** It
was written from measurement, not inference. Treat its reasoning as sound.

`design.md` lives at
`.workaholic/missions/archive/build-the-plgg-ir-package-family/design.md` — the
mission was closed `achieved` on 2026-07-16, so it is in `archive/`, not `active/`.

## The finding that decides two of the three open questions

`Dialect<N>` and `Language<N>` are **structurally identical except for `name`**:

```ts
export type Dialect<N> = Readonly<{
  name: SoftStr;   // ← the ONLY difference
  forms: ReadonlyArray<FormDef<N>>;
  operators: ReadonlyArray<OperatorDef>;
  expanders: ReadonlyArray<Expander>;
  normalizers: ReadonlyArray<Normalizer>;
}>;

export type Language<N> = Readonly<{
  forms; operators; expanders; normalizers;   // same four
}>;
```

And `manifestLanguage` is already a dialect in everything but its type — **its own
doc comment says so**:

```ts
/**
 * The Domain Manifest language: ONE DIALECT — the
 * `plgg-ir` root form, the closed operator
 * vocabulary, and the stable-ordering normalizer.
 */
export const manifestLanguage: Language<Module> = {
  forms: [plggIrForm],
  operators: manifestOperators,
  expanders: [],
  normalizers: [manifestStableOrder],
};
```

So the export is close to free, and `Language` can be DERIVED from the dialect
rather than kept in parallel — a `Dialect` is assignable to a `Language` (the
excess-property check applies only to object literals, not to a variable
reference):

```ts
export const manifestDialect: Dialect<Module> = {
  name: "domain",            // ← the name is the open sub-question, see below
  forms: [plggIrForm],
  operators: manifestOperators,
  expanders: [],
  normalizers: [manifestStableOrder],
};

/** Derived, so the two exports cannot drift. */
export const manifestLanguage: Language<Module> = manifestDialect;
```

**Verify this assignability before relying on it** (it is a type-level claim made
from reading, not from a compile). One `tsc --noEmit` settles it.

## The decision this ticket exists for

The request explicitly leaves three questions to this repo and says the requester
will follow whatever shape is chosen. Two now have a strong default; the third does
not, and **it is the whole reason this is carried rather than built**.

1. **Derive `Language<Module>` from the dialect, or keep them independent?**
   → **Recommended: derive.** It is a one-liner and removes drift by construction.
   Low risk, no downside found.

2. **One dialect, or split by subject (fields / choices / actions)?**
   → **Recommended: one.** `compose` concatenates registries and a duplicate name
   is a composition error, so splitting buys a consumer partial adoption at the
   cost of more collision surface — and no consumer has asked for partial adoption.
   Start with one; splitting later is additive.

3. **Can a consumer's dialect extend a domain TYPE, or only add forms?**
   → **UNDECIDED. This is the developer's call and it is load-bearing.** The
   request states plainly: *"the answer bounds what a view dialect is allowed to
   be."* It decides whether `viewDialect` may enrich a domain type (e.g. attach a
   presentation facet to a declared field) or may only add new forms alongside it.
   Answering "forms only" is the smaller, safer bound and likely satisfies the
   consumer's stated need; answering "may extend types" is a much larger commitment
   about the vocabulary's openness and interacts with `type-driven-design`'s
   closed-registry property. **Do not guess this — ask.**

## Why this matters more than its size

The requester is the **plggmatic** consumer: *"reading a domain document written by
an LLM and turning it into a running, operable UI with no compile step."* That is
the `plggmatic-ai-native-ui-toward-a-dsl` mission (**3/5**), whose two remaining
acceptance items are delivered in the `qmu/plggmatic` repo. **This seam is what
unlocks them.** Nothing is red today, and the request says so honestly — but the
consumer's whole thesis rests on it, and its only alternatives are to fork the
vocabulary or to break its own frozen "no purpose-specific manifest" rule.

Note the relationship to the closed IR mission, so nobody re-opens it by mistake:
`Build the plgg-ir Package Family` was correctly closed `achieved` (12/12). Its
acceptance covered `plgg-ir-language` **providing** dialect composition — which it
does. This gap is adjacent and different: `plgg-ir-manifest` never **exported** its
vocabulary as a dialect. The machinery exists; the keyhole is blocked.

## Implementation Steps

1. **Answer question 3 with the developer.** Everything else follows from it.
2. Add `manifestDialect: Dialect<Module>` to `plgg-ir-manifest`, derive
   `manifestLanguage` from it, and re-export through the barrel
   (`packages/plgg-ir-manifest/src/index.ts` currently re-exports only
   `plgg-ir-manifest/domain`).
3. Choose the dialect's `name` — it is the collision key `compose` reports on, so
   it is user-visible in a composition error. `"domain"` matches `design.md §24`'s
   `domainDialect`.
4. Spec the request's own gate (below), including the duplicate-name composition
   error.
5. `scripts/tsc-plgg.sh` + the package's tests + `scripts/check-all.sh`.

## Quality Gate

Taken verbatim from the request, which deliberately left the bar to this repo:

- `compose(coreDialect, domainDialect, consumerDialect)` type-checks and returns a
  `Language` from the published package, with **no `as` / `any` / `ts-ignore` at
  the call site**.
- A document using forms from both dialects reads and checks, and a cross-dialect
  reference resolves through the composition.
- A name registered by two dialects is a **composition error**, per §24.
- The existing `Language<Module>` surface still works — **this is additive**.
- Plus this repo's own bar: `check-all` green, >90% coverage on the touched
  packages.

## Policies

- `workaholic:implementation` / `policies/anti-corruption-structure.md` — the
  request is this policy seen from outside: the consumer should reach the domain
  vocabulary through a declared seam, not copy it inward. A forked vocabulary is
  the corruption the policy exists to prevent.
- `workaholic:implementation` / `policies/type-driven-design.md` — the export must
  preserve the closed-registry property `compose` relies on: a duplicate name is a
  composition error, not a source diagnostic. Question 3 lives or dies here.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — §25's
  division of labour: the machinery stays in this family, the `view` forms live in
  the consumer.
- `workaholic:design` / `policies/vendor-neutrality.md` — `Dialect` is a narrower,
  more stable seam than a finished `Language`, so exporting it REDUCES what the
  consumer couples to.
- `workaholic:design` / `policies/sacrificial-architecture.md` — the consumer's
  scope-seeding workaround is deliberately disposable; this export is what lets it
  be discarded rather than entrenched.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth:50.

## Position when this was carried (2026-07-16 11:26)

Read this before starting, so nothing below is rediscovered or lost.

- **Branch `work-20260716-023712`, 3 commits ahead of `origin/main`, NOT pushed and
  NO PR.** It carries: the blocked-ticket findings (`54c41815`), the mission
  bookkeeping pass (`3454666f`), and the poc4c removal (`fc9acefb`). The last one
  touches product code (`plgg-poc-portal`), so this branch needs `/report` before
  it goes anywhere. **Do not start the dialect work on this branch** — cut a fresh
  one; a branch that is merged and then reused is the mistake `41084cf0` records.
- **PoC 5 and PoC 6 became judgeable today.** Their cloudflared routes
  (`plgg-poc5.qmu.dev` → 5188, `plgg-poc6.qmu.dev` → 5189) were applied at the
  developer's explicit instruction and the tunnel was restarted (validated `OK`;
  33 → 35 hostnames; existing hosts unaffected; backup at
  `~/.cloudflared/config.yml.bak`). Both apps serve their real shells. **The only
  thing between the portal and 8/9 is the developer's live verdict on those two
  URLs** — the quality gate was never the blocker, the missing route was.
- **`20260716000445-plgg-mcp-exports-drag-in-plgg-content.md` is still open** and
  still needs a package-boundary decision (its own STATUS section has the analysis;
  its prescription is not applicable as written).
- The mission board: `plggmatic` 3/5, PoC portal 6/9, `modernize-plgg-bundle` 0/8
  with no tickets filed, `plgg-ir` achieved and archived.

## Related

- `20260716103109-export-the-domain-vocabulary-as-a-composable-dialect.md` — the
  `/request` this resumes. Read it first; it is well-written and its reasoning is
  verified sound.
- `.workaholic/missions/archive/build-the-plgg-ir-package-family/design.md` — §24
  (composition), §25 (non-responsibilities), §37 (consumer independence).
- `packages/plgg-ir-language/src/domain/model/Language.ts:202` — `Dialect`.
- `packages/plgg-ir-language/src/domain/usecase/compose.ts:33` — `compose`.
- `packages/plgg-ir-manifest/src/domain/usecase/compileManifest.ts:33` —
  `manifestLanguage`, the thing to derive.
