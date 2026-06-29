---
created_at: 2026-06-30T01:34:58+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, Config]
effort:
commit_hash:
category:
depends_on:
---

# Spike: inventory the Markdown corpus, regenerate typedoc theme-less, and RECORD the grammar/slug/hero decisions

## Overview

Risk-first gate for the whole migration. Before any parser code is written, enumerate the EXACT Markdown construct set used across (a) authored prose/concept/package pages and (b) a regeneration of the typedoc API Markdown with typedoc-vitepress-theme removed. Produce a written subset spec AND record three downstream-blocking decisions: (1) the heading-slug algorithm that reproduces existing #anchor links, (2) ownership of the home hero/features content (the plgg-press theme homeHero, not nested-YAML parsing), (3) handling of raw angle-bracket/HTML sequences in prose. Capture current VitePress-rendered HTML as golden snapshots for later regression. Proves the keep-typedoc/drop-theme decision and bounds the parser scope.

**Proof of value:** A written subset spec + construct-frequency inventory + recorded slug algorithm, hero-ownership, and raw-HTML decisions, plus a theme-on-vs-theme-off typedoc diff and golden HTML snapshots in the scratchpad — demonstrably bounding the parser grammar and anchor convention.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — spike artifacts must live in a conventional scratch location, not littered through packages
- `workaholic:implementation` / `policies/coding-standards.md` — the recorded subset/slug/hero decisions bind later code to house style, so they are framed in coding-standard terms
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the spike confirms the zero-new-dep constraint is satisfiable by enumerating the constructs we must hand-roll
- `workaholic:operation` / `policies/ci-cd.md` — the typedoc regen must leave the repo green; restoring config is an ops concern

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/typedoc.base.json` - temporarily strip typedoc-vitepress-theme to regenerate theme-less Markdown for inspection; restore afterward
- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - run the existing per-package typedoc generator to produce api/<pkg>/*.md without the theme
- `/home/ec2-user/projects/plgg/packages/guide/packages/plgg/values-effects.md` - page whose authored #fragment links pin the required slug algorithm
- `/home/ec2-user/projects/plgg/packages/guide/packages/plgg-view.md` - page using ::: tip / ::: warning containers plus Markdown tables and raw angle-brackets
- `/home/ec2-user/projects/plgg/packages/guide/index.md` - the ONLY frontmatter in the corpus (nested home YAML: hero/features); source of the hero-ownership decision

## Implementation Steps

1. Grep the whole packages/guide tree for Markdown features: ATX headings (incl. h3/h4 from gen-api), fenced code with lang, pipe tables, ordered/unordered/nested lists, blockquotes, hr, inline bold/italic/code, links (note root-absolute vs relative/.md forms), images, raw angle-brackets/HTML, ::: containers, frontmatter keys; record counts per construct.
2. Temporarily remove 'typedoc-vitepress-theme' from typedoc.base.json's plugin array, run `npm run docs:api`, and diff against theme-on output to identify what the theme changed (link forms, anchors, sidebar JSON, raw HTML); confirm gen-api.mjs still emits ###/#### headings, ```ts fences, and its sidebar manifest.
3. Build the current VitePress site and save rendered HTML for ~5 prose pages + 2 API pages as golden snapshots under the scratchpad.
4. RECORD DECISIONS: (a) the heading-slug algorithm reproducing existing #fragment anchors (cite concrete corpus anchors), (b) home hero/features content is owned by the plgg-press theme homeHero (frontmatter parser only detects flat `layout: home`), (c) raw angle-bracket/HTML handling (escape via inline text vs guarded passthrough).
5. Write the SUBSET SPEC enumerating the exact block + inline constructs plgg-md must support, container/frontmatter handling, and the out-of-subset fallback; record any typedoc link form (file-relative/.md) the plgg-press href helper must handle; restore typedoc.base.json to its committed state (the theme removal lands in ticket 12).

## Considerations

- The make-or-break risk is hand-rolling a CommonMark-enough parser with zero deps; this spike must bound the grammar and pin the slug algorithm BEFORE coding.
- No production code changes land here; typedoc.base.json must be restored so the repo stays green.
- Slug-parity and hero-ownership decisions directly unblock the plgg-md fold, the plgg-press theme, the guide site.config instance, and VitePress removal — they must be written down, not left implicit.
