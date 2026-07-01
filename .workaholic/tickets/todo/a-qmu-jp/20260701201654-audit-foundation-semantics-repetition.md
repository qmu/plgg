---
created_at: 2026-07-01T20:16:54+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Research: Audit plgg-style repetition and propose foundation-semantics additions

## Overview

**This is a research ticket. It changes no code under `packages/`. Its deliverable is a set of follow-up implementation tickets.**

Survey the plgg monorepo for redundant, unsophisticated, or repeating shapes in current plgg-style programming, and — where a shape recurs — propose an **addition to or update of the foundation semantics of plgg** (the core combinators/types in `packages/plgg`) that collapses the repetition. The model for this ticket is the archived `match` type-completeness gap-analysis (enumerate the pattern with reproducing citations → propose an additive/foundation change → spin off a dependent, independently-drivable fix ticket per accepted finding).

**Scope decision (author-confirmed):** *Combinator/core-semantics axis only.* A prior monorepo-wide loose-type sweep (15 packages, 212 findings) already produced six queued todo tickets covering the **branded-type refinement axis** (`SoftStr`→`Str`, case-shaped brands, `number`→`Int`/`Uint`/`Float`, typed `defineSite`). This survey **cross-references those and does not re-propose them.** Its net-new value is the combinator/definition layer: the ceremony around *defining* tagged unions, refined brands, ordering, and error adapters — not the field-level type-tightening those six tickets own.

Discovery already located the strongest candidates (below). The survey's job is to **validate each against the evidence bar, name its home category, prove it needs no escape hatch, and emit a ticket** — plus sweep for any repetition discovery missed.

## Policies

The standard engineering policies that govern this ticket. The implementing session (here, the survey author) **MUST** read each before producing proposals, and every proposed foundation change in a spun-off ticket must stay defensible against these.

- `workaholic:implementation` / `policies/directory-structure.md` — any proposed combinator/type must state its home among plgg's eleven categories and its `src/index.ts` wiring; a new top-level category needs an explicit architecture decision (applies to all code work the survey proposes).
- `workaholic:implementation` / `policies/coding-standards.md` — proposals must be expressible with **no `as`/`any`/`@ts-ignore`/`@ts-expect-error`**; a candidate that cannot type-check without an escape hatch is rejected or flagged, never rationalized (applies to all code work).
- `workaholic:implementation` / `policies/type-driven-design.md` — governs whether a new foundation type/combinator is warranted and how narrowly it should be typed (the central question of "add/update foundation semantics").
- `workaholic:implementation` / `policies/functional-programming.md` — the survey is an application of "prefer declarative code": repeated imperative/ceremonial shapes are the candidates to fold into signature-preserving combinators.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — a pattern repeated in a consumer is promoted **down** into consumer-agnostic plgg core, never by having core reach up; keeps proposals vendor/consumer-neutral.
- `workaholic:implementation` / `policies/objective-documentation.md` — findings and proposals must be stated as verifiable behavior with file:line citations, not aspirational prose; each proposed combinator's JSDoc explains the why.
- `workaholic:planning` / `policies/modeling-centric-design.md` — adding/changing foundation semantics is design work; each proposal must start from the articulated pain (the repeated shape it removes) before any signature is sketched.
- `plgg-coding-style` (skill) — the concrete house-style contract (Option not null, Result not throw, expression-style data-last `pipe`/`cast`/`proc`/`flow`, `Box`/`Brand` shape, `asX`/`isX`/`X$` naming, Prettier printWidth 50). Every proposal must extend this vocabulary without collision, and any eventual implementation ticket answers to it.

Repo-local constraints that bind every proposal: `.workaholic/constraints/architecture.md` (eleven-category taxonomy, single-root-`index.ts` export convention, strictly-upward dependency direction) and `.workaholic/constraints/quality.md` (strict-flag set, ≥90% coverage, escape-hatch prohibition, `tsc-plgg.sh` + `test-plgg.sh` green).

## Key Files

Foundation surface (what already exists — proposals must not duplicate it):

