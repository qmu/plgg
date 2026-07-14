import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { renderMarkdown } from "plgg-md/Render/usecase/renderMarkdown";

/**
 * The GOLDEN EQUIVALENCE ORACLE for the markdown pipeline.
 *
 * Every plggpress site (the guide, strategy, qmu.co.jp)
 * renders through this one pipeline, so any change to
 * `parseBlocks` / `renderInline` must be judged by whether
 * the rendered bytes move — not by whether the unit specs
 * still pass. This spec pins the EXACT HTML for a corpus
 * that exercises the whole bounded plggpress subset plus
 * the edge cases a reimplementation is most likely to get
 * wrong.
 *
 * It exists for the plgg-parser combinator rewrite (see the
 * `plgg-md-parsers-onto-plgg-parser` ticket): the rewrite is
 * a PURE IMPLEMENTATION SWAP, and this file is what makes
 * "byte-identical" checkable in-repo rather than only via a
 * hand-built site diff.
 *
 * **If a change makes this spec fail, the change altered
 * rendered output.** That is a behavior change, not a
 * refactor — reproduce the old bytes, or get explicit
 * sign-off on the specific difference as a pre-existing bug
 * and re-pin deliberately. Do NOT "fix" the expectation to
 * make the suite green.
 *
 * The pinned quirks below are all REAL current behavior,
 * measured from the parser at the time of pinning. Several
 * are arguably bugs; they are pinned as-is because the
 * equivalence gate is about not moving, not about being
 * right.
 */
const src = (
  ...lines: ReadonlyArray<string>
): string => lines.join("\n");

/**
 * The corpus. Beyond the ordinary constructs, it deliberately
 * carries the reimplementation traps:
 *
 * - `****` — does NOT open a strong (the close must be
 *   strictly past the opener, so an empty `**…**` falls
 *   through) and lands as literal text.
 * - `**strong` unclosed — falls through to literal.
 * - `a*b` — a star that opens nothing merges into ONE text
 *   run with its neighbours (the literal buffer), rather
 *   than splitting into three text nodes.
 * - `*a **b** c*` — renders as THREE separate `<em>`s, not
 *   an `<em>` wrapping a `<strong>`: emphasis grabs the
 *   first following star, so the nested strong never forms.
 * - ``` ``a`b`` ``` — a 2-tick span whose body holds a lone
 *   tick: the closer is a MAXIMAL run of exactly the opener's
 *   length, so the inner run is skipped whole.
 * - `` ` spaced ` `` and `` ` x ` `` → trimmed; `` `  ` `` →
 *   preserved (the CommonMark all-whitespace guard). `` ` x ` ``
 *   is the length BOUNDARY (3 chars) that a longer span does
 *   not discriminate — a trim-threshold off-by-one slips past
 *   `` ` spaced ` `` unnoticed.
 * - `` `tick `` unclosed — literal.
 * - `![img]` before `[link]` — the image branch must be tried
 *   first, and `bang![x]()` still images.
 * - A raw HTML block with `rawHtml` OFF (the default) is NOT
 *   html — it falls through to a paragraph and is escaped,
 *   with its lines soft-broken into one run.
 */
const corpus = src(
  "# Golden corpus",
  "",
  "## Inline edge cases",
  "",
  "Four stars **** stay literal.",
  "",
  "An unclosed **strong falls through.",
  "",
  "A lone a*b star merges into one text run.",
  "",
  "Emph *one* and strong **two** and both *a **b** c*.",
  "",
  "Code `x` and ``a`b`` and ` spaced ` and ` x ` and `  ` kept.",
  "",
  "An unclosed `tick stays literal.",
  "",
  "A [link](/a/b) and an ![img](/i.png) and a bang![x](/y.png).",
  "",
  "Raw <tag> and & stay escaped.",
  "",
  "Hard break by backslash\\",
  "next line.",
  "",
  "Hard break by spaces  ",
  "next line.",
  "",
  "Soft",
  "break.",
  "",
  "## Blocks",
  "",
  "> A quote",
  "> spanning lines.",
  "",
  "- item one",
  "- item two",
  "  - nested a",
  "  - nested b",
  "",
  "1. first",
  "2. second",
  "",
  "---",
  "",
  "| Left | Center | Right |",
  "| :--- | :----: | ----: |",
  "| a | b | c |",
  "",
  "::: warning Careful",
  "Callout body with *emph*.",
  ":::",
  "",
  "```ts",
  "const x: number = 1;",
  "```",
  "",
  "```",
  "no info string",
  "```",
  "",
  '<div class="raw">',
  "raw html block",
  "</div>",
  "",
  "Trailing paragraph.",
);

/**
 * The exact bytes `renderToString(renderMarkdown(corpus))`
 * produces. Pinned from the measured output of the
 * hand-rolled regex parsers, which the combinator rewrite
 * must reproduce byte for byte.
 */
const GOLDEN =
  '<div><h1 id="golden-corpus">Golden corpus</h1><h2 id="inline-edge-cases">Inline edge cases</h2><p>Four stars **** stay literal.</p><p>An unclosed **strong falls through.</p><p>A lone a*b star merges into one text run.</p><p>Emph <em>one</em> and strong <strong>two</strong> and both <em>a </em><em>b</em><em> c</em>.</p><p>Code <code>x</code> and <code>a`b</code> and <code>spaced</code> and <code>x</code> and <code>  </code> kept.</p><p>An unclosed `tick stays literal.</p><p>A <a href="/a/b">link</a> and an <img src="/i.png" alt="img" /> and a bang<img src="/y.png" alt="x" />.</p><p>Raw &lt;tag&gt; and &amp; stay escaped.</p><p>Hard break by backslash<br />next line.</p><p>Hard break by spaces<br />next line.</p><p>Soft break.</p><h2 id="blocks">Blocks</h2><blockquote><p>A quote spanning lines.</p></blockquote><ul><li>item one</li><li>item two<ul><li>nested a</li><li>nested b</li></ul></li></ul><ol><li>first</li><li>second</li></ol><hr /><table><thead><tr><th style="text-align:left">Left</th><th style="text-align:center">Center</th><th style="text-align:right">Right</th></tr></thead><tbody><tr><td style="text-align:left">a</td><td style="text-align:center">b</td><td style="text-align:right">c</td></tr></tbody></table><div class="callout callout-warning"><p class="callout-title">Careful</p><p>Callout body with <em>emph</em>.</p></div><pre><code class="language-ts">const x: number = 1;</code></pre><pre><code>no info string</code></pre><p>&lt;div class="raw"&gt; raw html block &lt;/div&gt;</p><p>Trailing paragraph.</p></div>';

test("the corpus renders to byte-identical golden HTML", () =>
  check(
    renderMarkdown(corpus),
    okThen((doc) =>
      check(
        renderToString(doc.body),
        toBe(GOLDEN),
      ),
    ),
  ));

test("the corpus's collected metadata is pinned too", () =>
  check(
    renderMarkdown(corpus),
    okThen((doc) =>
      all([
        // Link collection order follows document order,
        // and image srcs count as links.
        check(
          doc.links,
          toEqual(["/a/b", "/i.png", "/y.png"]),
        ),
        check(
          doc.slugs,
          toEqual([
            "golden-corpus",
            "inline-edge-cases",
            "blocks",
          ]),
        ),
      ]),
    ),
  ));
