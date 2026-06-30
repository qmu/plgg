import { type SoftStr } from "plgg";
import {
  type Html,
  type Attribute,
  nav,
  div,
  a,
  button,
  span,
  label,
  text,
  attr,
  class_,
} from "plgg-view";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import {
  href,
  samePath,
} from "plgg-press/Href/usecase/href";

/**
 * The top navigation bar built purely from
 * `config.nav`. The brand sits left; a right-aligned
 * group holds the nav links, the appearance toggle, and
 * (on mobile) the `☰` menu label. Every link is routed
 * through the single {@link href} resolver, and the
 * entry whose resolved target equals the resolved
 * current `activePath` is marked active at build time
 * with `aria-current="page"` (styled by {@link baseCss})
 * — so highlighting needs no client JS.
 *
 * The `.vp-theme-toggle` button shows a sun (light) or
 * moon (dark) glyph, swapped by CSS on `html.dark`; the
 * themeScript wires its click to flip + persist the
 * theme. The `☰` label targets the page layout's hidden
 * `#vp-menu-toggle` checkbox (CSS-only mobile sidebar).
 * Returns a semantic `<nav>` landmark.
 */
export const navBar = (
  config: SiteConfig,
  activePath: SoftStr,
): Html<never, "nav"> => {
  const hrefOf = href(config.base);
  const sameAsActive = samePath(config.base);
  const linkAttrs = (
    link: SoftStr,
  ): ReadonlyArray<Attribute<never>> =>
    sameAsActive(link, activePath)
      ? [
          attr("href", hrefOf(link)),
          attr("aria-current", "page"),
        ]
      : [attr("href", hrefOf(link))];
  return nav(
    [
      class_("vp-nav"),
      attr("aria-label", "Main navigation"),
    ],
    [
      a(
        [
          attr("href", hrefOf("/")),
          class_("vp-nav-brand"),
        ],
        [text(config.title)],
      ),
      div(
        [class_("vp-nav-right")],
        [
          div(
            [class_("vp-nav-links")],
            config.nav.map((item) =>
              a(linkAttrs(item.link), [
                text(item.text),
              ]),
            ),
          ),
          button(
            [
              class_("vp-theme-toggle"),
              attr("type", "button"),
              attr(
                "aria-label",
                "Toggle dark mode",
              ),
            ],
            [
              // icons are CSS-drawn (no fragile glyph
              // fonts); the sun shows in light, the
              // moon in dark via html.dark
              span([class_("vp-sun")], []),
              span([class_("vp-moon")], []),
            ],
          ),
          label(
            [
              attr("for", "vp-menu-toggle"),
              class_("vp-menu-btn"),
              attr("aria-label", "Toggle menu"),
              attr("role", "button"),
            ],
            // a CSS-drawn 3-bar icon, not a glyph
            [],
          ),
        ],
      ),
    ],
  );
};
