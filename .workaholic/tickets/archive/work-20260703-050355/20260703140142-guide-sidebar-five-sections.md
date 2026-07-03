---
created_at: 2026-07-03T14:01:42+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.25h
commit_hash: abbb8e7
category: Changed
depends_on:
---

# Reorganize the guide sidebar into five sections: Guide / Core / Library / plggmatic / plggpress

## Overview

Requested at sign-off: replace the 18 per-package top-level groups with five section groups — 1. Guide (getting started, core concepts, doc conventions), 2. Core (plgg with its prose pages), 3. Library (every mid/toolchain package as one leaf each, incl. the example tutorial), 4. plggmatic, 5. plggpress. Pure IA data change in packages/guide/site.config.ts; no theme or route changes.

## Policies

- `workaholic:design` / `policies/self-explanatory-ui.md` — the tree groups by role (foundation / libraries / framework / site tool), matching how the family is actually layered
- `workaholic:implementation` / `policies/coding-standards.md` — typed SiteConfigInput authoring, validated by defineSite

## Quality Gate

**Acceptance criteria:** sidebar renders exactly the five groups in the given order; every previously reachable page keeps a sidebar entry; the build's dead-link checker stays green. **Verification:** guide build (CheckLinks) + rendered-sidebar probe + developer eyeball on the dev preview. **Gate:** check-all green + developer approval.

## Final Report

Development completed as planned. The 18 per-package groups (plus Contributing) collapsed into the five requested sections; Doc conventions folded into Guide; Core carries plgg's overview and its two deep-dive pages flat; Library lists all 15 mid/toolchain packages (example tutorial last) as single leaves; plggmatic and plggpress each carry their Overview. Rendered groups verified: exactly Guide / Core / Library / plggmatic / plggpress in order, 30 sidebar links total, dead-link gate green. The dev preview needed a container restart (site.config.ts is the recorded no-hot-reload case) and now serves the new IA.
