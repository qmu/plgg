import { type SoftStr } from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  header,
  div,
  a,
  span,
  label,
  text,
  attr,
  class_,
} from "plggpress/framework";
import { staticThemeToggle } from "plgg-ui/style";
import {
  type SiteConfig,
  type SocialLink,
} from "plggpress/SiteConfig/model/SiteConfig";
import {
  href,
  samePath,
} from "plggpress/Href/usecase/href";

/**
 * The appearance toggle is plggmatic's
 * {@link staticThemeToggle} — the SSG-capable variant that
 * renders BOTH sun/moon icons (CSS picks one on
 * `html.dark`, since the build cannot know the visitor's
 * scheme) on the framework-owned `themeToggleClass`, styled
 * by plggmatic's `themeToggleCss` and wired to flip +
 * persist by the appearance body script. Shared by the
 * far-right chrome rail (lg+) and the mobile bar (below lg)
 * so both breakpoints can toggle the theme; the body script
 * binds EVERY `.pm-theme-toggle`. (plggmatic's runtime,
 * `Msg`-based `themeToggle` sibling is for TEA apps, not
 * this static site.)
 */

/** The visible label for a social icon (plgg-view has no
 * SVG builder, so the mark is an accessible text label
 * styled by {@link baseCss}; the aria-label carries the
 * full name). */
const socialName = (icon: SoftStr): SoftStr =>
  icon === "github" ? "GitHub" : icon;

/** One external, labelled social link. */
const socialLink = (
  item: SocialLink,
): Html<never, "a"> =>
  a(
    [
      attr("href", item.link),
      attr("target", "_blank"),
      attr("rel", "noopener noreferrer"),
      attr("aria-label", socialName(item.icon)),
      class_("vp-social"),
    ],
    [
      span(
        [class_("vp-social-label")],
        [text(socialName(item.icon))],
      ),
    ],
  );

/**
 * The site's social links in a wrapper the given class
 * shows/hides per breakpoint — the rail carries them on
 * lg+, the sidebar drawer below lg — so GitHub stays
 * reachable when the rail is hidden.
 */
export const socialLinks = (
  config: SiteConfig,
  wrapClass: SoftStr,
): Html<never, "div"> =>
  div(
    [class_(wrapClass)],
    config.social.map(socialLink),
  );

/**
 * The far-RIGHT CHROME RAIL (lg+ only, qmu DocsLayout): a 48px column with
 * the appearance toggle + social links pinned to the
 * bottom by a flex spacer. Carries NO navigation and no
 * wordmark — the nav tree and the home link both live in
 * the sidebar column to its right. Hidden below lg (its
 * controls move to the mobile bar + drawer).
 */
export const chromeRail = (
  config: SiteConfig,
): Html<never, "div"> =>
  div(
    [class_("vp-rail")],
    [
      div([class_("vp-rail-spacer")], []),
      div(
        [class_("vp-rail-controls")],
        [
          staticThemeToggle,
          socialLinks(config, "vp-rail-social"),
        ],
      ),
    ],
  );

/**
 * The sticky MOBILE BAR (below lg only): the `☰` menu
 * button (a label targeting the layout's hidden
 * `#vp-menu-toggle` checkbox — the CSS-only drawer), the
 * wordmark home link (marked current on the home page),
 * and the appearance toggle. `showMenu` is false on pages
 * with no sidebar (home, 404), so the button opens no
 * empty drawer. Hidden on lg+ (the sidebar is permanent
 * and the chrome lives in the rail). Returns a `<header>`
 * banner, not a nav landmark — navigation is the sidebar.
 */
export const mobileBar = (
  config: SiteConfig,
  activePath: SoftStr,
  showMenu: boolean,
): Html<never, "header"> => {
  const hrefOf = href(config.base);
  const sameAsActive = samePath(config.base);
  const homeAttrs: ReadonlyArray<
    Attribute<never>
  > = sameAsActive("/", activePath)
    ? [
        attr("href", hrefOf("/")),
        attr("aria-current", "page"),
        class_("vp-mobilebar-home"),
      ]
    : [
        attr("href", hrefOf("/")),
        class_("vp-mobilebar-home"),
      ];
  const menuBtn: ReadonlyArray<Flow<never>> =
    showMenu
      ? [
          label(
            [
              attr("for", "vp-menu-toggle"),
              class_("vp-menu-btn"),
              attr("aria-label", "Toggle menu"),
              attr("role", "button"),
            ],
            [],
          ),
        ]
      : [];
  return header(
    [class_("vp-mobilebar")],
    [
      ...menuBtn,
      a(homeAttrs, [text(config.title)]),
      staticThemeToggle,
    ],
  );
};
