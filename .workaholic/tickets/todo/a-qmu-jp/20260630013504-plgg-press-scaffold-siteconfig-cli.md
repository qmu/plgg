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

# Create plgg-press: scaffold the facade — package, SiteConfig contract (incl. home data + allowedHosts), href helper, config-loading CLI (plgg-bundle TS hook), build()/dev() skeleton

## Overview

Scaffold the NEW first-party workspace package plgg-press: the reusable VitePress-like software facade. This ticket lands (a) the package itself (package.json with file: deps on plgg, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http; bundle.config.ts; .prettierrc.json; tsconfig.json; plgg-test.config.json >90%; src/index.ts barrel; a `bin/plgg-press.mjs` CLI entry), (b) the PUBLIC SiteConfig type + IA contract (SiteConfig/NavItem/SidebarGroup/SidebarItem typed Readonly records + a defineSite boundary caster) which ALSO owns the home/landing DATA (HomeConfig: title, tagline, actions, features) so the theme renders the home page generically, (c) the base-path/href helper plgg-press OWNS, (d) PressOptions (contentDir, outDir, assetsDir, config, base, dev flag, allowedHosts) and the programmatic build()/dev() API surface + the CLI dispatch as typed skeletons whose bodies are filled later, and (e) CLI CONFIG LOADING that reuses plgg-bundle's TS import hook to load the consumer's TS site.config, with cwd defaults and --config/--contentDir/--outDir flags and Result-style config-load errors.

**Proof of value:** plgg-test spec: `plgg-press` builds a dist exposing build/dev/defineSite/href/SiteConfig/loadConfig; defineSite validates a sample config (home data + allowedHosts, rejecting a bad one), href(/plgg/) prefixes internal links while leaving external/anchor links untouched, and loadConfig returns a typed ConfigLoadError on a bad path — green under scripts/test-plgg-press.sh, and `node bin/plgg-press.mjs` prints usage and loads a fixture TS config via the plgg-bundle hook.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new package follows the Category/usecase + colocated .spec.ts layout; CLI entry mirrors plgg-bundle/bin
- `workaholic:implementation` / `policies/coding-standards.md` — typed Readonly data, Option not null, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — SiteConfig/NavItem/SidebarGroup/SidebarItem/HomeConfig as typed records with a defineSite boundary caster (no-as)
- `workaholic:implementation` / `policies/vendor-neutrality.md` — file: deps only (plgg, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http) + existing typescript; no third-party doc-engine dep; CLI reuses plgg-bundle's existing TS load hook, adding nothing
- `workaholic:implementation` / `policies/test.md` — >90% coverage; defineSite + href + config-load specs

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/package.json` - template for plgg-press package.json (build/test/coverage scripts, exports, file: deps, typescript devDep)
- `/home/ec2-user/projects/plgg/packages/plgg-bundle/bin/plgg-bundle.mjs` - template for bin/plgg-press.mjs AND the TS import hook (register(./hook.mjs) at lines 11-16) the config loader reuses so a consumer's TS site.config loads via Node type-stripping
- `/home/ec2-user/projects/plgg/packages/plgg-bundle/package.json` - reference for the package.json "bin" field shape ({ "plgg-press": "bin/plgg-press.mjs" })
- `/home/ec2-user/projects/plgg/packages/plgg/src/Disjunctives/Option.ts` - Option for optional SiteConfig fields (no null/undefined)
- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - source of the IA shape the SiteConfig type must express (title, description, base, nav, sidebar groups, social) AND the home hero/features data SiteConfig must now own

## Dependencies

- Depends on [20260630013502-plgg-md-inline-fold-to-html.md](20260630013502-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, injected Highlighter + link-resolver seams, EXACT anchor-parity slugs, firstHeading, AST->Html<never> fold
- Depends on [20260630013503-plgg-highlight-ts-scanner.md](20260630013503-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner, with language-alias normalization

## Implementation Steps

1. Create packages/plgg-press with package.json (name plgg-press, type module, build: plgg-bundle, test: tsc --noEmit && plgg-test src, coverage script, bin: { "plgg-press": "bin/plgg-press.mjs" }), bundle.config.ts, tsconfig.json, .prettierrc.json (printWidth 50), plgg-test.config.json (>90% thresholds), src/index.ts barrel; dependencies plgg, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http via file:; devDeps plgg-bundle/plgg-test/typescript/@types/node.
2. Define the public contract src/SiteConfig/model: SiteConfig (title, description, base: SoftStr, nav: ReadonlyArray<NavItem>, sidebar: ReadonlyArray<SidebarGroup>, social, home: Option<HomeConfig>, dev: { allowedHosts: ReadonlyArray<SoftStr> }) where HomeConfig owns the landing DATA (title, tagline, actions: ReadonlyArray<{text,link}>, features: ReadonlyArray<{title,details}>); NavItem/SidebarGroup/SidebarItem as Box/Readonly records; implement defineSite(value): Result<SiteConfig, InvalidError> boundary caster (no-as).
3. Implement the href helper plgg-press OWNS: href(base)(path): SoftStr prefixing root-absolute internal links/images with base (DOCS_BASE), leaving external (scheme://) + #anchor links untouched, normalizing the typedoc file-relative/.md forms flagged by the spike. This is the single LinkResolver plgg-press injects into plgg-md.
4. Define PressOptions (contentDir, outDir, assetsDir, config, base, dev flag, allowedHosts) and add the programmatic API skeletons src/build.ts (export build(opts): PromisedResult<...>) and src/dev.ts (export dev(opts): PromisedResult<...>) as typed stubs returning a NotImplemented Result for now.
5. Create bin/plgg-press.mjs mirroring plgg-bundle's launcher (register the plgg-bundle TS import hook so a consumer's TS site.config loads via Node type-stripping, then import the TS CLI), and src/cli.ts that: resolves cwd defaults + reads --config/--contentDir/--outDir flags, LOADS the consumer's site.config.ts via the hooked dynamic import returning Result<SiteConfig, ConfigLoadError> (typed, no throw), then dispatches `build` -> build(), `dev` -> dev(), unknown -> usage.
6. Add specs: defineSite accepts a valid config (with home data + allowedHosts) and rejects a malformed one with InvalidError; href prefixes an internal root-absolute path with /plgg/, leaves https:// and #frag untouched, and normalizes a typedoc .md link; loadConfig returns Err (ConfigLoadError) for a missing/invalid config path — green under a new scripts/test-plgg-press.sh OR package-local `npm run test`.

## Considerations

- This ticket is the facade's contract surface; keep build()/dev() as stubs so the package compiles and ships a CLI before the pipeline tickets fill the bodies — a clean review boundary.
- SiteConfig is the SINGLE IA + home-data contract consumed by the theme and the build/dev pipelines AND by the guide's site.config.ts instance; keep it pure data with no rendering logic (item 6: home data lives here, theme renders it generically).
- PressOptions/SiteConfig.dev.allowedHosts (item 7) is consumed by the dev-server ticket and set by the guide instance (port-5181 / plgg-guide.qmu.dev tunnel host).
- CLI config loading (item 8) reuses plgg-bundle's existing TS import hook (bin/plgg-bundle.mjs:11-16) — no new dep, no separate transpile; config-load failures are Result-style ConfigLoadErrors, never throws.
- href is the ONE base-path rewrite site for the whole facade; plgg-md and the theme must route every link through it — never reconstruct base logic elsewhere.
