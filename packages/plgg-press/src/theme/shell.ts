import { type SoftStr, pipe, getOr } from "plgg";
import {
  type Html,
  html,
  head,
  body as bodyEl,
  title,
  style,
  meta,
  link,
  slot,
  text,
  attr,
  class_,
  collectCss,
} from "plgg-view";
import { type MarkdownDoc } from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { href } from "plgg-press/Href/usecase/href";
import { baseCss } from "plgg-press/theme/baseCss";

/**
 * The page `<title>` text: the document's first H1
 * (the single consumer of {@link MarkdownDoc.firstHeading})
 * when present, else the site title — so the home page
 * and any heading-less page fall back to `config.title`.
 */
const titleOf = (
  config: SiteConfig,
  doc: MarkdownDoc,
): SoftStr =>
  pipe(doc.firstHeading, getOr(config.title));

/**
 * The document `<head>`: charset + viewport metadata, a
 * base-aware `<link rel="canonical">` (routed through
 * {@link href} so the single deploy `base` is the only
 * place link prefixes are decided), the derived
 * `<title>`, and ONE `<style>` holding the static
 * {@link baseCss} theme sheet followed by the body's
 * collected atomic CSS. The stylesheet text is a
 * {@link text} node, so the SSR escaper is its only gate
 * — sound because both layers stay escape-safe (no
 * `<`/`>`/`&`: `baseCss` uses only class/descendant
 * selectors + `@media`, and {@link collectCss} emits the
 * `.cHASH{prop:value}` atomic subset), surviving escaping
 * byte-for-byte.
 */
const documentHead = (
  config: SiteConfig,
  doc: MarkdownDoc,
  body: Html<never>,
): Html<never, "head"> => {
  const hrefOf = href(config.base);
  return head(
    [],
    [
      meta([attr("charset", "utf-8")], []),
      meta(
        [
          attr("name", "viewport"),
          attr(
            "content",
            "width=device-width, initial-scale=1",
          ),
        ],
        [],
      ),
      title([], [text(titleOf(config, doc))]),
      link(
        [
          attr("rel", "canonical"),
          attr("href", hrefOf("/")),
        ],
        [],
      ),
      style(
        [],
        [text(baseCss + "\n" + collectCss(body))],
      ),
    ],
  );
};

/**
 * The full `<html>` document SHELL for one rendered
 * Markdown page, authored purely from plgg-view's typed
 * document-shell builders — no general-builder escape
 * hatch. The pre-rendered page `body` (an opaque
 * `Html<never>` the content model can't statically
 * constrain — the {@link page} layout, which already
 * provides the `<nav>`/`<main>` landmarks) is handed to
 * the typed `<body class="vp">` through {@link slot}: a
 * `div`-pinned, Flow-assignable container that accepts
 * permissive children. The `vp` root class scopes the
 * injected {@link baseCss}.
 */
export const shell = (
  config: SiteConfig,
  doc: MarkdownDoc,
  body: Html<never>,
): Html<never> =>
  html(
    [],
    [
      documentHead(config, doc, body),
      bodyEl([class_("vp")], [slot([], [body])]),
    ],
  );
