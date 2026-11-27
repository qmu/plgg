import {
  shellBarClass,
  shellBarBrandClass,
  shellMenuButtonClass,
  shellFoldClass,
  shellFootClass,
  shellMinAttr,
  shellRailClass,
  shellRailGroupClass,
  chromeLinksClass,
  chromeLinkClass,
  chromeLinkLabelClass,
  siteBarHomeClass,
  siteBarNoteClass,
} from "plggmatic";
import { type SoftStr } from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  header,
  div,
  a,
  span,
  button,
  label,
  text,
  attr,
  class_,
} from "plggpress/framework";
import { staticThemeToggle } from "plggpress/themeSupport/styleEntry";
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
      class_("vp-social " + chromeLinkClass),
    ],
    [
      span(
        [
          class_(
            "vp-social-label " +
              chromeLinkLabelClass,
          ),
        ],
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
    [class_(wrapClass + " " + chromeLinksClass)],
    config.social.map(socialLink),
  );

/**
 * The far-RIGHT CHROME RAIL (lg+ only, qmu DocsLayout): a
 * 48px column carrying the appearance toggle and the social
 * links, grouped at the TOP — every control the site offers
 * is in one place, at one corner, so a reader never has to
 * learn where a given affordance was put. Carries NO
 * navigation and no wordmark: the nav tree and the home
 * link live in the sections column at the other end of the
 * strip. Hidden below lg (its controls move to the mobile
 * bar).
 */
export const chromeRail = (
  config: SiteConfig,
): Html<never, "div"> =>
  div(
    [class_("vp-rail " + shellRailClass)],
    [
      div(
        [
          class_(
            "vp-rail-controls " +
              shellRailGroupClass,
          ),
        ],
        [
          staticThemeToggle,
          socialLinks(config, "vp-rail-social"),
        ],
      ),
    ],
  );

/**
 * The class of the control that folds the sidebar, and
 * the attribute it sets on `<html>` — the framework's own
 * folded-shell state, so the kit's rules answer it. Named once: the page, the
 * stylesheet and the wiring script all read them here.
 */
export const sidebarFoldClass: SoftStr =
  "vp-fold-btn";
export const sidebarMinAttr: SoftStr =
  shellMinAttr;

/**
 * The control that folds the sidebar to a narrow strip and
 * back (`controls: "sidebar"`), at the right of the
 * sidebar's head. A real `<button>` the wiring script
 * binds; with no script it does nothing and the sidebar
 * simply stays open. lg+ only — below lg the sidebar is
 * the drawer, which has its own control.
 */
export const sidebarFold: Html<never, "button"> =
  button(
    [
      attr("type", "button"),
      class_(
        sidebarFoldClass + " " + shellFoldClass,
      ),
      attr("aria-label", "Fold the sidebar"),
      attr("aria-expanded", "true"),
    ],
    [span([class_("vp-fold-icon")], [])],
  );

/**
 * The foot of the sidebar for the same site: the
 * appearance toggle and the social links, in one row at
 * the bottom of the column.
 */
export const sidebarFoot = (
  config: SiteConfig,
): Html<never, "div"> =>
  div(
    [class_("vp-sidebar-foot " + shellFootClass)],
    [
      staticThemeToggle,
      socialLinks(config, "vp-foot-social"),
    ],
  );

/** Whether the site keeps its controls in the sidebar. */
export const controlsInSidebar = (
  config: SiteConfig,
): boolean =>
  config.controls?.__tag === "Some" &&
  config.controls.content === "sidebar";

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
  title = config.title,
  description?: string,
): Html<never, "header"> => {
  const hrefOf = href(config.base);
  const sameAsActive = samePath(config.base);
  const homeAttrs: ReadonlyArray<
    Attribute<never>
  > = sameAsActive("/", activePath)
    ? [
        attr("href", hrefOf("/")),
        attr("aria-current", "page"),
        class_(
          "vp-mobilebar-home " +
            siteBarHomeClass +
            " " +
            shellBarBrandClass,
        ),
      ]
    : [
        attr("href", hrefOf("/")),
        class_(
          "vp-mobilebar-home " +
            siteBarHomeClass +
            " " +
            shellBarBrandClass,
        ),
      ];
  const menuBtn: ReadonlyArray<Flow<never>> =
    showMenu
      ? [
          label(
            [
              attr("for", "vp-menu-toggle"),
              class_(
                "vp-menu-btn " +
                  shellMenuButtonClass,
              ),
              attr("aria-label", "Toggle menu"),
              attr("role", "button"),
            ],
            [],
          ),
        ]
      : [];
  return header(
    [class_("vp-mobilebar " + shellBarClass)],
    [
      ...menuBtn,
      a(homeAttrs, [
        text(title),
        ...(description
          ? [
              span(
                [
                  class_(
                    "vp-mobile-description " +
                      siteBarNoteClass,
                  ),
                ],
                [span([], [text(description)])],
              ),
            ]
          : []),
      ]),
      // below lg the rail is hidden, so the mobile bar —
      // not the sections drawer — carries the same control
      // group. The sections column stays navigation only,
      // at every breakpoint.
      socialLinks(config, "vp-mobilebar-social"),
      staticThemeToggle,
    ],
  );
};
