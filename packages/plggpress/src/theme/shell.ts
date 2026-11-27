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
  type Appearance,
  kitCss,
  monochrome,
  partnersMeta,
  embeddersMeta,
  siteBodyClass,
} from "plggmatic";
import {
  type Theme,
  reducedMotionCss,
  syntaxCss,
  defaultTheme,
} from "plggpress/themeSupport/styleEntry";

/**
 * The framework's stylesheet, ahead of {@link baseCss}:
 * plggmatic's KIT — the UI system (frame, columns, shared
 * strip, sidebar, prose structure) and the appearance that
 * dresses it, with the scheme and metric properties every
 * later `var()` resolves — then the reduced-motion reset
 * and the syntax-highlight properties. All escape-safe (no
 * `<`/`>`/`&`). The site's look IS the kit's; `baseCss`
 * only adds what a documentation site has beyond it.
 */
// plggpress passes the RESOLVED theme to the value-carrying
// emitters — the scheme, metric, and syntax CSS for the
// `--pm-*` design language. The theme is the monochrome qmu
// default, or a `SiteConfig` palette override (D3, made
// config-driven); `resolveTheme` picks it from the config.
// `reducedMotionCss`/`themeToggleCss` carry no theme values.
const frameworkCss = (
  theme: Theme,
  appearance: Appearance,
): SoftStr =>
  kitCss(theme, appearance) +
  reducedMotionCss +
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
 * The appearance a site renders in: its config's, else
 * the framework's default.
 */
export const resolveAppearance = (
  config: SiteConfig,
): Appearance =>
  config.appearance?.__tag === "Some"
    ? config.appearance.content
    : monochrome;

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
/**
 * The sites this page is joined to by columns, named in
 * the head for the navigation runtime to read: nothing
 * when none is configured.
 */
const joined = (
  name: SoftStr,
  origins: SiteConfig["partners"],
): ReadonlyArray<Html<never, "meta">> =>
  origins === undefined
    ? []
    : pipe(
        origins,
        matchOption<
          ReadonlyArray<SoftStr>,
          ReadonlyArray<Html<never, "meta">>
        >(
          () => [],
          (list: ReadonlyArray<SoftStr>) =>
            list.length === 0
              ? []
              : [
                  meta(
                    [
                      attr("name", name),
                      attr(
                        "content",
                        list.join(" "),
                      ),
                    ],
                    [],
                  ),
                ],
        ),
      );

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
      ...joined(partnersMeta, config.partners),
      ...joined(embeddersMeta, config.embedders),
      link(
        [
          attr("rel", "canonical"),
          attr("href", hrefOf("/")),
        ],
        [],
      ),
      link(
        [
          attr("rel", "preconnect"),
          attr(
            "href",
            "https://fonts.googleapis.com",
          ),
        ],
        [],
      ),
      link(
        [
          attr("rel", "preconnect"),
          attr(
            "href",
            "https://fonts.gstatic.com",
          ),
          attr("crossorigin", ""),
        ],
        [],
      ),
      link(
        [
          attr("rel", "stylesheet"),
          attr("href", fontsHref),
        ],
        [],
      ),
      style(
        [],
        [
          text(
            frameworkCss(
              theme,
              resolveAppearance(config),
            ) +
              baseCss(
                theme,
                resolveAppearance(config),
              ) +
              "\n" +
              collectCss(body),
          ),
        ],
      ),
    ],
  );
};

/** The type the demo set as the house face: Inter with
 * Noto Sans JP, three weights. */
const fontsHref =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600&display=swap";

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
      bodyEl(
        [class_("vp " + siteBodyClass)],
        [slot([], [body])],
      ),
    ],
  );