- `packages/plgg/src/index.ts` — authoritative inventory of the foundation; confirms there is currently no `defineVariant`, `refinedBrand`, or `Ord`/`compare` export. Any new combinator lands here.
- `packages/plgg/src/Flowables/index.ts` — `pipe`, `proc`, `flow`, `cast`, `match`/`pattern`: the pipeline vocabulary the repetition sits on top of.
- `packages/plgg/src/Contextuals/Box.ts` — the `Box<Tag,Content>` primitive (`box(tag)`, `isBoxWithTag(tag)`, `forContent`, `unbox`) that every consumer union/error is built from; the likely home for a variant-definition helper.
- `packages/plgg/src/Contextuals/Pattern.ts` — `pattern(tag)()` builder; the consumer `xxx$` helpers are thin wrappers over it.
- `packages/plgg/src/Disjunctives/Option.ts`, `Disjunctives/Result.ts` — the map/chain/match/fold surface is already rich; manual `isOk`/`isSome` branching is nearly absent. **Baseline of what "good" looks like** — the redundancy is at the *definition* layer, not the unwrap layer. Do not propose Option/Result eliminators that already exist.
- `packages/plgg/src/Functionals/index.ts` — `refine`, `defined`, `atProp`/`atIndex`, `tryCatch`, `jsonCodec`, etc. `cast` + `forProp`/`forOptionProp`/`refine` already collapse object validation well; that is the model for a well-designed combinator, not a gap.
- `packages/plgg/src/Exceptionals/PlggError.ts` — foundation error vocabulary; consumer error unions parallel it.

Repetition sites (the evidence — cite these in the spun-off tickets):

