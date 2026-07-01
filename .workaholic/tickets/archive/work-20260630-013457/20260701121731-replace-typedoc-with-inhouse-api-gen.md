---
created_at: 2026-07-01T12:17:31+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort:
commit_hash:
category: Removed
depends_on:
---

# Remove the guide's API reference and its typedoc dependencies

## Overview

Originally scoped as "replace typedoc with an in-house generator." On review
the maintainer decided the auto-generated API reference was **not worth
keeping at all** — the per-symbol pages were thin next to the hand-written
package guides — so the whole feature is removed rather than reimplemented.
This deletes the last non-workspace deps in the guide (`typedoc`,
`typedoc-plugin-markdown`) by deleting the thing that used them.

## Scope (what is removed)

- The generator + its config: `packages/guide/scripts/gen-api.mjs`,
  `packages/guide/typedoc.base.json`.
- The API-render golden check that only existed for those pages:
  `packages/guide/scripts/verify-render.mjs`, `scripts/golden-render.json`.
- The generated content: `packages/guide/api/**` (tracked `api/index.md` +
  the gitignored generated subtrees), and the now-obsolete `api/*/` rules in
  `packages/guide/.gitignore`.
- The two devDeps from `packages/guide/package.json` (`typedoc`,
  `typedoc-plugin-markdown`); `package-lock.json` regenerated.
- The `docs:api` and `verify:render` npm scripts; the `npm run docs:api &&`
  prefix dropped from `build` (both the guide `package.json` and the
  `.github/workflows/deploy-guide.yml` build step).
- `site.config.ts`: the `api/typedoc-sidebar.json` loader, `ApiEntry`/
  `ApiManifest`/`isApiEntry`/`loadApiManifest`, the per-package
  `apiReferenceNode` splice, the `api?: false` group flag, and the `API` nav
  leaf — leaving the sidebar prose-only.
- The `/api/…` links in the guide's own Markdown (the `::: tip Full API
  reference` callouts removed; the inline mentions reworded to point at the
  package source).

## Verification

- `npx plgg-press build` for the guide succeeds (built 25 pages, config parses,
  link check clean — no dangling `/api/` links).
- `grep -rn "/api/\|typedoc\|gen-api\|docs:api"` over the guide source is empty
  (dist build artifacts + two unrelated plgg-press test-wording mentions
  excluded).

## Considerations

- Vendor-neutrality: removes two third-party deps with zero replacement.
- "For now": if a reference is wanted later, the design in this ticket's
  history (parse plgg-bundle's emitted `.d.ts`, or drive the TS type-checker
  for full fidelity) is the starting point — but the maintainer's call is that
  a thin auto-reference is worse than none.
- The live guide (`plgg-guide.qmu.dev` → the dev container) loads `site.config`
  at startup, so the API nav/sidebar disappears only after the container is
  restarted; source is clean regardless.

## Policies

- `workaholic:implementation` / `policies/vendor-neutrality.md` — shed external
  deps; here by deleting the feature that needed them.
