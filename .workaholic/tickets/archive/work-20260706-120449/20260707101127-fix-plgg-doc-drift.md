---
created_at: 2026-07-07T10:11:27+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX, Config]
effort: 0.5h
commit_hash: 15e01771
category: Changed
depends_on:
mission:
---

# Fix plgg Documentation Drift

## Overview

Align the public plgg documentation with the current implementation for the guide development workload, the plgg-highlight tokenizer migration, and public package import paths.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` - keep docs changes scoped to the existing documentation structure and package guide pages.
- `workaholic:implementation` / `policies/coding-standards.md` - preserve existing Markdown style, fenced examples, and package import conventions.
- `workaholic:operation` / `policies/ci-cd.md` - keep documented commands aligned with the scripts and build gates that CI and operators actually run.
- `workaholic:implementation` / `policies/objective-documentation.md` - public docs must describe the behavior and import surface that can be verified against code.

## Key Files

- `workloads/guide/README.md` - still describes the guide container as running `plggpress dev`.
- `workloads/guide/Dockerfile` - comment still names `plggpress dev` even though the entrypoint runs the guide package dev script.
- `scripts/serve-guide.sh` - comment still says the detached container runs `plggpress dev`.
- `packages/guide/packages/plgg-highlight.md` - still documents the retired TypeScript scanner implementation.
- `packages/guide/packages/plgg-parser.md` - examples import internal, non-exported parser subpaths.
- `packages/guide/packages/plgg-domain.md` - example imports `plgg-domain/index`, which is not exported.
- `packages/guide/packages/plgg-test.md` - example imports `plgg/index`, which is not exported.
- `packages/*/package.json` - export maps are the source of truth for public import paths.

## Related History

Recent work migrated plgg-highlight away from the TypeScript scanner and tightened public package surfaces, but several guide pages still describe the older shape. The guide workload entrypoint already documents the correct `plgg-bundle dev` path internally, while the README and Dockerfile comments lag behind.

## Implementation Steps

1. Replace user-facing guide workload references to `plggpress dev` with the actual `npm run dev` / `plgg-bundle dev bundle.config.ts` path.
2. Update the plgg-highlight guide page to describe the current `plgg-parser` tokenizer implementation and remove stale TypeScript scanner wording.
3. Change public guide examples to import from exported package roots: `plgg-parser`, `plgg-domain`, and `plgg`.
4. Re-run the docs verification commands and export-map scan used to find the drift.

## Quality Gate

**Acceptance criteria** - the checkable conditions that must hold:

- No public Markdown example imports a plgg package subpath that is missing from that package's `exports` map.
- The guide workload docs and Dockerfile no longer claim a `plggpress dev` command exists.
- The plgg-highlight guide page matches the current parser-backed implementation and does not claim runtime TypeScript scanner usage.

**Verification method** - the commands/tests/probes that prove them:

- `node <export-map-scan>` reports `count=0` for public Markdown imports.
- `npm run build` passes in `packages/guide`.
- `npm run build` passes in `packages/site`.
- `npm run examples` passes in `packages/site`.
- `rg -n "plggpress dev|ts\\.createScanner|typescript scanner" workloads packages/guide/packages/plgg-highlight.md scripts/serve-guide.sh --glob '!**/node_modules/**'` shows no stale user-facing claims.

**Gate** - what must pass before approval:

- All verification commands above pass, with only pre-existing Node module-type warnings acceptable.

## Considerations

- Do not touch the existing uncommitted plggmatic TypeScript work in the branch.
- The guide build currently emits Node `MODULE_TYPELESS_PACKAGE_JSON` warnings for packages without `"type": "module"`; record that separately if needed, but do not bundle it into this docs drift fix.

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: The Workaholic archive helper stages the whole worktree with `git add -A`.
  **Context**: In a dirty multi-contributor worktree, unrelated edits must be isolated before archiving a ticket-backed commit.