- `packages/plgg-http/src/Http/model/HttpError.ts` — largest concentration: 8 variants × (constructor + `$` matcher) → 8-arm `httpErrorToResponse` fold.
- `packages/plgg-cli/src/Cli/model/CliError.ts` — minimal complete four-fold instance (incl. `isXxx` guards).
- `packages/plgg-fetch/src/Http/model/ClientError.ts` — the trio repeated when *extending* another package's union.
- `packages/plgg-kit/src/LLMs/model/Provider.ts` — per-variant `type` + `$` + `asXxx` + constructor block ×3 (restates the tag literal 3× per variant); also the *good* `cast`/`forProp` object-validation contrast.
- `packages/plgg-router/src/Routing/model/Segment.ts`, `packages/plgg-view/src/Html/model/Html.ts` — non-error tagged unions with the same constructor+pattern repetition (proves it's about tagged unions generally, not just errors).
- `packages/plgg-sql/src/Db/model/Db.ts` — `SqlError` trio + `toSqlError` ad-hoc `unknown→Box` adapter (cf. foundation `toCause`).
- `packages/plgg-db-migration/src/domain/model/Version.ts`, `.../TenantId.ts` — the refined-brand five-part idiom, plus a hand-rolled `-1/0/1` `compareVersion`.
- `packages/plgg-router/src/Routing/usecase/serializeQuery.ts` — second hand-rolled `-1/0/1` comparator.
- `packages/plgg-sql/src/Db/usecase/transaction.ts` — one of the few manual `isOk` branch sites (commit-or-rollback).

## Related History

Prior work shows the foundation is evolved through targeted, combinator-scoped efforts; the closest methodological precedent is an archived type-level gap-analysis that spun off dependent fix tickets. A monorepo-wide loose-type sweep has **already run** and produced the six branded-type todo tickets this survey defers to.

Precedent and adjacent foundation work:

- [20260525205926-match-type-completeness-gap-analysis.md](.workaholic/tickets/archive/work-20260513-182057/20260525205926-match-type-completeness-gap-analysis.md) — **the template**: analysis/proposal over a core combinator (`match`) that enumerated gaps with reproducing snippets and produced dependent fix tickets, honoring the no-escape-hatch rule.
- [20260617081221-proc-error-union-and-collapse.md](.workaholic/tickets/archive/work-20260617-002003/20260617081221-proc-error-union-and-collapse.md) — foundation `proc` semantics change that collapsed bespoke async flows onto a core primitive (exactly the refactor class this survey targets).
- [20260617081220-errors-as-data-migration.md](.workaholic/tickets/archive/work-20260617-002003/20260617081220-errors-as-data-migration.md) — migrated the error class hierarchy to `Box` unions (BREAKING); precedent that breaking foundation changes are acceptable when the design is better.
- [20260527023826-result-maperr-and-json-codec.md](.workaholic/tickets/archive/work-20260513-182057/20260527023826-result-maperr-and-json-codec.md) — added a missing core `Result` combinator (`mapErr` + eliminator); precedent for "foundation semantics addition."
- [20260626122207-refactor-spec-validation-examples-to-cast-refine.md](.workaholic/tickets/archive/work-20260626-221353/20260626122207-refactor-spec-validation-examples-to-cast-refine.md) — replaced hand-rolled `if`-checks with `cast` + `refine`; the exact "reduce unsophisticated boilerplate via core combinators" refactor.
- [20260529231826-skill-compliance-soft-polish-across-packages.md](.workaholic/tickets/archive/work-20260528-143038/20260529231826-skill-compliance-soft-polish-across-packages.md) — prior codebase-wide plgg-style sweep; methodological precedent for a repo-wide audit.
- [20260527175426-unify-match-nonexhaustive-runtime-with-coverageerror.md](.workaholic/tickets/archive/plgg-http-client/20260527175426-unify-match-nonexhaustive-runtime-with-coverageerror.md) — `match` non-exhaustive runtime unified with `CoverageError`; combinator-consistency history to build on.

Already-ticketed and **explicitly out of scope** (branded-type axis — cross-reference, do not re-propose):

- [20260701013300-refine-softstr-to-str-domain-strings.md](.workaholic/tickets/todo/a-qmu-jp/20260701013300-refine-softstr-to-str-domain-strings.md), [20260701013301-brand-case-shaped-strings-kebabcase.md](.workaholic/tickets/todo/a-qmu-jp/20260701013301-brand-case-shaped-strings-kebabcase.md), [20260701013302-refine-number-to-int-ids-counts.md](.workaholic/tickets/todo/a-qmu-jp/20260701013302-refine-number-to-int-ids-counts.md), [20260701013303-refine-number-to-sized-uint-resource-quantities.md](.workaholic/tickets/todo/a-qmu-jp/20260701013303-refine-number-to-sized-uint-resource-quantities.md), [20260701013304-refine-opacity-number-to-float.md](.workaholic/tickets/todo/a-qmu-jp/20260701013304-refine-opacity-number-to-float.md), [20260701195048-defineSite-typed-author-facing-input.md](.workaholic/tickets/todo/a-qmu-jp/20260701195048-defineSite-typed-author-facing-input.md) — the six loose-type-sweep outputs owning the branded-type refinement axis.

## Implementation Steps

The "implementation" of this ticket is the survey process. It writes **no changes under `packages/`**; its output is new todo tickets.

1. **Load the lens.** Read the policies listed above plus `plgg-coding-style` and `.workaholic/constraints/{architecture,quality}.md`. These are the acceptance filter for every proposal.

2. **Fix the foundation baseline.** From `packages/plgg/src/index.ts` and the category directories, enumerate what the foundation already exports per category (Abstracts…Grammaticals). A proposal that duplicates an existing export is rejected. Record the exact export surface for `Box`/`Pattern` (Contextuals), `Brand` (Grammaticals), `Result`/`Option` (Disjunctives), and the `Flowables`/`Functionals` combinators.

3. **Confirm and extend the candidate list.** Validate each seed candidate below against the **evidence bar** (≥2 real repetition sites cited by `file:line`, a named home category, and a before/after sketch). Grep the full `packages/*` tree for the shape to find sites discovery may have missed. Reject or downscope any candidate that fails the bar, and note it in the analysis with the reason.

   Seed candidates (combinator axis; all in scope):
   - **`defineVariant(tag)<Payload>()` → `{ make, pattern, is, type }`** — collapses the four-fold `Box` variant scaffold (`type` + constructor + `xxx$` + `isXxx`) into one call, single-sourcing the tag literal. Sites: HttpError (8×), CliError, ClientError, Provider, Segment, Html, SqlError. Home: Contextuals (beside `Box`/`Pattern`). Hardest part: tag-literal inference and exhaustive-union typing **without `as`** — the proposal must sketch this or be flagged.
   - **`defineUnion` / fold helper** (pairs with `defineVariant`) — a typed fold over a set of variants, so `httpErrorToResponse`-style folds stay exhaustive by construction. Validate whether `match` already suffices before proposing; only propose if it removes real ceremony.
   - **`refinedBrand(tag, qualify, errorFor)` → `{ type, is, as, unwrap }`** — collapses the refined-brand smart-constructor idiom (qualify predicate + `isX` guard + `asX` triple-branch caster + `xString` unwrapper) into one factory driven by a single predicate. Sites: `Version`, `TenantId` (+ grep for more). Home: Grammaticals (beside `Brand`). Must interoperate with `cast`/cast-error vocabulary.
   - **`Ord`/`compare` primitive** — a total-order combinator to replace hand-rolled `-1/0/1` ternaries. Sites: `compareVersion`, `serializeQuery`. Home: an Abstracts typeclass + a `Functionals` helper (e.g. `compareBy`, `sortBy`). Consider whether it composes with the branded scalars owned by the deferred tickets.
   - **`wrapCause(tag)` / standard `unknown → Box` error adapter** — one helper for the recurring ad-hoc `toSqlError`-style adapters (cf. foundation `toCause`). Sites: `toSqlError`, `toCause`, and grep for peers. Home: Exceptionals/Contextuals.

4. **For each accepted finding, write a drivable follow-up ticket** via the normal ticket format (frontmatter, `## Policies`, `## Key Files` with the cited repetition sites, `## Implementation Steps` including the migration of every listed site + spec coverage, and its **own `## Quality Gate`** with `tsc-plgg.sh`/`test-plgg.sh` green + ≥90% coverage). Each ticket names the combinator's home category and states the `src/index.ts` wiring. Order them and set `depends_on` where a combinator must exist before a call-site migration ticket can consume it (e.g. define `defineVariant` before migrating HttpError). Write them under `.workaholic/tickets/todo/a-qmu-jp/`.

5. **Write the analysis record** (as part of this ticket's driven output, e.g. its archive/story or a short summary in the driving commit) listing: accepted findings → their tickets, and **rejected candidates with the reason they failed the bar** (already-exists, single-site, cannot-type-without-escape-hatch, better-owned-by-a-deferred-ticket). This makes the survey's coverage auditable.

6. **Verify no code changed.** Confirm `git status` shows only new ticket files under `.workaholic/tickets/`, and zero diff under `packages/`.

## Quality Gate

The deliverable is follow-up tickets, not code. The gate below is what `/drive` surfaces at approval and forwards into the commit `Verify:` key.

**Acceptance criteria** — the checkable conditions that must hold:

- **Zero code change:** `git diff --stat -- packages/` is empty; the only additions are new ticket files under `.workaholic/tickets/todo/a-qmu-jp/`.
- **Scope respected:** no spun-off ticket re-proposes any branded-type refinement owned by the six deferred todo tickets; each such adjacency is cross-referenced instead.
- **Every accepted finding is a well-formed, drivable ticket:** valid frontmatter (all 8 fields), a non-empty `## Policies` section, `## Key Files` citing ≥2 repetition sites by `file:line`, `## Implementation Steps` that migrate every cited site plus ship co-located spec coverage, and its own `## Quality Gate`. `depends_on` is set wherever a combinator must land before its call-site migration.
- **Evidence bar enforced:** each proposed foundation combinator/type is backed by ≥2 concrete cited sites, names its home plgg category (one of the eleven; a new category is called out as an explicit architecture decision), and includes a before/after sketch. No proposal relies on `as`/`any`/`@ts-ignore`/`@ts-expect-error`; any candidate that cannot be typed without one is either redesigned or recorded as rejected with that reason.
- **Coverage is auditable:** the analysis record lists accepted findings→tickets AND rejected candidates with their rejection reason, so a reviewer can confirm nothing was silently dropped.

**Verification method** — how the above are proven:

- `git status --porcelain` / `git diff --stat -- packages/` inspected live in-session (no `packages/` diff).
- Each new ticket passes the `plugins/workaholic/hooks/validate-ticket.sh` shape check (correct location + frontmatter) and reads cleanly against the create-ticket File Structure.
- Manual read-through: for each ticket, the ≥2 cited sites are opened and confirmed to exhibit the claimed repetition; the proposed signature is sanity-checked against the no-escape-hatch rule.

**Gate** — what must pass before approval:

- No diff under `packages/`; N follow-up tickets exist under `todo/a-qmu-jp/`, each shape-valid and independently drivable; the analysis record enumerates accepted + rejected candidates; and the author confirms the proposed combinators match the intended plgg vocabulary and category placement.

## Considerations

- **`defineVariant` tag inference is the crux.** The whole four-fold-collapse value depends on inferring the literal tag type and producing an exhaustive union **without `as`**. If a clean signature isn't reachable, the honest outcome is a *reduced* helper (e.g. constructor+guard only) or a rejected finding — not an escape hatch (`packages/plgg/src/Contextuals/Box.ts`, `Pattern.ts`; `.workaholic/constraints/quality.md`).
- **Don't over-abstract the good parts.** The `cast` + `forProp`/`forOptionProp`/`refine` object-validation path and the `Option`/`Result` map/chain/match surface are already idiomatic; proposing eliminators there would add ceremony, not remove it (`packages/plgg/src/Disjunctives/`, `Functionals/index.ts`).
- **Category placement is a real decision.** `defineVariant`/`defineUnion` and `wrapCause` touch Contextuals/Exceptionals; `refinedBrand` touches Grammaticals; `Ord`/`compare` may want a new Abstracts typeclass. Landing anything in a *new* top-level category requires the explicit architecture decision the constraints demand — flag it, don't sneak it (`.workaholic/constraints/architecture.md`).
- **Breaking changes are allowed but must be sequenced.** plgg is its own only consumer, so a combinator can replace an idiom outright — but the follow-up tickets must order the core addition before the call-site migrations via `depends_on`, and rebuild dependents after core edits (dependency direction is strictly upward).
- **Branded-type boundary.** `refinedBrand` and `Ord`/`compare` sit adjacent to the deferred `Str`/`Int`/`Uint`/`Float` tickets; the survey must interoperate with (not duplicate) them — e.g. a `compare` primitive should compose with those branded scalars once they exist (`todo/a-qmu-jp/20260701013302-*.md` and siblings).
- **The research ticket produces tickets when driven.** `/drive` on this ticket writes new todo files rather than editing code; the archive step still commits normally, but the commit's substance is tickets + the analysis record, and `Verify:` should assert the empty `packages/` diff.
