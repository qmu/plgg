import { type SoftStr } from "plgg";
import {
  type Html,
  type Attribute,
  nav,
  a,
  text,
  attr,
} from "plgg-view";
import {
  style_,
  flex,
  wrap,
  gap,
  items,
  px,
  py,
  weight,
  color,
  bg,
} from "plgg-view/style";
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
 * marked active at build time — flagged with
 * `aria-current="page"` and the primary accent — so the
 * chrome needs no client JS to highlight the current
 * page. Returns a semantic `<nav>` landmark.
 */
export const navBar = (
  config: SiteConfig,
  activePath: SoftStr,
): Html<never, "nav"> => {
  const hrefOf = href(config.base);
  const sameAsActive = samePath(config.base);
  const isActive = (link: SoftStr): boolean =>
    sameAsActive(link, activePath);
  const linkAttrs = (
    link: SoftStr,
  ): ReadonlyArray<Attribute<never>> =>
    isActive(link)
      ? [
          attr("href", hrefOf(link)),
          attr("aria-current", "page"),
          style_(color("primary"), weight(600)),
        ]
      : [
          attr("href", hrefOf(link)),
          style_(color("text")),
        ];
  return nav(
    [
      attr("aria-label", "Main navigation"),
      style_(
        flex,
        wrap,
        items("center"),
        gap(4),
        px(4),
        py(3),
        bg("surface"),
      ),
    ],
    [
      a(
        [
          attr("href", hrefOf("/")),
          style_(weight(700), color("text")),
        ],
        [text(config.title)],
      ),
      ...config.nav.map((item) =>
        a(linkAttrs(item.link), [
          text(item.text),
        ]),
      ),
    ],
  );
};
