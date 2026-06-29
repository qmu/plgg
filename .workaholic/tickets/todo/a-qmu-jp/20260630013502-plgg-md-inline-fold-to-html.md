---
created_at: 2026-06-30T01:35:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260630013459-plgg-view-extend-element-builders.md, 20260630013501-plgg-md-scaffold-frontmatter-block-ast.md]
---

# plgg-md: inline parser, injected Highlighter + link-resolver seams, EXACT anchor-parity slugs, firstHeading, AST->Html<never> fold

## Overview

Complete the Markdown engine: an inline scanner (bold, italic, inline code, links, images, raw-angle-bracket handling = escape as text per the spike decision) producing an Inline Box union; an injected Highlighter seam so code fences are rendered externally without plgg-md importing typescript; an injected LINK-RESOLVER seam (default identity) so plgg-md owns NO base-path logic (plgg-press injects its href helper later); and an exhaustive-match fold from Block/Inline to a plgg-view Html<never> tree built from the typed builders. Headings get ids via a slug function that REPRODUCES the EXACT captured VitePress anchor convention (punctuation/backticks/generics/em-dashes + duplicate-heading de-dup). MarkdownDoc additionally exposes firstHeading: Option<...> so the theme can derive <title>. Exposes renderMarkdown plus a surface that collects internal links + emitted slugs for plgg-press's dead-link checker. Output feeds renderToString (XSS-safe) and collectCss directly — no hand-assembled HTML strings.

**Proof of value:** plgg-test spec: renderMarkdown over a sample page (layout marker + h1-h4 incl. a generics/backtick/em-dash/duplicate heading + ::: tip + ordered/nested list + table + ```ts fence + a #anchor link + a raw <tag>) -> renderToString yields XSS-safe HTML whose heading ids match the EXACT recorded slug convention, exposes firstHeading, escapes the raw tag, and an injected resolveLink rewrites internal links only — green under package-local `npm run test`.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new usecase modules + colocated specs
- `workaholic:implementation` / `policies/coding-standards.md` — exhaustive match fold, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/functional-programming.md` — catamorphism/algebra fold mirroring plgg-view foldHtml
- `workaholic:implementation` / `policies/test.md` — >90% coverage proving HTML output and EXACT slug parity for the corpus subset

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - typed builders (incl. the new h1-h6, ul/ol/li, a, code, pre, strong, em, img, blockquote, table family) used to build the Html<never> tree
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/renderToString.ts` - downstream consumer; confirms Html<never> serializes XSS-safe
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/foldHtml.ts` - reference algebra pattern to mirror for the Block/Inline fold
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/escape.ts` - escapeText/safeUrl guard text and hrefs at serialization, so the parser need not sanitize (and raw HTML stays escaped text)

## Dependencies

- Depends on [20260630013459-plgg-view-extend-element-builders.md](20260630013459-plgg-view-extend-element-builders.md) — plgg-view: add typed element builders + content models for the Markdown/theme tag set AND the document shell
- Depends on [20260630013501-plgg-md-scaffold-frontmatter-block-ast.md](20260630013501-plgg-md-scaffold-frontmatter-block-ast.md) — Create plgg-md: layout-marker frontmatter splitter + block tokenizer (multi-colon containers) to a Box-union AST

## Implementation Steps

1. Define Inline = Box union (Text|Code|Emph|Strong|Link|Image|LineBreak); implement renderInline(line): ReadonlyArray<Inline> as a small commented scan; raw angle-brackets become Text (escaped at render) per the spike decision — no raw-HTML node.
2. Implement slugify(headingText): SoftStr reproducing the EXACT recorded anchor convention (lowercase, strip backticks/punctuation, handle TS generics <T> and em-dashes, spaces->hyphens) with the captured duplicate-heading de-duplication suffix scheme.
3. Declare the seam types Highlighter = (lang, code) => Html<never> and LinkResolver = (href) => SoftStr; provide defaults plainHighlighter (escaped pre>code) and identity link resolver. The real TS highlighter and the base-aware href resolver are injected by plgg-highlight and plgg-press respectively — plgg-md owns NEITHER.
4. Implement mdToHtml(highlight, resolveLink) => (doc) => Html<never>: exhaustive match over each Block (Heading->hN with slug id, Para->p, List->ul/ol+li, Table->table family, Quote->blockquote, CodeFence->highlight(lang,code), Callout->div with kind class + nested fold, ThematicBreak->hr) composing inline nodes via typed builders; route every Link/Image href through resolveLink.
5. Expose renderMarkdown(source) and renderMarkdownWith(highlighter, resolveLink)(source) returning Result<MarkdownDoc{frontmatter, firstHeading: Option<SoftStr>, body: Html<never>, links: ReadonlyArray<SoftStr>, slugs: ReadonlyArray<SoftStr>}, InvalidError>; firstHeading captures the text of the first H1 for theme <title> derivation (item 15); export from src/index.ts (including the Highlighter + LinkResolver seam types).
6. Add colocated specs rendering real corpus pages to Html<never>, then renderToString, asserting headings carry the EXACT expected slug ids (cite the spike-captured anchors incl. a generics/backtick/em-dash/duplicate case), firstHeading is the first H1 text, callout div, highlighted-fence placeholder, table, a raw-<tag> rendered as escaped text, and that an injected resolveLink rewrites an internal href while leaving external/anchor links untouched — to >90% coverage.

## Considerations

- XSS-safety is delegated to plgg-view escape/renderToString; the parser must NOT hand-assemble HTML strings, and raw HTML must stay escaped text (item 3).
- Slug parity is a tested requirement against the EXACT captured anchors (broken #anchors would ship silently otherwise) (item 4).
- firstHeading (Option) is the single source the theme uses for prose-page <title>, with config.title fallback handled in the theme (item 15).
- The Highlighter AND link-resolver seams keep plgg-md compiler-free and base-path-agnostic; plgg-md must not import typescript and must not know about DOCS_BASE.
