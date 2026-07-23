---
created_at: 2026-06-30T01:35:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: 12e4e73
category: Added
depends_on: [20260630013458-md-corpus-spike-and-decisions.md]
---

# Create plgg-md: layout-marker frontmatter splitter + block tokenizer (multi-colon containers) to a Box-union AST

## Overview

Scaffold the plgg-md workspace package and implement parsing-to-typed-data: a frontmatter splitter scoped to detect a flat `layout: home` marker (and strip the rest of any frontmatter block, since the only corpus frontmatter is index.md's home YAML whose CONTENT is owned by the SiteConfig home data + theme), plus a line-based block tokenizer that parses the spike-bounded subset (headings, paragraphs, fenced code, blockquotes, ordered/unordered/nested lists, GFM pipe tables, horizontal rules, ::: container directives accepting 3+ MATCHING colons) into an immutable Box-union Block AST. Raw inline/block HTML is NOT a dedicated AST node — it is carried as plain text to be ESCAPED at render (v1 decision). No rendering yet — Result-not-throw error handling.

**Proof of value:** plgg-test specs: parseFrontmatter strips index.md's home block and flags layout=home; the block tokenizer turns real guide snippets (a :::: container wrapping a nested ::: tip, pipe table, nested list, ```ts fence, a raw-<tag> line as Para text) into the expected Block AST — green under package-local `npm run test`.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new package follows the Category/usecase + colocated .spec.ts layout
- `workaholic:implementation` / `policies/coding-standards.md` — strict no-as/any/ts-ignore, Prettier printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — Block/Frontmatter as Box unions with asX casters + isX guards
- `workaholic:implementation` / `policies/vendor-neutrality.md` — may depend ONLY on plgg + plgg-view via file: links; no markdown libs
- `workaholic:implementation` / `policies/test.md` — >90% coverage via colocated .spec.ts per public fn

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/package.json` - template for the new package.json (plgg-bundle build, plgg-test, file: deps, exports, typescript devDep)
- `/home/ec2-user/projects/plgg/packages/plgg-view/bundle.config.ts` - template for plgg-md's bundle.config.ts (root/rootDir/outDir/entries/formats/alias)
- `/home/ec2-user/projects/plgg/packages/plgg/src/Flowables/cast.ts` - cast/pipe pipeline pattern for the frontmatter caster and block parse chain
- `/home/ec2-user/projects/plgg/packages/plgg/src/Exceptionals/InvalidError.ts` - error carrier returned by parse failures (Result not throw)

## Dependencies

- Depends on [20260630013458-md-corpus-spike-and-decisions.md](20260630013458-md-corpus-spike-and-decisions.md) — Spike: inventory the Markdown corpus, capture EXACT VitePress slugs + language inventory, regenerate typedoc theme-less, and RECORD the grammar/slug/hero/raw-HTML decisions

## Implementation Steps

1. Create packages/plgg-md with package.json (name plgg-md, type module, build: plgg-bundle, test: tsc --noEmit && plgg-test src, coverage: plgg-test src with coverage), bundle.config.ts, tsconfig.json, .prettierrc.json (printWidth 50), plgg-test.config.json with >90% thresholds, src/index.ts barrel; dependencies plgg + plgg-view via file:, devDeps plgg-bundle/plgg-test/typescript/@types/node mirroring plgg-view.
2. Define the AST model: Block = Box union (Heading|Para|CodeFence|List|Quote|Table|Callout|ThematicBreak) with $-suffixed matchers, and Frontmatter = Readonly record with an Option<layout> flag (no nested hero/features fields — owned by SiteConfig home data). NOTE: there is intentionally NO HtmlPassthrough/raw-HTML node (item 3: raw HTML escaped as text at render).
3. Implement parseFrontmatter(source): Result<{ frontmatter, body }, InvalidError> that detects only a leading `layout: home` marker, strips the whole frontmatter fence, and returns the body; never parses nested YAML.
4. Implement the block tokenizer as a single commented imperative line-scan seam producing ReadonlyArray<Block>: fenced code (capture lang verbatim), ::: containers accepting 3+ MATCHING colons (capture kind + nested body lines until a closing fence of the same length, so :::: nests around :::), pipe tables, nested lists, blockquotes, hr, headings (h1-h6), paragraphs; out-of-subset lines (incl. raw HTML) fall back to Para text per the spike decision.
5. Surface unterminated fence/container (mismatched colon length) and malformed table as InvalidError variants; never throw.
6. Write colocated .spec.ts for parseFrontmatter and the tokenizer fed real corpus snippets (incl. a :::: multi-colon container AND a nested ::: inside it from plgg-view.md / api/index.md, a pipe table, nested list, ```ts fence, the home layout marker, and a raw-<tag> line that becomes Para text) to >90% coverage.

## Considerations

- Scope strictly to the spike subset; do NOT chase full CommonMark.
- Container directives must accept 3+ matching colons (item 1): a closing fence must match the opening colon count, enabling :::: to wrap inner ::: containers; add the multi-colon corpus fixtures (plgg-view.md, api/index.md).
- Frontmatter is layout-marker only — the home hero/features data lives in SiteConfig (rendered by the theme), resolving the nested-YAML mismatch.
- Raw HTML is NOT a node (item 3): out-of-subset/raw-angle-bracket lines become Para text, escaped by plgg-view at render.
- Rendering and inline parsing are deferred to the fold ticket to keep this commit reviewable.

## Final Report

Development completed as planned. New package `packages/plgg-md` parses to typed data only (no rendering). Verified: tsc clean; 39 passed/0 failed; coverage 98.47/93.52/100/98.47; deps are only plgg + plgg-view via `file:` (no markdown library); no as/any/ts-ignore.

### Discovered Insights

- **Insight**: package.json must OMIT `"type": "module"` (mirroring plgg-view). With it set, NodeNext applies exports-gating to the package's own `plgg-md/...` path-mapped imports and they fail to resolve — the same reason plgg-view omits it.
  **Context**: A non-obvious monorepo build gotcha every new plgg package must follow; worth knowing before scaffolding plgg-highlight and plgg-press.
- **Insight**: The tokenizer is a single commented imperative line-scan returning `Result<ReadonlyArray<Block>, InvalidError>`; `:{3,}` containers match by exact colon count so `::::` nests `:::`. Raw HTML rides as `Para` text (no AST node), escaped later by plgg-view.
  **Context**: The Block AST shape (Heading/Para/CodeFence/List/Quote/Table/Callout/ThematicBreak with `$` matchers) is the contract the ticket-5 fold consumes; `Frontmatter` exposes only `layout: Option<SoftStr>`.
