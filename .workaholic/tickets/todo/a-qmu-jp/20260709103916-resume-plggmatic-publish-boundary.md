---
created_at: 2026-07-09T10:39:16+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Resume: settle plggmatic publish boundary before extraction B/C

## Overview

**Carry Origin:** `.workaholic/tickets/todo/a-qmu-jp/20260708195656-init-and-populate-plggmatic-repo.md` — carried on 2026-07-09 because the session was ending; this resumption ticket supersedes ticket B's remaining work and should be driven before ticket C.

Ticket B was started but not completed. The initial blocker was that `plgg-ui@0.1.0` was not published while `plgg@0.0.27`, `plgg-view@0.0.1`, and `plggpress@0.0.1` were published. The session patched `scripts/publish-npm.sh` to support `ONLY=plgg-ui`, added `"files": ["dist"]` to `packages/plgg-ui/package.json`, and fixed an unrelated `plgg-content` gate failure caused by the new `HtmlBlock` variant in `plgg-md`. Work stopped at a product-boundary concern: the standalone `../plggmatic` repo should consume published packages, but should not force publication of `plgg-content`, `plgg-mcp`, or `plgg-domain` just because the current local `plggpress` has grown CMS/server features.

## Policies

- `workaholic:design` / `policies/modular-monolith-first.md` — governing policy: the split is the exception; keep the boundary justified and document the plggmatic/plggpress package split.
- `workaholic:design` / `policies/sacrificial-architecture.md` — keep the rebuildable identity/showcase separate from durable core packages.
- `workaholic:design` / `policies/vendor-neutrality.md` — the cross-repo edge is a published contract; do not publish unrelated packages just to satisfy local monorepo coupling.
- `workaholic:implementation` / `policies/directory-structure.md` — `../plggmatic` should keep the standard top-level layout.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- `workaholic:implementation` / `policies/type-driven-design.md` — the moved `Theme` contract and palette override API stay typed across the boundary.
- `workaholic:implementation` / `policies/test.md` — moved specs stay green standalone; coverage remains above the enforced threshold.
- `workaholic:operation` / `policies/ci-cd.md` — local script-driven publish and verification remain the release path.
- `workaholic:implementation` / `policies/command-scripts.md` — canonical scripts should remain the single development and publish interface.

## Implementation Steps

1. Verify the current registry state with `npm view plgg-ui@0.1.0 version`, `npm view plggpress@0.0.1 dependencies --json`, and the focused preflight `PREFLIGHT=1 ONLY=plgg-ui ./scripts/publish-npm.sh`.
2. Decide and implement the narrow docs-builder boundary before populating `../plggmatic`: either pin the extracted `site` to the already-published `plggpress@0.0.1` for this extraction, or split a small published SSG package from local `plggpress` so the extracted docs site does not need `plgg-content`, `plgg-mcp`, or `plgg-domain`.
3. Reconcile the in-flight publish patches already present in the working tree: keep `ONLY=...` support in `scripts/publish-npm.sh`, keep `"files": ["dist"]` in `packages/plgg-ui/package.json`, and keep the `HtmlBlock` handling in `packages/plgg-content/src/Ingest/usecase/chunkBlocks.ts` if the full gate still needs it.
4. If `plgg-ui@0.1.0` is still unpublished, publish only `plgg-ui` through the focused path after npm login: `ONLY=plgg-ui ./scripts/publish-npm.sh`. Do not publish `plgg-content`, `plgg-mcp`, or `plgg-domain` unless the boundary decision explicitly requires them.
5. Resume ticket B's populate-only extraction after the published-dependency boundary is settled: scaffold `/home/ec2-user/projects/plggmatic`, copy the `plggmatic`, `plggmatic-example`, and `site` cluster without `node_modules`, rewrite cross-repo deps to published `^version` ranges, write the split ADR, and run the standalone `../plggmatic` checks.
6. Only after the standalone `../plggmatic` check is green, resume ticket C to remove `packages/plggmatic`, `packages/plggmatic-example`, and `packages/site` from this monorepo while keeping `packages/plgg-ui`.

