---
created_at: 2026-06-30T10:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.5h
commit_hash: 431c9f5
category: Changed
depends_on:
---

# plgg-press sidebar: clearer section hierarchy, even spacing, consistent collapse carets

# Overview

Browser feedback: the sidebar spacing was not pretty and the collapse caret read as if only "API reference" had a toggle. Root cause: top-level sections and nested groups were styled identically (same weight, muddy hierarchy), the vertical rhythm was uneven, and the nested left-border indent was heavy. Fix: give top-level groups a distinct `vp-group`/`vp-group-title` class (bolder section titles with clear top-margin separation), put every leaf link and nested toggle on one even rhythm with a subtle indent rail, add an extra indent step for nested items, and keep the rotating caret on EVERY collapsible section (sections + nested groups), styled clearly. Verified in light and dark.

# Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — changes live in packages/plgg-press/src/theme (baseCss + sidebarTree)
- `workaholic:implementation` / `policies/coding-standards.md` — typed view-functions, printWidth 50, CSS stays escape-safe (no < > &)
- `workaholic:design` / `policies/emergent-design-system.md` — a coherent spacing/indent scale for the sidebar hierarchy
- `workaholic:design` / `policies/self-explanatory-ui.md` — the collapse affordance (caret) must be clear and consistent on every collapsible section

# Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/sidebarTree.ts` - top-level group details/summary get vp-group / vp-group-title classes
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/baseCss.ts` - sidebar section/item spacing, indent rail, caret on all summaries

# Implementation Steps

1. sidebarTree.ts: tag top-level group `<details>` with `vp-group` and its `<summary>` with `vp-group-title`.
2. baseCss: `.vp-group` margin-top for section separation (first-child none); `.vp-group-title` bold 0.9rem section header with the caret; every `.vp-sidebar a` and nested `summary` on one rhythm (0.3rem padding, 0.875rem, indent rail via a 1px divider left-border, hover darkens); nested items get an extra indent step; active link = brand colour + 2px brand left-border; caret on all summaries rotates open->down.
3. Verify VISUALLY in light AND dark via headless screenshots; confirm even spacing, clear hierarchy, and a caret on every collapsible section.

# Considerations

- No `>` child combinators (escape-safe `<style>`); top-level vs nested is distinguished by the `vp-group` class and `details details` descendant selectors, not child combinators.
- The indent rail uses the theme `--vp-divider` so it adapts to dark mode.
- Leaf links (e.g. some packages' flat "Guide"/"API reference") correctly show no caret; only `<details>` sections do — the inconsistency the feedback noticed was the muddy spacing, now resolved.

## Final Report

Development completed and verified in light + dark (headless). Top-level sections now use vp-group/vp-group-title (bold, clear top-margin separation); leaf links and nested toggles share one even rhythm with a subtle indent rail; nested items get an extra indent step; the active link is brand-coloured with a 2px brand left-border; the rotating caret shows on EVERY collapsible section (Guide, plgg (core), plgg-http, ... and nested Core concepts / Guide / API reference), not just API reference. Verified: tsc clean; 83 passed/0 failed; check-all green pending; sidebar reads clean and hierarchical in both themes.

### Discovered Insights

- **Insight**: The "only API reference has a toggle" perception came from muddy spacing (sections and nested groups styled the same weight) — the carets were present on all sections but visually lost. Distinguishing the top-level section (vp-group-title, bold, spaced) from nested groups (lighter, indented) makes the hierarchy and the per-section toggle legible.
  **Context**: Without `>` child combinators (escape-safe CSS), top-level vs nested is distinguished by the vp-group class + `details details` descendant selectors.
