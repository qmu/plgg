---
created_at: 2026-08-28T11:46:03+09:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy: auto
verification_handoff:
---

# Add GFM autolink support to plgg-md

## Overview

plgg-md's inline scanner has no autolink branch: `<https://example.com/>` in markdown is neither a link nor raw HTML (the `htmlOpenTag` parser fails at the `:`), so every character falls through to the literal-text branch and the renderer HTML-escapes it — the published page shows `&lt;https://example.com/&gt;`. This bit the guide's landing page (`packages/guide/index.md` lines 35-36, escaped URLs live on plgg.qmu.co.jp; repaired content-side by `20260828114602-serve-the-plggmatic-reference-exhibit-on-plgg-qmu-co-jp.md`). Fix the renderer: implement the GFM absolute-URI autolink form `<scheme:…>` so `<https://…>` renders as `<a href="https://…">https://…</a>`.

## Policies

The standard engineering policies (synced from qmu.co.jp into the `workaholic` policy skills) that govern this ticket. Read each linked hard copy before writing code and keep every change defensible against its Goal, Responsibility, and Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript/style conventions (all code work); plus the `plgg-coding-style` skill (Option/Result, exhaustive match, no `as`/`any`)
- `workaholic:implementation` / `policies/objective-documentation.md` — markdown the docs assert must render as the spec predicts; the fix lands with tests that pin the behavior

## Key Files

- `packages/plgg-md/src/Inline/usecase/renderInline.ts` - the `piece` scanner (image → link → rawHtml → code → strong → emph → literal char); the autolink branch is inserted here, ordered before the rawHtml token so `<https://…>` wins where `htmlOpenTag` fails at the `:`
- `packages/plgg-md/src/Inline/model/Inline.ts` - the `Link` variant and builders (`inlineLink`/`link$`) already exist — an autolink can reuse `Link` with text = href, no new node kind required
- `packages/plgg-md/src/Render/usecase/mdToHtml.ts` - escapes literal Text runs (the second half of the defect); `Link` rendering already emits `<a href>` with attribute escaping
- `packages/plgg-parser` - the combinator vocabulary the new parser is written in (concrete-S pinning, PEG backtracking)

## Related History

plgg-md's inline model and HTML folding were built in the plggpress column-layout era; the escape-by-default of literal text is a documented v1 decision, so the autolink must be a recognized token, not an escaping exception.

- [20260630013502-plgg-md-inline-fold-to-html.md](.workaholic/tickets/archive/work-20260630-013457/20260630013502-plgg-md-inline-fold-to-html.md) - established the Inline model and the escape-literal-text rendering this feature slots into (renderer)

## Implementation Steps

1. Reproduce: a spec asserting `mdToHtml("<https://example.com/x>")` currently yields escaped literal text, red against the desired `<a href="https://example.com/x">https://example.com/x</a>`.
2. Implement `autolinkP` per GFM absolute-URI autolink: `<` + scheme (`[A-Za-z][A-Za-z0-9+.-]{1,31}`) + `:` + one or more non-whitespace, non-`<`, non-`>` chars + `>`; produce the existing `Link` inline with href = text = the URI. No email-autolink form unless it falls out free — record the omission in the spec if skipped.
3. Insert the branch in `piece` ahead of the rawHtml token (both variants of the scanner — rawHtml enabled and disabled), so autolinks work in both modes and `<div>`-style tags keep parsing as before.
4. Specs: positive (`https:`, `http:`, `mailto:` scheme forms), negatives (`<not a url>`, `<div>` still rawHtml, `< https://x>` with space stays literal), href/text escaping of `&` and quotes, and the guide's exact former string round-tripped.
5. Gates: `plgg-test` for plgg-md green with coverage over the >90% thresholds, `scripts/tsc-plgg.sh` clean, `./scripts/check-all.sh` green (downstream consumers rebuild against the new dist).

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `mdToHtml` renders `<https://example.com/x>` as `<a href="https://example.com/x">https://example.com/x</a>` (modulo the renderer's existing link attribute shape), in both rawHtml modes.
- `<div>` (raw HTML) and literal `<notaurl>` behavior is unchanged, pinned by specs.
- plgg-md's vitest/plgg-test coverage stays above the repo's >90% thresholds; no `as`/`any`/`ts-ignore`.
- Decided: scope is the absolute-URI autolink form; the GFM email autolink is optional and its omission, if omitted, is recorded in a spec comment (developer may override at /drive).

**Verification method** — the commands/tests/probes that prove them:

- `scripts/test-plgg.sh` (plgg-md suite) green including the new specs; `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green.

**Gate** — what must pass before approval:

- All three commands green; per `merge_policy: auto`, the developer confirms the deploy before merging (a packages/** merge redeploys the guide).

## Considerations

- Ordering inside `piece` is the correctness crux: `htmlOpenTag` must still win for real tags, autolink for `<scheme:…>` — PEG ordered choice makes the earlier branch authoritative, so the autolink's scheme+`:` requirement is what keeps `<div>` out of it (`packages/plgg-md/src/Inline/usecase/renderInline.ts`)
- Reuse the existing `Link` inline rather than adding an `Autolink` node — the renderer and downstream consumers (plggpress, plgg-highlight) then need no changes (`packages/plgg-md/src/Inline/model/Inline.ts`)
- After this lands, `packages/guide/index.md` may keep its explicit `[text](url)` links — no revert required; autolinks simply stop being a trap for future authoring (cross-ref: `20260828114602-serve-the-plggmatic-reference-exhibit-on-plgg-qmu-co-jp.md`)
