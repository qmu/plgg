import { type SoftStr } from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  header,
  div,
  a,
  button,
  span,
  svg,
  path,
  label,
  text,
  attr,
  class_,
} from "plggmatic";
import {
  type SiteConfig,
  type SocialLink,
} from "plggpress/SiteConfig/model/SiteConfig";
import {
  href,
  samePath,
} from "plggpress/Href/usecase/href";

/**
 * The appearance toggle — a CSS-drawn sun (light) / moon
 * (dark) button, swapped on `html.dark` by {@link baseCss}
 * and wired to flip + persist by the themeScript. Shared
 * by the far-right chrome rail (lg+) and the mobile bar
 * (below lg), so both breakpoints can toggle the theme;
 * the themeScript binds EVERY `.vp-theme-toggle`.
 */
const themeToggle = (): Html<never, "button"> =>
  button(
    [
      class_("vp-theme-toggle"),
      attr("type", "button"),
      attr("aria-label", "Toggle dark mode"),
    ],
    [
      // The oracle's own icons (ThemeToggle.tsx),
      // ported verbatim: an 8-ray sun and a
      // crescent, single currentColor paths.
      svg(
        [
          class_("vp-sun"),
          attr("viewBox", "0 0 24 24"),
          attr("fill", "currentColor"),
          attr("aria-hidden", "true"),
        ],
        [
          path(
            [
              attr(
                "d",
                "M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM11 1h2v3h-2zm0 19h2v3h-2zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85l1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2zM4 11v2H1v-2z",
              ),
            ],
            [],
          ),
        ],
      ),
      svg(
        [
          class_("vp-moon"),
          attr("viewBox", "0 0 24 24"),
          attr("fill", "currentColor"),
          attr("aria-hidden", "true"),
        ],
        [
          path(
            [
              attr(
                "d",
                "M9.822 2.238a9 9 0 0 0 11.94 11.94C20.768 18.654 16.775 22 12 22 6.477 22 2 17.523 2 12c0-4.775 3.346-8.768 7.822-9.762z",
              ),
            ],
            [],
          ),
        ],
      ),
    ],
  );

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
          themeToggle(),
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
      themeToggle(),
    ],
  );
};
