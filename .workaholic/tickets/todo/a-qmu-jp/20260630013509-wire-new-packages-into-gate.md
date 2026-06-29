---
created_at: 2026-06-30T01:35:09+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013500-plgg-md-scaffold-frontmatter-block-ast.md, 20260630013501-plgg-md-inline-fold-to-html.md, 20260630013502-plgg-highlight-ts-scanner.md]
---

# Wire plgg-md + plgg-highlight into scripts/build.sh and check-all.sh with per-package test runners

## Overview

The canonical local gate enumerates packages by hand: scripts/build.sh builds dists in dependency order and scripts/check-all.sh runs per-package test runners. Add plgg-md and plgg-highlight to the build order and create scripts/test-plgg-md.sh + scripts/test-plgg-highlight.sh, listing them in check-all.sh, so the new packages' tsc/test/>90%-coverage run in the gate and file:-link build order is defined. Without this, the new packages never run in CI/local checks.

**Proof of value:** scripts/check-all.sh runs tsc + tests + >90% coverage for plgg-md and plgg-highlight (via the new runners) and scripts/build.sh produces their dists in dependency order — all green.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — runner scripts live in scripts/ following the existing test-plgg-*.sh pattern
- `workaholic:implementation` / `policies/command-scripts-policy.md` — consolidate into the canonical runner pattern rather than bespoke one-offs
- `workaholic:implementation` / `policies/test.md` — >90% coverage must be enforced for the new packages via the runners
- `workaholic:operation` / `policies/ci-cd.md` — the gate runners feed the run-tests CI path

## Key Files

- `/home/ec2-user/projects/plgg/scripts/build.sh` - dependency-ordered dist build; insert plgg-md + plgg-highlight after plgg/plgg-view
- `/home/ec2-user/projects/plgg/scripts/check-all.sh` - per-package runner list; add the two new test runners
- `/home/ec2-user/projects/plgg/packages/plgg-view/package.json` - reference test/coverage script shape (tsc --noEmit && plgg-test src) the new runners mirror

## Dependencies

- Depends on [20260630013500-plgg-md-scaffold-frontmatter-block-ast.md](20260630013500-plgg-md-scaffold-frontmatter-block-ast.md) — Create plgg-md: layout-marker frontmatter splitter + block tokenizer to a Box-union AST
- Depends on [20260630013501-plgg-md-inline-fold-to-html.md](20260630013501-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, Highlighter seam, anchor-parity slugs, and AST→Html<never> fold (renderMarkdown)
- Depends on [20260630013502-plgg-highlight-ts-scanner.md](20260630013502-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner

## Implementation Steps

1. Add plgg-md (after plgg-view) and plgg-highlight (after plgg-md, since it depends on plgg-md) to scripts/build.sh's dependency-ordered dist build.
2. Create scripts/test-plgg-md.sh and scripts/test-plgg-highlight.sh mirroring an existing scripts/test-plgg-view.sh (tsc + plgg-test + coverage).
3. List both new runners in scripts/check-all.sh.
4. Confirm coverage thresholds (>90%) are configured for the new packages (mirroring the plgg coverage config).
5. Run scripts/check-all.sh and confirm the new packages' tsc/test/coverage execute and pass.

## Considerations

- plgg-highlight depends on plgg-md (Highlighter type) and on a built typescript-importing module — build order must place it after plgg-md.
- MEMORY mandates >90% coverage; the runners must enforce it, not just run tests.
- This is local-gate wiring; the deploy workflow build loop is handled in ticket 15.
