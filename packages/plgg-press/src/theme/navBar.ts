import { type SoftStr } from "plgg";
import {
  type Html,
  type Attribute,
  nav,
  div,
  a,
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
 * `config.nav`. Every link is routed through the single
 * {@link href} resolver (so the deploy `base` is applied
 * in exactly one place), and the entry whose resolved
 * target equals the resolved current `activePath` is
 * marked active at build time with `aria-current="page"`
 * (styled by {@link baseCss}) — so the chrome needs no
 * client JS to highlight the current page. The trailing
 * `☰` label targets the page layout's hidden
 * `#vp-menu-toggle` checkbox, driving the CSS-only mobile
 * sidebar disclosure. Returns a semantic `<nav>`
 * landmark.
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
        [class_("vp-nav-links")],
        config.nav.map((item) =>
          a(linkAttrs(item.link), [
            text(item.text),
          ]),
        ),
      ),
      label(
        [
          attr("for", "vp-menu-toggle"),
          class_("vp-menu-btn"),
          attr("aria-label", "Toggle menu"),
        ],
        [text("☰")],
      ),
    ],
  );
};
