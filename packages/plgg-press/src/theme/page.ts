import { type SoftStr, matchOption } from "plgg";
import {
  type Html,
  div,
  main_,
  a,
  p,
  input,
  label,
  slot,
  text,
  attr,
  class_,
} from "plgg-view";
import { type MarkdownDoc } from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import {
  chromeRail,
  mobileBar,
  socialLinks,
} from "plgg-press/theme/navBar";
import { sidebarTree } from "plgg-press/theme/sidebarTree";
import {
  href,
  samePath,
} from "plgg-press/Href/usecase/href";

/**
 * Whether the page opted into the full-width home layout
 * via its `layout: home` frontmatter marker — the one
 * variant rendered WITHOUT the sidebar (the hero owns the
 * whole content column).
 */
const isHome = (doc: MarkdownDoc): boolean =>
  matchOption<SoftStr, boolean>(
    (): boolean => false,
    (layout: SoftStr): boolean =>
      layout === "home",
  )(doc.frontmatter.layout);

/**
 * The hidden checkbox the `☰` mobile-bar label toggles. A
 * sibling of the app row and the backdrop (inside
 * `.vp-shell`) so {@link baseCss}'s general-sibling rules
 * can slide the off-canvas sidebar drawer in and dim the
 * backdrop with zero client JavaScript.
 */
const menuToggle = input(
  [
    class_("vp-menu-cb"),
    attr("type", "checkbox"),
    attr("id", "vp-menu-toggle"),
    attr("aria-hidden", "true"),
  ],
  [],
);

/**
 * The dimmed backdrop behind an open mobile drawer — a
 * `<label>` for the menu checkbox, so tapping it closes
 * the drawer (CSS-only). Hidden until the checkbox is
 * checked.
 */
const backdrop = label(
  [
    attr("for", "vp-menu-toggle"),
    class_("vp-backdrop"),
    attr("aria-hidden", "true"),
  ],
  [],
);

/** The centred, muted copyright footer confined to the
 * content column, on every page. */
const siteFooter = (
  config: SiteConfig,
): Html<never, "div"> =>
  div(
    [
      class_("vp-footer"),
      attr("role", "contentinfo"),
    ],
    [
      p(
        [class_("vp-footer-text")],
        [text("© " + config.title)],
      ),
    ],
  );

/**
 * The sidebar column: the wordmark home link (rendered as
 * the inverted active block on the home page), the
 * always-expanded {@link sidebarTree}, and — below lg,
 * where the chrome rail is hidden — the social links so
 * GitHub stays reachable in the drawer. On lg+ it is a
 * permanent independent-scroll column; below lg it becomes
 * the off-canvas drawer.
 */
const sidebarColumn = (
  config: SiteConfig,
  activePath: SoftStr,
  base: SoftStr,
): Html<never, "div"> => {
  const hrefOf = href(config.base);
  const sameAsActive = samePath(config.base);
  const wordmarkAttrs = sameAsActive(
    "/",
    activePath,
  )
    ? [
        attr("href", hrefOf("/")),
        attr("aria-current", "page"),
        class_("vp-wordmark"),
      ]
    : [
        attr("href", hrefOf("/")),
        class_("vp-wordmark"),
      ];
  return div(
    [class_("vp-sidebar")],
    [
      a(wordmarkAttrs, [text(config.title)]),
      sidebarTree(config.sidebar, activePath, base),
      socialLinks(config, "vp-sidebar-social"),
    ],
  );
};

/**
 * The in-body PAGE LAYOUT — the composition seam between
 * the typed chrome builders and the document `shell`. It
 * is a sidebar-first app shell (qmu.co.jp): a far-left
 * {@link chromeRail} (lg+), the {@link sidebarColumn}, and
 * a `<main>` holding the rendered `content` (an opaque
 * `Html<never>` embedded through the typed {@link slot})
 * plus the {@link siteFooter}. A `layout: home` page drops
 * the sidebar and renders the hero full-width in `.vp-home`
 * instead of the `.vp-doc` prose column. Below lg the rail
 * hides, a sticky {@link mobileBar} appears, and the
 * sidebar becomes a CSS-only off-canvas drawer driven by
 * the hidden {@link menuToggle} checkbox. Authored purely
 * from the typed flow/`slot` builders — no general-builder
 * escape hatch.
 */
export const page = (
  config: SiteConfig,
  doc: MarkdownDoc,
  content: Html<never>,
  activePath: SoftStr,
  base: SoftStr,
): Html<never> => {
  const home = isHome(doc);
  const contentColumn = main_(
    [class_("vp-content")],
    [
      home
        ? div(
            [class_("vp-home")],
            [slot([], [content])],
          )
        : div(
            [class_("vp-doc")],
            [slot([], [content])],
          ),
      siteFooter(config),
    ],
  );
  return div(
    [class_("vp-shell")],
    [
      menuToggle,
      // The home page carries the sidebar too (qmu.co.jp
      // renders its landing page through the same shell):
      // with no top nav, the sidebar is the ONLY way to
      // reach articles, so a sidebar-less home is a
      // navigation dead-end. The `☰` drawer is enabled on
      // every page for the same reason.
      mobileBar(config, activePath, true),
      backdrop,
      div(
        [class_("vp-app")],
        [
          chromeRail(config),
          sidebarColumn(config, activePath, base),
          contentColumn,
        ],
      ),
    ],
  );
};
