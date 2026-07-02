import { type SoftStr } from "plgg";
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
} from "plggmatic";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  chromeRail,
  mobileBar,
  socialLinks,
} from "plggpress/theme/navBar";
import { sidebarTree } from "plggpress/theme/sidebarTree";
import {
  href,
  samePath,
} from "plggpress/Href/usecase/href";

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
      sidebarTree(
        config.sidebar,
        activePath,
        base,
      ),
      socialLinks(config, "vp-sidebar-social"),
    ],
  );
};

/**
 * The in-body PAGE LAYOUT — the composition seam between
 * the typed chrome builders and the document `shell`. It
 * is a sidebar-first app shell (qmu.co.jp): the
 * {@link sidebarColumn} at the far left, then
 * a `<main>` holding the rendered `content` (an opaque
 * `Html<never>` embedded through the typed {@link slot})
 * plus the {@link siteFooter}. EVERY page — the landing
 * page included — renders as the `.vp-doc` prose column
 * through this one shell (qmu.co.jp's home is ordinary
 * prose; there is no hero variant). Below lg the rail
 * hides, a sticky {@link mobileBar} appears, and the
 * sidebar becomes a CSS-only off-canvas drawer driven by
 * the hidden {@link menuToggle} checkbox. Authored purely
 * from the typed flow/`slot` builders — no general-builder
 * escape hatch.
 */
export const page = (
  config: SiteConfig,
  content: Html<never>,
  activePath: SoftStr,
  base: SoftStr,
): Html<never> => {
  const contentColumn = main_(
    [class_("vp-content")],
    [
      div(
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
          sidebarColumn(config, activePath, base),
          contentColumn,
          chromeRail(config),
        ],
      ),
    ],
  );
};
