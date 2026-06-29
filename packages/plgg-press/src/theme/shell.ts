import { type SoftStr, pipe, getOr } from "plgg";
import {
  type Html,
  html,
  head,
  body as bodyEl,
  main_,
  title,
  style,
  meta,
  link,
  slot,
  text,
  attr,
  collectCss,
} from "plgg-view";
import { type MarkdownDoc } from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { href } from "plgg-press/Href/usecase/href";

/**
 * The conventional theme stylesheet asset — the static
 * reset/token sheet the asset pipeline emits, linked
 * here base-aware. The page's atomic, token-driven
 * rules ride INLINE in the {@link collectCss} `<style>`
 * (no class-based highlight sheet to merge — plgg-highlight
 * colors tokens inline), so this link carries only the
 * site-wide base layer.
 */
const STYLESHEET_ASSET: SoftStr =
  "/assets/style.css";

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
 * base-aware `<link rel="stylesheet">` and
 * `<link rel="canonical">` (both routed through
 * {@link href} so the single deploy `base` is the only
 * place link prefixes are decided), the derived
 * `<title>`, and ONE `<style>` holding the body's
 * collected atomic CSS. The stylesheet text is a
 * {@link text} node, so the SSR escaper is its only gate
 * — sound because {@link collectCss} emits the
 * atomic-utility subset (`.cHASH{prop:value}`) with no
 * `<`/`>`/`&`, surviving escaping byte-for-byte.
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
          attr("rel", "stylesheet"),
          attr(
            "href",
            hrefOf(STYLESHEET_ASSET),
          ),
        ],
        [],
      ),
      link(
        [
          attr("rel", "canonical"),
          attr("href", hrefOf("/")),
        ],
        [],
      ),
      style([], [text(collectCss(body))]),
    ],
  );
};

/**
 * The full `<html>` document SHELL for one rendered
 * Markdown page, authored purely from plgg-view's typed
 * document-shell builders — no general-builder escape
 * hatch. The
 * pre-rendered Markdown `body` (an opaque `Html<never>`
 * the content model can't statically constrain) is
 * handed to the typed `<body>` through {@link slot}: a
 * `div`-pinned, Flow-assignable container that accepts
 * permissive children, nested inside a `<main>` content
 * region so the document stays a semantically complete,
 * JS-free landmark tree. Style injection and `<title>`
 * derivation are this module's whole job; the nav,
 * sidebar, home hero, and callout chrome are the next
 * ticket's.
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
      bodyEl(
        [],
        [main_([], [slot([], [body])])],
      ),
    ],
  );
