---
created_at: 2026-06-30T01:35:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, Config]
effort:
commit_hash:
category:
depends_on: [20260630013502-plgg-md-inline-fold-to-html.md, 20260630013503-plgg-highlight-ts-scanner.md]
---

# Create plgg-press: scaffold the VitePress-like facade — package, SiteConfig contract, href helper, build()/dev() API + CLI skeleton

## Overview

Scaffold the NEW first-party workspace package plgg-press: the reusable VitePress-like software facade. This ticket lands (a) the package itself (package.json with file: deps on plgg, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http; bundle.config.ts; .prettierrc.json; tsconfig.json; src/index.ts barrel; a `bin/plgg-press.mjs` CLI entry), (b) the PUBLIC SiteConfig type + information-architecture contract (SiteConfig/NavItem/SidebarGroup/SidebarItem typed Readonly records + a defineSite boundary caster), (c) the base-path/href helper that plgg-press OWNS (href(base)(path): prefixes root-absolute internal links/images with DOCS_BASE, leaves external/anchor links untouched, handles the typedoc file-relative/.md forms the spike flagged), and (d) the programmatic build()/dev() API surface + the CLI dispatch (`plgg-press build` / `plgg-press dev`) as typed skeletons whose bodies are filled by tickets 9 and 11. No theme/build internals yet — this is the package shell + contracts the rest of the facade hangs off.

**Proof of value:** plgg-test spec: `plgg-press` builds a dist exposing build/dev/defineSite/href/SiteConfig; defineSite validates a sample config (rejecting a bad one) and href(/plgg/) prefixes internal links while leaving external/anchor links untouched — green under a new scripts/test-plgg-press.sh, and `node bin/plgg-press.mjs` prints usage.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new package follows the Category/usecase + colocated .spec.ts layout; CLI entry mirrors plgg-bundle/bin
- `workaholic:implementation` / `policies/coding-standards.md` — typed Readonly data, Option not null, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — SiteConfig/NavItem/SidebarGroup/SidebarItem as typed records with a defineSite boundary caster (no-as)
- `workaholic:implementation` / `policies/vendor-neutrality.md` — file: deps only (plgg, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http) + existing typescript; no third-party doc-engine dep
- `workaholic:implementation` / `policies/test.md` — >90% coverage; defineSite + href specs

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/package.json` - template for plgg-press package.json (build/test scripts, exports, file: deps, typescript devDep)
- `/home/ec2-user/projects/plgg/packages/plgg-bundle/bin/plgg-bundle.mjs` - template for bin/plgg-press.mjs: a .mjs launcher that hands off to the TypeScript CLI (Node type-stripping on load)
- `/home/ec2-user/projects/plgg/packages/plgg-bundle/package.json` - reference for the package.json "bin" field shape ({ "plgg-press": "bin/plgg-press.mjs" })
- `/home/ec2-user/projects/plgg/packages/plgg/src/Disjunctives/Option.ts` - Option for optional SiteConfig fields (no null/undefined)
- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - source of the IA shape the SiteConfig type must express (title, description, base, nav, sidebar groups, social)

## Dependencies

- Depends on [20260630013502-plgg-md-inline-fold-to-html.md](20260630013502-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, injected Highlighter + link-resolver seams, anchor-parity slugs, AST->Html<never> fold
- Depends on [20260630013503-plgg-highlight-ts-scanner.md](20260630013503-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner

## Implementation Steps

1. Create packages/plgg-press with package.json (name plgg-press, type module, build: plgg-bundle, test: tsc --noEmit && plgg-test src, bin: { "plgg-press": "bin/plgg-press.mjs" }), bundle.config.ts, tsconfig.json, .prettierrc.json (printWidth 50), src/index.ts barrel; dependencies plgg, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http via file:; devDeps plgg-bundle/plgg-test/typescript/@types/node.
2. Define the public contract src/SiteConfig/model: SiteConfig (title, description, base: SoftStr, nav: ReadonlyArray<NavItem>, sidebar: ReadonlyArray<SidebarGroup>, social) and NavItem/SidebarGroup/SidebarItem as Box/Readonly records; implement defineSite(value): Result<SiteConfig, InvalidError> boundary caster (no-as) so a guide's plain config object is validated at the seam.
3. Implement the href helper plgg-press OWNS: href(base)(path): SoftStr prefixing root-absolute internal links/images with base (DOCS_BASE), leaving external (scheme://) + #anchor links untouched, normalizing the typedoc file-relative/.md forms flagged by the spike. This is the single LinkResolver plgg-press injects into plgg-md (ticket 9).
4. Add the programmatic API skeletons src/build.ts (export build(opts: PressOptions): PromisedResult<...>) and src/dev.ts (export dev(opts: PressOptions): PromisedResult<...>) as typed stubs returning a NotImplemented Result for now; define PressOptions (contentDir, outDir, assetsDir, config, base, dev flag).
5. Create bin/plgg-press.mjs mirroring plgg-bundle's launcher (register hook if needed, then import the TS CLI), and src/cli.ts dispatching argv: `build` -> build(), `dev` -> dev(), unknown -> usage; export nothing else from the bin.
6. Add specs: defineSite accepts a valid config and rejects a malformed one with InvalidError; href prefixes an internal root-absolute path with /plgg/, leaves https:// and #frag untouched, and normalizes a typedoc .md link — green under `plgg-test src`.

## Considerations

- This ticket is the facade's contract surface; keep build()/dev() as stubs so the package compiles and ships a CLI before tickets 9/11 fill the bodies — a clean review boundary.
- SiteConfig is the SINGLE IA contract consumed by the theme (ticket 8) and the build/dev pipelines (9/11) AND by the guide's site.config.ts instance (ticket 13); keep it pure data with no rendering logic.
- href is the ONE base-path rewrite site for the whole facade; plgg-md and the theme must route every link through it — never reconstruct base logic elsewhere.