## Quality Gate

**Acceptance criteria:**

- The plggmatic extraction uses only published npm package ranges across the repo boundary.
- The extracted docs-site build does not require publishing unrelated CMS/server packages (`plgg-content`, `plgg-mcp`, `plgg-domain`) unless a deliberate SSG/package split decision records why.
- `../plggmatic` has the standard layout (`packages/`, `scripts/`, `README.md`, `CLAUDE.md`, `docs/` with the split ADR + Pragmatic concept/specs).
- Every moved `package.json` has no external `file:../` dependency pointing back into `/home/ec2-user/projects/plgg`.
- The split ADR records the modular-monolith rationale, the dependency decision log, and the D13/D1/D16 amendment.
- `../plggmatic` check-all passes standalone.
- The plgg monorepo remains green until ticket C removes the cluster.

**Verification method:**

- `PREFLIGHT=1 ONLY=plgg-ui ./scripts/publish-npm.sh` reports only `plgg-ui@0.1.0` when `plgg-ui` is the only needed unpublished package.
- `npm view plgg-ui@0.1.0 version` resolves before `../plggmatic` installs.
- `grep -rn "file:\\.\\./" ../plggmatic/packages/*/package.json` returns nothing pointing outside `../plggmatic`.
- `../plggmatic/scripts/check-all.sh` passes.
- This repo's relevant focused gates pass before committing the carry-forward patches; at minimum `./scripts/test-plgg-content.sh` for the `HtmlBlock` fix and the publish preflight for `scripts/publish-npm.sh`.

**Gate:**

- Published-dependency boundary settled and documented, `plgg-ui` published if needed, `../plggmatic` green standalone, and no forced publication of unrelated packages.

## Findings

- `npm view` confirmed `plgg@0.0.27`, `plgg-view@0.0.1`, and `plggpress@0.0.1` were published; `plgg-ui@0.1.0` initially returned `404 Not Found`.
- `npm whoami` returned `E401 Unauthorized` during the investigation, so unauthenticated publish attempts can fail with misleading `404 Not Found - PUT https://registry.npmjs.org/plgg-ui`.
- `scripts/publish-npm.sh` originally scanned the whole monorepo and would publish every public package whose local version exceeded the registry version; the session patched `ONLY=plgg-ui` so focused publishing can avoid unrelated packages.
- A full publish gate hit `plgg-content` because local `plgg-md` added `HtmlBlock`; `chunkBlocks.ts` was missing that match branch. The session patched it and `./scripts/test-plgg-content.sh` passed with 126 tests.
- `npm view plggpress@0.0.1 dependencies --json` shows the published plggpress is small (`plgg`, `plggmatic`), while local `plggpress` has grown imports of `plgg-content`, `plgg-mcp`, and other CMS/server features.

## Decisions

- Do not publish `plgg-content`, `plgg-mcp`, or `plgg-domain` merely to unblock the plggmatic extraction; that would couple the design-system/docs split to unrelated CMS/server libraries.
- Treat the correct long-term boundary as a small plggpress SSG/docs-builder surface plus a separate CMS/server surface, or pin this extraction to the already-published `plggpress@0.0.1` until that split is implemented.
- Keep publish safety in the repo script path rather than raw `npm publish`, because the script stages files and rewrites `file:` dependencies to published `^version` ranges.

## Considerations

- Uncommitted working-tree changes exist in `scripts/publish-npm.sh`, `packages/plgg-ui/package.json`, `packages/plgg-content/src/Ingest/usecase/chunkBlocks.ts`, and `packages/plgg-content/src/Ingest/usecase/chunkBlocks.spec.ts`; do not discard them.
- The original ticket B and ticket C are still queued. This resumption ticket supersedes B's remaining work; after this ticket lands, the developer can remove or archive the superseded B ticket through the normal workflow.
- The target repo `/home/ec2-user/projects/plggmatic` was observed as initialized but empty except for `.git`.
