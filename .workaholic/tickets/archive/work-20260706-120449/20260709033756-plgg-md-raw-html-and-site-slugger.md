---
created_at: 2026-07-09T03:37:56+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort:
commit_hash: b511fc81
category: Added
depends_on:
mission:
---

# plgg-md: raw-HTML passthrough and a site-suppliable heading slugger for the qmu.co.jp corpus

## Overview

The qmu.co.jp site is migrating from Astro to plggpress (tickets in
`../qmu-co-jp/.workaholic/tickets/todo/a-qmu-jp/`). Its Markdown corpus
was inventoried against plgg-md's v1 subset, and two verified gaps block
the rendering-parity ticket there. Both are corpus differences from the
guide, not defects in the spike decisions — the guide corpus has zero raw
HTML and its anchors were born on VitePress, so the v1 subset and the
VitePress-exact slugger were correct for it.

**Gap 1 — raw HTML.** Spike decision (c) escapes raw angle brackets as
literal text and defines no raw-HTML AST node. The qmu.co.jp corpus
depends on raw HTML as load-bearing content: 14 files carry
`<small class="updated">` last-updated markers (all six section indexes
in both locales; an external sync process reads the timestamps), and
`docs/about.md` (company image block, map iframe), the safety documents,
and other pages embed HTML directly in Markdown.

**Gap 2 — heading slugs.** plgg-md's `slugify` reproduces the VitePress
`@mdit-vue/shared` algorithm exactly (verified 843/843 for the guide).
qmu.co.jp's heading IDs come from `rehype-slug` (github-slugger), which
diverges on non-ASCII punctuation: github-slugger deletes ・ 、 「」 and
similar characters outright, while the VitePress algorithm's special set
is ASCII punctuation plus curly quotes only, so those characters survive
in the slug. 142 headings in the qmu.co.jp corpus contain such
characters; migrating on the current slugger would change their IDs and
break existing deep links and internal fragment links.

Mermaid needs no change: the plain code-fence fallback already emits
`<code class="language-mermaid">`, which a site-local client script can
select and render.

## Key Files

- `packages/plgg-md/src/Block/model/Block.ts` - Block union to extend with a raw-HTML node (or an explicit opt-in passthrough).
- `packages/plgg-md/src/Block/usecase/parseBlocks.ts` - block parser that must recognize HTML blocks when enabled.
- `packages/plgg-md/src/Inline/model/Inline.ts` and `packages/plgg-md/src/Inline/usecase/renderInline.ts` - inline HTML spans (e.g. `<small>…</small>` inside a paragraph).
- `packages/plgg-md/src/Render/usecase/slugify.ts` - VitePress-exact slugger; the algorithm choice must become injectable.
- `packages/plgg-md/src/Render/usecase/renderMarkdown.ts` - render entry that threads options through.
- `packages/plggpress/src/` (SiteConfig / PressOptions) - surface where a site supplies the slugger and enables raw HTML.
- `../plgg/docs/plggpress-migration/spike-decisions.md` - decisions (a) and (c) that this ticket parameterizes per site; the guide's defaults must not change.

## Related History

Spike decisions (a) and (c) in `docs/plggpress-migration/spike-decisions.md`
fixed the v1 subset from the guide corpus inventory. This ticket keeps
those defaults for the guide and makes both behaviors configurable for
sites whose corpus or anchor history differs.

## Implementation Steps

1. Add an opt-in raw-HTML mode to plgg-md: parse HTML blocks and inline HTML spans into a passthrough node rendered verbatim, instead of escaping. Default stays escape-as-text so the guide's behavior and spike decision (c) are unchanged.
2. Make the heading-slug algorithm injectable at the render boundary, keeping the VitePress-exact `slugify` as the default. Ship a github-slugger-compatible implementation (lowercase, delete non-word punctuation including ・ 、 「」 rather than replacing with `-`, spaces to `-`, per-page `-1/-2` dedup) verified against `rehype-slug` output.
3. Thread both options through plggpress (`PressOptions` / `SiteConfig` or the theme boundary) so a site's `site.config.ts` can enable raw HTML and supply the slugger without forking the theme.
4. Extend the CheckLinks fragment validation to resolve fragments against IDs produced by the configured slugger, not the default one.
5. Add spec coverage: raw-HTML on/off rendering, and slug parity fixtures for Japanese headings containing ・ 、 「」 () and mixed ASCII.

## Quality Gate

**Acceptance criteria** - the checkable conditions that must hold:

- With raw HTML disabled (default), guide build output is byte-identical to before.
- With raw HTML enabled, HTML blocks and inline HTML render verbatim and text-level `<`/`>`/`&` outside HTML constructs remain escaped.
- The github-slugger-compatible slugger reproduces `rehype-slug` IDs for a fixture set drawn from qmu.co.jp headings, including all divergent punctuation classes.
- The guide's slugs are unchanged (default slugger still VitePress-exact).
- CheckLinks validates fragments against the configured slugger.

**Verification method** - the commands/tests/probes that prove them:

- Run plgg-md and plggpress spec suites.
- Rebuild the guide and diff `dist/` against the pre-change build.
- Run a fixture comparison of the new slugger against `rehype-slug` (github-slugger) output for the qmu.co.jp heading set.

**Gate** - what must pass before approval:

- All specs green; guide build diff empty.
- Slug parity fixtures cover ・ 、 「」 () em-dash and digit-leading headings.

## Considerations

- `as` / `any` / `ts-ignore` are prohibited; the raw-HTML node and slugger option must cross boundaries through typed validation like every other config surface.
- Raw-HTML passthrough is a rendering trust decision: plggpress sites author their own content, so verbatim output is acceptable there, but the default must stay escape-as-text so no existing consumer silently starts emitting unescaped input.
- github-slugger's exact behavior (its regex of stripped characters, Unicode casing) should be matched from the `rehype-slug` dependency actually used by qmu.co.jp's Astro build, not reimplemented from memory.
