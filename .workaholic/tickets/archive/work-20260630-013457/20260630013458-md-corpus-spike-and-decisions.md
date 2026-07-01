---
created_at: 2026-06-30T01:34:58+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, Config]
effort: 2h
commit_hash: d75e3be
category: Changed
depends_on:
---

# Spike: inventory the Markdown corpus, capture EXACT VitePress slugs + language inventory, regenerate typedoc theme-less, and RECORD the grammar/slug/hero/raw-HTML decisions

## Overview

Risk-first gate for the whole migration. Before any parser code is written, enumerate the EXACT Markdown construct set used across (a) authored prose/concept/package pages and (b) a regeneration of the typedoc API Markdown with typedoc-vitepress-theme removed. Produce a written subset spec AND record the downstream-blocking decisions: (1) capture the EXACT current VitePress heading slugs for punctuation/backticks/generics/em-dashes/duplicate headings so the plgg-md fold can reproduce them; (2) ownership of the home hero/features content (now SiteConfig home DATA rendered generically by the theme — NOT nested-YAML parsing); (3) raw angle-bracket/HTML handling DECISION = escape as TEXT for v1 (no raw-HTML AST node); (4) the code-fence LANGUAGE INVENTORY (every fence lang in the corpus + the alias normalization map ts/tsx/js/jsx/json) for the highlighter; (5) note that prose-page <title> derives from the first H1. Capture current VitePress-rendered HTML as golden snapshots for later regression. Proves keep-typedoc/drop-theme and bounds the parser scope.

**Proof of value:** A written subset spec + construct-frequency inventory + code-fence language/alias inventory + the EXACT captured VitePress slug set (punctuation/backticks/generics/em-dashes/duplicates) + recorded hero-ownership (SiteConfig data), raw-HTML-as-text, and title-from-H1 decisions, plus a theme-on-vs-theme-off typedoc diff and golden HTML snapshots in the scratchpad — demonstrably bounding the parser grammar and anchor convention.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — spike artifacts must live in a conventional scratch location, not littered through packages
- `workaholic:implementation` / `policies/coding-standards.md` — the recorded subset/slug/hero/raw-HTML decisions bind later code to house style, so they are framed in coding-standard terms
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the spike confirms the zero-new-dep constraint is satisfiable by enumerating the constructs we must hand-roll
- `workaholic:operation` / `policies/ci-cd.md` — the typedoc regen must leave the repo green; restoring config is an ops concern

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/typedoc.base.json` - temporarily strip typedoc-vitepress-theme to regenerate theme-less Markdown for inspection; restore afterward
- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - run the existing per-package typedoc generator to produce api/<pkg>/*.md without the theme
- `/home/ec2-user/projects/plgg/packages/guide/packages/plgg/values-effects.md` - page whose authored #fragment links pin the EXACT required slug algorithm
- `/home/ec2-user/projects/plgg/packages/guide/packages/plgg-view.md` - page using multi-colon (:::: / :::) containers plus Markdown tables and raw angle-brackets — source of the multi-colon container fixture
- `/home/ec2-user/projects/plgg/packages/guide/api/index.md` - hand-authored API landing using ::: tip; source of a multi-colon container fixture and typedoc link-form inventory
- `/home/ec2-user/projects/plgg/packages/guide/index.md` - the ONLY frontmatter in the corpus (home YAML: hero/features); source of the SiteConfig-home-data ownership decision

## Implementation Steps

1. Grep the whole packages/guide tree for Markdown features: ATX headings (incl. h3/h4 from gen-api), fenced code with lang, pipe tables, ordered/unordered/nested lists, blockquotes, hr, inline bold/italic/code, links (note root-absolute vs relative/.md forms), images, raw angle-brackets/HTML, ::: AND :::: containers, frontmatter keys; record counts per construct.
2. Build the code-fence LANGUAGE INVENTORY: list every distinct fence language string in the corpus and define the alias-normalization map the highlighter will use (typescript->ts, javascript->js, etc.), marking which normalize to the TS-scanner set (ts/tsx/js/jsx/json) and which fall back to plain escaped pre>code.
3. Capture the EXACT current VitePress heading slugs: render the site and extract the generated id= for headings containing punctuation, inline backticks, TS generics (<T>), em-dashes, and DUPLICATE heading text (to pin the de-dup suffix scheme); cite concrete corpus anchors the plgg-md fold must reproduce.
4. Temporarily remove 'typedoc-vitepress-theme' from typedoc.base.json's plugin array, run `npm run docs:api`, and diff against theme-on output to identify what the theme changed (link forms, anchors, sidebar JSON, raw HTML); confirm gen-api.mjs still emits ###/#### headings, ```ts fences, and its sidebar manifest.
5. Build the current VitePress site and save rendered HTML for ~5 prose pages + 2 API pages as golden snapshots under the scratchpad (consumed later by the guide/TypeDoc render-verification ticket).
6. RECORD DECISIONS: (a) the EXACT heading-slug algorithm reproducing the captured anchors (cite them), (b) home hero/features content is owned by SiteConfig home DATA rendered generically by the theme (frontmatter parser only detects flat `layout: home`), (c) raw angle-bracket/HTML = ESCAPE AS TEXT for v1 (no raw-HTML AST node; rely on plgg-view escape.ts), (d) the language inventory + alias map, (e) prose-page <title> derives from the first H1 (Option).
7. Write the SUBSET SPEC enumerating the exact block + inline constructs plgg-md must support (incl. 3+-colon containers), container/frontmatter handling, raw-HTML-as-text, and the out-of-subset fallback; record any typedoc link form (file-relative/.md) the plgg-press href helper must handle; restore typedoc.base.json to its committed state (the theme removal lands in the typedoc-drop ticket).

