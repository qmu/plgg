---
created_at: 2026-06-30T01:35:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260630013458-md-corpus-spike-and-decisions.md]
---

# Create plgg-md: layout-marker frontmatter splitter + block tokenizer to a Box-union AST

## Overview

Scaffold the plgg-md workspace package and implement parsing-to-typed-data: a frontmatter splitter scoped to detect a flat `layout: home` marker (and strip the rest of any frontmatter block, since the only corpus frontmatter is index.md's nested home YAML whose CONTENT is owned by the theme), plus a line-based block tokenizer that parses the spike-bounded subset (headings, paragraphs, fenced code, blockquotes, ordered/unordered/nested lists, GFM pipe tables, horizontal rules, ::: container directives) into an immutable Box-union Block AST. No rendering yet — Result-not-throw error handling.

**Proof of value:** plgg-test specs: parseFrontmatter strips index.md's home block and flags layout=home; the block tokenizer turns real guide snippets (::: tip, pipe table, nested list, ```ts fence) into the expected Block AST — green under `plgg-test src`.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new package follows the Category/usecase + colocated .spec.ts layout
- `workaholic:implementation` / `policies/coding-standards.md` — strict no-as/any/ts-ignore, Prettier printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — Block/Frontmatter as Box unions with asX casters + isX guards
- `workaholic:implementation` / `policies/vendor-neutrality.md` — may depend ONLY on plgg + plgg-view via file: links; no markdown libs
- `workaholic:implementation` / `policies/test.md` — >90% coverage via colocated .spec.ts per public fn

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/package.json` - template for the new package.json (plgg-bundle build, plgg-test, file: deps, exports, typescript devDep)
- `/home/ec2-user/projects/plgg/packages/plgg/src/Flowables/cast.ts` - cast/pipe pipeline pattern for the frontmatter caster and block parse chain
- `/home/ec2-user/projects/plgg/packages/plgg/src/Exceptionals/InvalidError.ts` - error carrier returned by parse failures (Result not throw)
- `/home/ec2-user/projects/plgg/packages/plgg/src/Flowables/match.ts` - exhaustive match used later over the Block union; AST tags use box/pattern

## Dependencies

- Depends on [20260630013458-md-corpus-spike-and-decisions.md](20260630013458-md-corpus-spike-and-decisions.md) — Spike: inventory the Markdown corpus, regenerate typedoc theme-less, and RECORD the grammar/slug/hero decisions

## Implementation Steps

1. Create packages/plgg-md with package.json (name plgg-md, type module, build: plgg-bundle, test: tsc --noEmit && plgg-test src), tsconfig.json, .prettierrc.json (printWidth 50), src/index.ts barrel; dependencies plgg + plgg-view via file:, devDeps plgg-bundle/plgg-test/typescript/@types/node mirroring plgg-view.
2. Define the AST model: Block = Box union (Heading|Para|CodeFence|List|Quote|Table|Callout|ThematicBreak|HtmlPassthrough) with $-suffixed matchers, and Frontmatter = Readonly record with an Option<layout> flag (no nested hero/features fields — owned by the theme).
3. Implement parseFrontmatter(source): Result<{ frontmatter, body }, InvalidError> that detects only a leading `layout: home` marker, strips the whole frontmatter fence, and returns the body; never parses nested YAML.
4. Implement the block tokenizer as a single commented imperative line-scan seam producing ReadonlyArray<Block>: fenced code (capture lang), ::: containers (capture kind + nested body lines until closing :::), pipe tables, nested lists, blockquotes, hr, headings (h1-h6), paragraphs; out-of-subset lines fall back to Para or guarded HtmlPassthrough per the spike decision.
5. Surface unterminated fence/container and malformed table as InvalidError variants; never throw.
6. Write colocated .spec.ts for parseFrontmatter and the tokenizer fed real corpus snippets (incl. ::: tip, a pipe table, nested list, ```ts fence, the home layout marker) to >90% coverage.

## Considerations

- Scope strictly to the spike subset; do NOT chase full CommonMark. Cover nested blockquote+list / table-in-list only if the corpus uses them.
- Frontmatter is layout-marker only — the home hero/features data lives in the theme (ticket 9), resolving the nested-YAML mismatch the reviews flagged.
- Rendering and inline parsing are deferred to ticket 4 to keep this commit reviewable.
