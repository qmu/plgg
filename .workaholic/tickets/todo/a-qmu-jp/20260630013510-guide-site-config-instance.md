---
created_at: 2026-06-30T01:35:10+09:00
author: a@qmu.jp
type: refactoring
layer: [Config, Domain]
effort:
commit_hash:
category:
depends_on: [20260630013504-plgg-press-scaffold-siteconfig-cli.md, 20260630013509-typedoc-drop-theme-emit-manifest.md]
---

# Guide: add the typed site.config.ts INSTANCE (thin consumer of plgg-press SiteConfig)

## Overview

The guide half of the split site-config work: replace the VitePress configuration with a plain packages/guide/site.config.ts that declares the complete information architecture (title, description, base from DOCS_BASE, top nav, sidebar groups, social links) as an INSTANCE of plgg-press's SiteConfig type, splicing in the per-package API sidebar from gen-api's manifest. The SiteConfig TYPE + defineSite caster live in plgg-press (ticket 7); this ticket provides only the guide's data and validates it via defineSite. No `import { defineConfig } from 'vitepress'`.

**Proof of value:** plgg-test spec (or a guide-local check): defineSite over the ported guide config + a sample API manifest yields the expected typed SiteConfig with API entries spliced into the sidebar — green.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — site.config.ts placement at the guide package root (the file the CLI loads)
- `workaholic:implementation` / `policies/coding-standards.md` — typed Readonly data, Option not null, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — the instance is validated through plgg-press's defineSite boundary caster (no-as)

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - source of the IA to port: nav, PACKAGE_GROUPS, sidebar tree, socialLinks, base/DOCS_BASE wiring
- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - emits the per-package API sidebar manifest spliced into the sidebar
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/index.ts` - imports SiteConfig type + defineSite caster from the facade

## Dependencies

- Depends on [20260630013504-plgg-press-scaffold-siteconfig-cli.md](20260630013504-plgg-press-scaffold-siteconfig-cli.md) — Create plgg-press: scaffold the VitePress-like facade — package, SiteConfig contract, href helper, build()/dev() API + CLI skeleton
- Depends on [20260630013509-typedoc-drop-theme-emit-manifest.md](20260630013509-typedoc-drop-theme-emit-manifest.md) — Drop typedoc-vitepress-theme from typedoc config; keep markdown + emit a plain sidebar manifest

## Implementation Steps

1. Create packages/guide/site.config.ts importing { defineSite, SiteConfig } from 'plgg-press' and exporting the validated config: title, description, base (from DOCS_BASE env, default '/'), nav, sidebar, social.
2. Port the full nav + PACKAGE_GROUPS + Guide/Concepts/Contributing sidebar IA from .vitepress/config.ts verbatim (text/link nesting preserved).
3. Load gen-api's API sidebar manifest (JSON) at build time and splice the per-package API entries into the sidebar groups, mirroring the current typedoc-sidebar.json lookup; pass the merged data through defineSite for validation.
4. Add a spec asserting site.config parses through defineSite and the API entries splice in for at least one package.

## Considerations

- Consumed by plgg-press's build/dev via the CLI; keep it pure data with no rendering logic.
- base must thread DOCS_BASE consistently; plgg-press's href helper (ticket 7) is the single rewrite site — the guide does NOT reconstruct base logic.
- Vite's allowedHosts has no equivalent here — plgg-press's dev server (ticket 11) handles Host allowance at the node:http layer.