## Considerations

- The make-or-break risk is hand-rolling a CommonMark-enough parser with zero deps; this spike must bound the grammar, pin the EXACT slug algorithm, and inventory fence languages BEFORE coding.
- No production code changes land here; typedoc.base.json must be restored so the repo stays green.
- Slug-parity (exact anchors), hero-ownership (SiteConfig data), raw-HTML-as-text, and language-inventory decisions directly unblock the plgg-md fold, the plgg-highlight aliases, the plgg-press theme, the guide site.config instance, and VitePress removal — they must be written down, not left implicit.

## Final Report

Development completed as planned. The durable spec lives at `docs/plgg-press-migration/spike-decisions.md`; golden HTML + theme-on/off API snapshots are in the scratchpad. `typedoc.base.json` was edited then restored (empty diff); generated `api/*` is gitignored.

### Discovered Insights

- **Insight**: The corpus is far narrower than full CommonMark — measured: h1/h2 only (zero h3–h6 in authored prose; API h2 only after compaction), 53 fenced blocks, 11 pipe tables, lists incl. nested, **zero blockquotes/HRs/images/raw-HTML, and `:::` containers are run=3 ONLY (zero `::::`)**.
  **Context**: Codex flagged `::::` as a risk; the spike measured it never occurs in the real corpus, so the `3+`-colon rule is forward-proofing, not a present need. The parser grammar can be bounded tightly.
- **Insight**: VitePress slugify (`@mdit-vue/shared`) RETAINS em-/en-dashes and non-ASCII; per-page dedup is `-1`/`-2`; verified 843/843 against a live build. Consequently **4 of 5 authored cross-page `#fragment` anchors are ALREADY broken** in current VitePress (only `#prefer-str-for-strings` resolves); the 137 API xrefs are same-page and fine.
  **Context**: "Slug parity" therefore means reproducing VitePress EXACTLY (preserves the one working anchor + all API xrefs); the 4 pre-existing content-anchor bugs are a separate content fix, not a parser requirement.
- **Insight**: Fence languages in the corpus are only `typescript`/`ts` (+`bash`/`sh`/unlabeled); only `typescript`/`ts`→`ts` reach the TS scanner today, everything else is plain escaped `<pre><code>`.
  **Context**: plgg-highlight's TS-scanner path covers ~100% of highlighted code; the alias map stays tiny.
- **Insight**: Dropping `typedoc-vitepress-theme` makes TypeDoc emit `README.md` (not `index.md`) and hard-error on the theme-only `docsRoot` option. The theme-drop ticket MUST teach `gen-api.mjs` to read `README.md` and remove `docsRoot`; raw theme-off output still has the `###`/`####` + ` ```ts ` that `compact()` consumes.
  **Context**: Directly shapes the typedoc-drop ticket — not a no-op config edit.
