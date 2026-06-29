---
created_at: 2026-06-30T01:35:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260630013459-plgg-view-extend-element-builders.md, 20260630013500-plgg-md-scaffold-frontmatter-block-ast.md]
---

# plgg-md: inline parser, Highlighter seam, anchor-parity slugs, and AST→Html<never> fold (renderMarkdown)

## Overview

Complete the Markdown engine: an inline scanner (bold, italic, inline code, links, images, raw-angle-bracket handling per the spike decision) producing an Inline Box union; an injected Highlighter seam so code fences are rendered externally without plgg-md importing typescript; and an exhaustive-match fold from Block/Inline to a plgg-view Html<never> tree built from the typed builders added in ticket 2. Headings get ids via a slug function that REPRODUCES the existing anchor convention. Exposes renderMarkdown plus a base-aware href helper and a surface that collects internal links + emitted slugs for the dead-link checker. Output feeds renderToString (XSS-safe) and collectCss directly — no hand-assembled HTML strings.

**Proof of value:** plgg-test spec: renderMarkdown over a sample page (layout marker + h1-h4 + ::: tip + ordered/nested list + table + ```ts fence + a #anchor link) → renderToString yields XSS-safe HTML whose heading ids match the recorded slug convention — green under `plgg-test src`.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new usecase modules + colocated specs
- `workaholic:implementation` / `policies/coding-standards.md` — exhaustive match fold, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/functional-programming.md` — catamorphism/algebra fold mirroring plgg-view foldHtml
- `workaholic:implementation` / `policies/test.md` — >90% coverage proving HTML output and slug parity for the corpus subset

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - typed builders (incl. ticket-2 additions: h1-h6, ul/ol/li, a, code, pre, strong, em, img, blockquote, table family) used to build the Html<never> tree
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/renderToString.ts` - downstream consumer; confirms Html<never> serializes XSS-safe
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/foldHtml.ts` - reference algebra pattern to mirror for the Block/Inline fold
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/escape.ts` - escapeText/safeUrl guard text and hrefs at serialization, so the parser need not sanitize

## Dependencies

- Depends on [20260630013459-plgg-view-extend-element-builders.md](20260630013459-plgg-view-extend-element-builders.md) — plgg-view: add typed element builders + content models for the Markdown/theme tag set
- Depends on [20260630013500-plgg-md-scaffold-frontmatter-block-ast.md](20260630013500-plgg-md-scaffold-frontmatter-block-ast.md) — Create plgg-md: layout-marker frontmatter splitter + block tokenizer to a Box-union AST

## Implementation Steps

1. Define Inline = Box union (Text|Code|Emph|Strong|Link|Image|LineBreak); implement renderInline(line): ReadonlyArray<Inline> as a small commented scan, escaping/passing raw angle-brackets per the spike decision.
2. Implement slugify(headingText): SoftStr reproducing the recorded anchor convention (lowercase, strip backticks/punctuation, spaces→hyphens) with deterministic de-duplication.
3. Declare the seam type Highlighter = (lang, code) => Html<never> and a default plainHighlighter returning escaped pre>code; the real TS highlighter is injected by ticket 5.
4. Implement mdToHtml(highlight, base) => (doc) => Html<never>: exhaustive match over each Block (Heading→hN with slug id, Para→p, List→ul/ol+li, Table→table family, Quote→blockquote, CodeFence→highlight(lang,code), Callout→div with kind class + nested fold, ThematicBreak→hr, HtmlPassthrough→guarded per decision) composing inline nodes via typed builders.
5. Add href(base)(path): prefixes root-absolute internal links/images with DOCS_BASE, leaves external/anchor links untouched, and handles any typedoc file-relative/.md form the spike flagged; route all Link/Image rendering through it.
6. Expose renderMarkdown(source) and renderMarkdownWith(highlighter, base)(source) returning Result<MarkdownDoc{frontmatter, body: Html<never>, links: ReadonlyArray<SoftStr>, slugs: ReadonlyArray<SoftStr>}, InvalidError>; export from src/index.ts.
7. Add colocated specs rendering real corpus pages to Html<never>, then renderToString, asserting headings carry the EXACT expected slug ids (cite spike anchors), callout div, highlighted-fence placeholder, and table — to >90% coverage.

## Considerations

- XSS-safety is delegated to plgg-view escape/renderToString; the parser must NOT hand-assemble HTML strings.
- Slug parity is a tested requirement (broken #anchors would ship silently otherwise).
- The Highlighter seam keeps plgg-md compiler-free; plgg-md must not import typescript.
