---
created_at: 2026-07-04T18:52:03+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure]
effort: 2h
commit_hash: 8e006fc
category: Changed
depends_on: [20260704185201-vendor-boundary-policy-and-gate.md]
---

# Pilot migration: plgg-fetch to the domain/vendors layout

## Overview

Migrate one legacy-layout package to the canonical `src/domain/{model,usecase}/` + `src/vendors/` structure as the proof and recipe for the remaining ~18 packages. Pilot: **plgg-fetch** — it is small, it is not touched by the active plggmatic work on this branch, its native boundary is already perfectly isolated in one file (`src/Http/usecase/seam.ts`, the sole toucher of Web `Request`/`Response`/`Headers`/`URL`), and it exercises the Web-platform (non-`node:`) case of the boundary gate.

The migration: `src/Http/{model,usecase}/` becomes `src/domain/{model,usecase}/`; `seam.ts` moves to `src/vendors/fetch.ts` (canonical plural, top-level, per coding-standards); `index.ts` re-exports domain only; plgg-fetch comes OFF the gate's exemption list. The refactor is structural — public API surface via `index.ts` stays as-is (breaking changes would be acceptable, but none are needed). The resulting diff, written up as a short recipe in the audit/constraints doc, becomes the template for the per-package follow-up tickets that will migrate the rest (plgg-cli, plgg-md, plgg-sql, plgg-server, plgg-kit's `vendor/`→`vendors/` rename, …) — those follow-ups are filed after this pilot proves the recipe, not in this ticket.

plgg-fetch's program checkpoint: it is a library consumed by downstream programs; its domain is exercised end-to-end by its specs (with the seam faked) and by monorepo consumers — record that in the audit table rather than adding an artificial CLI.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — §Package internal directory layout: the target `src/domain/` · `src/vendors/` split and the plural `vendors/` naming (applies to all code work)
- `workaholic:implementation` / `policies/domain-layer-separation.md` — domain purity: after migration, no Web-platform type appears in a domain signature; only primitives + domain types + plgg types cross the vendor boundary
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the seam is an anti-corruption layer: `toFetchRequest`/`fromFetchResponse` keep translating vocabulary at exactly one place

## Key Files

- `packages/plgg-fetch/src/Http/usecase/seam.ts` - the existing boundary (sole toucher of Web fetch types); moves to `src/vendors/fetch.ts`
- `packages/plgg-fetch/src/Http/model/`, `packages/plgg-fetch/src/Http/usecase/` - become `src/domain/model/`, `src/domain/usecase/`; `HttpRequest`/`HttpResponse` and friends are the domain types
- `packages/plgg-fetch/src/index.ts` - re-export domain only, never `vendors/`; public surface unchanged
- `packages/plgg-fetch/tsconfig.json` - the `paths` self-alias (`plgg-fetch/*` → `./src/*`) keeps working; in-package import specifiers update to the new paths
- `packages/plgg-fetch/README.md` - update the layout/boundary description to the canonical vocabulary (domain / vendors / program checkpoint)
- `packages/plgg-db-migration/src/` - the layout being copied; keep file-role parity (vendors module doc comment declaring itself the sole toucher)
- `scripts/vendor-boundary-exemptions` file + audit table in `.workaholic/constraints/architecture.md` (from the gate ticket) - remove plgg-fetch's entry; add the migration recipe

## Related History

The gate ticket defines the target and the enforcement; the seam.ts convention this pilot retires into `vendors/` was itself the earlier iteration of the same discipline.

- [20260704185201-vendor-boundary-policy-and-gate.md](.workaholic/tickets/todo/a-qmu-jp/20260704185201-vendor-boundary-policy-and-gate.md) - foundation: rule, gate, exemption list, audit table this pilot updates
- [20260529000006-support-non-node-runtimes.md](.workaholic/tickets/archive/work-20260528-143038/20260529000006-support-non-node-runtimes.md) - the runtime-seam work that established the pattern seam.ts encodes

## Implementation Steps

