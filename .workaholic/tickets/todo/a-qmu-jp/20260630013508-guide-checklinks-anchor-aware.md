---
created_at: 2026-06-30T01:35:08+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013507-guide-build-router-static.md]
---

# Guide checkLinks: anchor-aware build-time dead-link validation

## Overview

Replace VitePress's dead-link detection with an anchor-aware build-time check, split out from the build ticket. checkLinks collects every internal href and emitted heading slug while rendering, then validates: (a) path-level links against the discovered route set (with trailing-slash/index equivalence), and (b) #fragment links against the generated slugs of the target page — comparing UNPREFIXED routes since links are base-prefixed via href. Returns Result<void, BrokenLinks> that fails the build, catching the broken-anchor case the reviews flagged.

**Proof of value:** plgg-test spec: checkLinks passes on a fixture with valid path+anchor links (incl. a trailing-slash variant) and returns BrokenLinks for a bad route and a non-existent #anchor — green under plgg-test.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — checker module placement under packages/guide/src
- `workaholic:implementation` / `policies/coding-standards.md` — Result not throw, data-last pipeline, printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — BrokenLinks as a typed Box error carrying the offending href + reason
- `workaholic:implementation` / `policies/test.md` — specs for path, trailing-slash, and anchor cases

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/src/build.ts` - build pipeline that produces the per-page links + slugs; checkLinks plugs in before/after write
- `/home/ec2-user/projects/plgg/packages/plgg-md/src/index.ts` - renderMarkdown surfaces links + slugs per page (ticket 4) consumed by the checker

## Dependencies

- Depends on [20260630013507-guide-build-router-static.md](20260630013507-guide-build-router-static.md) — Guide build.ts + guideRouter: wire parse→highlight→theme→Ssg into a static build

## Implementation Steps

1. Implement checkLinks(pages): collect a map of route → emitted slugs and a flat list of (sourcePath, href) internal links from the renderMarkdown output.
2. Normalize each href: strip the DOCS_BASE prefix, normalize trailing-slash/index equivalence (e.g. '/concepts/option' ≡ route '/concepts/option/'), and split off any #fragment.
3. Validate path part against the discovered route set; validate the #fragment against the target page's slug set; ignore external (scheme://) links.
4. Return Result<void, BrokenLinks> (typed Box listing each broken href + reason); wire it into build.ts so a broken link fails the build.
5. Add specs: a missing route, a trailing-slash mismatch that should PASS, and a broken #anchor that should FAIL.

## Considerations

- Anchor validation depends on the slug-parity work in ticket 4; the slug set per page must be the SAME function that emits heading ids.
- Compare unprefixed routes — links are base-prefixed via href, the route set is not.
- Keep it pure (operates on collected data); no fs access.
