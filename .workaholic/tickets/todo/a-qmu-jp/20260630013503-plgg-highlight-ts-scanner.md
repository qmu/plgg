---
created_at: 2026-06-30T01:35:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260630013458-md-corpus-spike-and-decisions.md, 20260630013502-plgg-md-inline-fold-to-html.md]
---

# Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner, with language-alias normalization

## Overview

New workspace package satisfying plgg-md's Highlighter seam with zero new third-party deps by driving the already-present typescript compiler's ts.createScanner / ts.SyntaxKind (the exact import path plgg-bundle's transpiler.ts uses) to tokenize ts/tsx/js/jsx/json into classified plgg-view Html<never> spans. It NORMALIZES language aliases (typescript->ts, javascript->js, etc. per the ticket-1 spike inventory) before dispatch; unlabeled/empty and unknown-language fences fall back to plain escaped pre>code. Build-time only — typescript is a devDependency and never ships to the browser. Exposes asHighlighter() (alias-normalizing, dispatch-on-lang Highlighter implementing plgg-md's seam type) and highlightCss() (token-class color rules) for the plgg-press theme.

**Proof of value:** plgg-test spec: asHighlighter()('typescript', sample) normalizes to the TS path and classifies keyword/string/comment spans, asHighlighter()('bash'|'', sample) returns plain escaped code without throwing — green under package-local `npm run test`.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new package layout + colocated specs
- `workaholic:implementation` / `policies/coding-standards.md` — no-as/any/ts-ignore while wrapping the TS scanner; printWidth 50
- `workaholic:implementation` / `policies/vendor-neutrality.md` — reuse the existing typescript ^6.0.3 (already in lockfile via plgg-bundle) as a devDependency; introduce no new package
- `workaholic:implementation` / `policies/test.md` — >90% coverage; assert no-throw across every corpus fence language + alias normalization

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-bundle/src/vendors/transpiler.ts` - proof that `import ts from 'typescript'` exposes the default export; the same export gives createScanner/SyntaxKind, no cast
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - span/pre/code builders (added in the plgg-view-builders ticket) for the highlighted Html<never> tree
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Style/usecase/utilities.ts` - color/style utilities to style token-class spans and produce highlightCss

## Dependencies

- Depends on [20260630013458-md-corpus-spike-and-decisions.md](20260630013458-md-corpus-spike-and-decisions.md) — Spike: inventory the Markdown corpus, capture EXACT VitePress slugs + language inventory, regenerate typedoc theme-less, and RECORD the grammar/slug/hero/raw-HTML decisions
- Depends on [20260630013502-plgg-md-inline-fold-to-html.md](20260630013502-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, injected Highlighter + link-resolver seams, EXACT anchor-parity slugs, firstHeading, AST->Html<never> fold

## Implementation Steps

1. Create packages/plgg-highlight (package.json + bundle.config.ts + plgg-test.config.json with >90% thresholds mirroring plgg-view): dependencies plgg, plgg-view, plgg-md via file:; devDependencies include typescript ^6.0.3 (reusing the existing version — a build-time tool, NOT a runtime dependency).
2. Implement normalizeLang(lang): TokenLang | None using the spike's alias map (typescript->ts, ts->ts, tsx->tsx, javascript->js, js->js, jsx->jsx, json->json; everything else / empty -> None for plain fallback).
3. Implement tokenize(code): ReadonlyArray<Token> using ts.createScanner(ScriptTarget.Latest, /*skipTrivia*/ false) in one commented imperative seam looping scan() until EndOfFileToken; map ts.SyntaxKind groups (keyword/string/number/comment/identifier/punctuation/regex/template) to a TokenKind Box; emit plain Text on any irregular token rather than throwing.
4. Implement highlightTs(code): Html<never> wrapping tokens in styled span() leaves inside typed pre>code, and highlightPlain(code): Html<never> as escaped pre>code.
5. Implement asHighlighter(): Highlighter (consuming plgg-md's exported Highlighter type) that runs normalizeLang then dispatches ts/tsx/js/jsx/json -> highlightTs, None/unknown -> highlightPlain.
6. Implement highlightCss(): Styles mapping each TokenKind to a plgg-view color token, for the plgg-press theme to merge into the page stylesheet.
7. Add specs feeding representative TS/TSX/JSON plus an alias ('typescript', 'javascript') and a bash/text/empty fence, asserting (a) no throw, (b) keyword/string/comment spans classified, (c) aliases normalize to the TS path, (d) unknown/unlabeled falls back to plain.

## Considerations

- Language-alias normalization (item 2) is pulled from the ticket-1 spike inventory; unlabeled/unknown fences MUST fall back to plain escaped pre>code, never throw.
- The TS scanner is lexical-only (single file, no type-check), so isolated-transpilation edge cases never bite; exotic TSX may mis-tokenize but only cosmetically.
- Like plgg-bundle, this package imports typescript from its own node_modules (clean-runner masking) — it must be installed wherever the guide builds, reached via plgg-press (handled in the deploy + dev-container tickets).
- Non-TS fences are intentionally unstyled (acceptable; the guide is overwhelmingly ```ts).