1. `git mv` the trees: `src/Http/model` → `src/domain/model`, `src/Http/usecase` → `src/domain/usecase`, then `src/domain/usecase/seam.ts` → `src/vendors/fetch.ts` (preserve history with moves, not delete+create).
2. Update in-package import specifiers (self-alias paths) and `index.ts`; confirm `index.ts` exports nothing from `vendors/`.
3. Verify domain purity: with plgg-fetch removed from the exemption list, `scripts/gate-vendor-boundary.sh` must pass — no Web-SDK/`node:` import outside `vendors/`; ambient Web types (`Request`, `Response`) must not appear in any `src/domain/**` signature (manual sweep; the v1 gate does not catch ambient globals).
4. Keep the injectable-seam testing pattern: domain specs keep running with a faked vendor function; only `vendors/fetch.ts`'s own spec touches real Web types.
5. Remove plgg-fetch from the exemption list; update its audit-table row to "conforms" and record the step-by-step migration recipe (this diff, generalized) in the constraints doc for the follow-up per-package tickets.
6. Fresh `scripts/check-all.sh` — downstream consumers (`plgg-http` relation, anything importing plgg-fetch) rebuild against the new dist; stale dists hide exactly this class of drift.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `scripts/gate-vendor-boundary.sh` passes with `plgg-fetch` absent from the exemption list.
- `packages/plgg-fetch/src/` contains `domain/{model,usecase}/` and `vendors/` only (plus `index.ts`); no `Http/` directory and no `seam.ts` remain.
- No `src/domain/**` file references a Web-platform type (`Request`, `Response`, `Headers`, `URL`, `fetch`) in imports or public signatures — grep sweep documented in the drive session.
- plgg-fetch's public API via `index.ts` is unchanged: downstream packages compile without source edits.
- plgg-fetch tests green with coverage above the >90% thresholds; the moved specs still exercise the domain against a faked vendor.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/gate-vendor-boundary.sh` green in-session after exemption removal.
- `grep -rn` sweep for Web-platform identifiers under `packages/plgg-fetch/src/domain/` shown in-session.
- `scripts/tsc-plgg.sh` clean; plgg-fetch package tests green with coverage report; fresh `scripts/check-all.sh` green end-to-end.

**Gate** — what must pass before approval:

- Boundary gate green without the plgg-fetch exemption; fresh check-all green; coverage thresholds met; audit table updated with the row flipped to "conforms" and the migration recipe recorded.

## Considerations

- This is the recipe-setter: resist bundling a second package "while at it" — one package, one clean diff, then the recipe fans out as separate follow-up tickets per package (filed after this ticket ships).
- `plggmatic` and `plggmatic-example` are mid-drive on this branch — they are explicitly out of scope and stay exemption-listed.
- Preserve git history through `git mv`; a delete+create migration would destroy blame across the whole package (`packages/plgg-fetch/src/`).
- The v1 gate checks import locations only; the ambient-Web-global sweep in the acceptance criteria is the manual complement until a signature-level check exists (noted in the gate ticket's considerations).
- Keep the vendor module's doc-comment convention from the reference: it declares itself "the only place the package touches <API>" (`packages/plgg-db-migration/src/vendors/fs.ts`).

## Final Report

Landed in refactor `8e006fc`, archived in this housekeeping commit. The pilot
migration to the canonical domain/vendors layout — the recipe for the rest.

### What shipped
- `git mv` (history preserved): `src/Http/model` → `src/domain/model`,
  `src/Http/usecase` → `src/domain/usecase`, `src/Http/usecase/seam.ts` →
  `src/vendors/fetch.ts`. The empty `Http/` dir is gone; `src/` is now
  `domain/{model,usecase}` + `vendors/` + `index.ts` only.
- **The fetch call moved into `vendors/`.** `request` had called global
  `fetch()` and referenced `Response` directly — a pure move would have left a
  Web type in the domain. So `vendors/fetch.ts` gained `sendRequest(HttpRequest)
  → PromisedResult<HttpResponse, ClientError>` (the domain-only entry owning
  `fetch`/`Request`/`Response`), and `domain/usecase/request.ts` now delegates to
  it — no Web type in the domain. The vendor module carries the reference
  doc-comment ("the ONLY place this package touches the Web `fetch` platform").
- `index.ts` re-exports the domain only; the internal seam functions
  (`toFetchRequest`/`fromFetchResponse`/`messageOf`) left the public surface (no
  downstream consumer used them; the vendor's own spec imports them from the
  vendor path). Self-alias import specifiers rewired `Http/…` → `domain/…` /
  `vendors/…`.
- The migration recipe is recorded in `.workaholic/constraints/architecture.md`
  (audit row flipped to the migrated pilot); the plgg-fetch README documents the
  domain/vendors layout.

### Decision (recorded)
- **Public API surface**: the domain client API (`request`/`get`/`post`/`put`/
  `patch`/`del` + the HTTP model + `ClientError` + `decodeJsonBody`) is
  unchanged — downstream compiles without edits (there are 0 downstream source
  consumers today). The vendor functions leaving the public index is the
  intended cleanup (they returned Web types and should never have been public).

### Verification (all ACs)
- `src/` contains `domain/{model,usecase}/` + `vendors/` + `index.ts` only; no
  `Http/`, no `seam.ts`.
- Precise domain-purity sweep: **0** Web-type usages (`: Response`,
  `new Headers`, `fetch(`, `Promise<Response>`) in `domain/**` production code.
- `scripts/gate-vendor-boundary.sh` green with plgg-fetch **conformant** (now a
  `domain/` layout, unexempted — it was never exempted since its seam touched
  only *ambient* Web globals, which the v1 import-location gate does not flag).
- `tsc-plgg` clean; plgg-fetch tests **27 passed**, coverage 100/100/96.97/100
  (>91 gate); `request.spec` kept green unchanged (it stubs global `fetch`, which
  `sendRequest` still calls).
- Fresh `scripts/check-all.sh` **EXIT 0** end-to-end (downstream rebuilds against
  the new dist; 15 conformant / 6 exempted).

### Follow-ups
- The remaining ~14 legacy-layout packages migrate as per-package follow-up
  tickets using the recorded recipe; plgg-kit's `LLMs/vendor/` → `vendors/`
  rename and the other `seam.ts` variants are next candidates.
- Ticket 20260704185202 (plgg-bundle domain leak-fix) is the other 185201
  dependent — still pending; it removes plgg-bundle's exemption.
