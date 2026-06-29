---
created_at: 2026-06-30T01:35:05+09:00
author: a@qmu.jp
type: refactoring
layer: [Config, Domain]
effort:
commit_hash:
category:
depends_on: [20260630013504-typedoc-drop-theme-emit-manifest.md]
---

# Port .vitepress/config.ts to a typed plgg-native site.config.ts (information architecture)

## Overview

Replace the VitePress configuration with a plain, typed plgg-native site.config.ts declaring the complete information architecture (title, description, base from DOCS_BASE, top nav, sidebar groups, social links) as immutable plgg data, splicing in the per-package API sidebar from gen-api's manifest. This becomes the single IA contract the theme and build tool consume — no `import { defineConfig } from 'vitepress'`.

**Proof of value:** plgg-test spec: defineSite over the ported config + a sample API manifest yields the expected typed SiteConfig with API entries spliced into the sidebar — green under plgg-test.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new config module placement in packages/guide/src
- `workaholic:implementation` / `policies/coding-standards.md` — typed Readonly data, Option not null, no escape hatches
- `workaholic:implementation` / `policies/type-driven-design.md` — NavItem/SidebarGroup/SidebarItem as typed records with a boundary caster

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - source of the IA to port: nav, PACKAGE_GROUPS, sidebar tree, socialLinks, base/DOCS_BASE wiring, allowedHosts
- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - emits the per-package API sidebar manifest spliced into the sidebar
- `/home/ec2-user/projects/plgg/packages/plgg/src/Disjunctives/Option.ts` - Option for optional config fields (no null/undefined)

## Dependencies

- Depends on [20260630013504-typedoc-drop-theme-emit-manifest.md](20260630013504-typedoc-drop-theme-emit-manifest.md) — Drop typedoc-vitepress-theme from typedoc config; keep markdown + emit a plain sidebar manifest

## Implementation Steps

1. Create packages/guide/src/site.config.ts exporting typed SiteConfig data: title, description, base (from DOCS_BASE env, default '/'), nav: ReadonlyArray<NavItem>, sidebar: ReadonlyArray<SidebarGroup>, social.
2. Port the full nav + PACKAGE_GROUPS + Guide/Concepts/Contributing sidebar IA from .vitepress/config.ts verbatim (text/link nesting preserved).
3. Load gen-api's API sidebar manifest (JSON) at build time and splice the per-package API entries into the sidebar groups, mirroring the current typedoc-sidebar.json lookup.
4. Define SiteConfig/NavItem/SidebarGroup/SidebarItem types (Box/Readonly records) and defineSite(value): Result<SiteConfig, InvalidError> boundary caster (no-as) for the manifest merge.
5. Add a spec asserting the config parses and the API entries splice in for at least one package.

## Considerations

- Consumed by BOTH the theme (ticket 9) and the build/dev tools; keep it pure data with no rendering logic.
- base must thread DOCS_BASE consistently; the markdown/theme href helper (ticket 4) is the single rewrite site.
- Vite's allowedHosts has no equivalent here — the dev server (ticket 13) handles Host allowance at the node:http layer.
