import {
  type SoftStr,
  pipe,
  getOr,
  matchOption,
} from "plgg";
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
} from "plggpress/framework";
import { type MarkdownDoc } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { href } from "plggpress/Href/usecase/href";
import { baseCss } from "plggpress/theme/baseCss";
import {
  type Theme,
  themeToggleCss,
  schemeCss,
  metricCss,
  reducedMotionCss,
  syntaxCss,
  defaultTheme,
} from "plggpress/themeSupport/styleEntry";

/**
 * The framework-owned CSS blocks plggmatic emits, composed
 * in the one order the cascade needs: the scheme custom
 * properties FIRST (so every later `var(--pm-*)` resolves),
 * then the scheme-independent shell metrics, the
 * reduced-motion reset, the appearance-toggle chrome +
 * icon-switch, and the syntax-highlight `--pm-code-*`
 * properties + `tok-*` rules — all escape-safe (no
 * `<`/`>`/`&`), all ahead of {@link baseCss}'s bespoke
 * layout/prose sheet (D3/D16 cutover, roadmap tickets
 * 07 + 08).
 */
// plggpress passes the RESOLVED theme to the value-carrying
// emitters — the scheme, metric, and syntax CSS for the
// `--pm-*` design language. The theme is the monochrome qmu
// default, or a `SiteConfig` palette override (D3, made
// config-driven); `resolveTheme` picks it from the config.
// `reducedMotionCss`/`themeToggleCss` carry no theme values.
const frameworkCss = (theme: Theme): SoftStr =>
  schemeCss(theme) +
  metricCss(theme) +
  reducedMotionCss +
  themeToggleCss +
  syntaxCss(theme);

/**
 * The theme a site RENDERS through: its validated
 * `SiteConfig` palette override when present, else
 * plggmatic's monochrome {@link defaultTheme}. This is the
 * one seam where the config's optional theme becomes the
 * concrete `Theme` the emitters bind to — no source edit.
 */
export const resolveTheme = (
  config: SiteConfig,
): Theme =>
  matchOption<Theme, Theme>(
    () => defaultTheme,
    (theme: Theme) => theme,
  )(config.theme);

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
 * `<title>`, and ONE `<style>` holding — in cascade order
 * — plggmatic's {@link frameworkCss} (scheme properties,
 * metrics, reduced-motion, toggle chrome), the bespoke
 * {@link baseCss} layout/prose sheet, then the body's
 * collected atomic CSS. The stylesheet text is a
 * {@link text} node, so the SSR escaper is its only gate
 * — sound because every layer stays escape-safe (no
 * `<`/`>`/`&`: plggmatic's emitters and `baseCss` use only
 * class/descendant selectors + `@media` + `var()`, and
 * {@link collectCss} emits the `.cHASH{prop:value}` atomic
 * subset), surviving escaping byte-for-byte.
 */
const documentHead = (
  config: SiteConfig,
  doc: MarkdownDoc,
  body: Html<never>,
  theme: Theme,
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
        [
          text(
            frameworkCss(theme) +
              baseCss(theme) +
              "\n" +
              collectCss(body),
          ),
        ],
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
      documentHead(
        config,
        doc,
        body,
        resolveTheme(config),
      ),
      bodyEl([class_("vp")], [slot([], [body])]),
    ],
  );
