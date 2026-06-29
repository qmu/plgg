import { type SoftStr, matchOption } from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  nav,
  details,
  summary,
  a,
  span,
  text,
  attr,
} from "plgg-view";
import {
  style_,
  flexCol,
  gap,
  p as pad,
  py,
  block,
  weight,
  pointer,
  color,
} from "plgg-view/style";
import {
  type SidebarGroup,
  type SidebarItem,
} from "plgg-press/SiteConfig/model/SiteConfig";
import {
  href,
  samePath,
} from "plgg-press/Href/usecase/href";

/**
 * The documentation sidebar as a nested, CSS-only
 * collapsible tree. Every grouping with children becomes
 * a native `<details>`/`<summary>` disclosure, so expand
 * and collapse work with zero client JavaScript — the
 * browser's built-in behaviour is the whole mechanism.
 * Leaves are links routed through the single {@link href}
 * resolver; the link whose resolved target equals the
 * resolved `activePath` is marked active at build time
 * (`aria-current="page"` + the primary accent), and any
 * disclosure on the path to it is rendered `open` so the
 * current page is revealed without scripting. Returns a
 * semantic `<nav>` landmark.
 */
export const sidebarTree = (
  groups: ReadonlyArray<SidebarGroup>,
  activePath: SoftStr,
  base: SoftStr,
): Html<never, "nav"> => {
  const hrefOf = href(base);
  const sameAsActive = samePath(base);
  const isActive = (link: SoftStr): boolean =>
    sameAsActive(link, activePath);
  // Whether the active page lives anywhere in this
  // subtree, so its ancestor disclosures open at build.
  const holdsActive = (
    item: SidebarItem,
  ): boolean =>
    matchOption<SoftStr, boolean>(
      () => false,
      (link) => isActive(link),
    )(item.link) || item.items.some(holdsActive);
  const openAttrs = (
    on: boolean,
  ): ReadonlyArray<Attribute<never>> =>
    on ? [attr("open", "")] : [];
  const leaf = (item: SidebarItem): Flow<never> =>
    matchOption<SoftStr, Flow<never>>(
      () =>
        span(
          [style_(block, py(1), color("muted"))],
          [text(item.text)],
        ),
      (link) =>
        a(
          isActive(link)
            ? [
                attr("href", hrefOf(link)),
                attr("aria-current", "page"),
                style_(
                  block,
                  py(1),
                  color("primary"),
                  weight(600),
                ),
              ]
            : [
                attr("href", hrefOf(link)),
                style_(
                  block,
                  py(1),
                  color("text"),
                ),
              ],
          [text(item.text)],
        ),
    )(item.link);
  const renderItem = (
    item: SidebarItem,
  ): Flow<never> =>
    item.items.length === 0
      ? leaf(item)
      : details(openAttrs(holdsActive(item)), [
          summary(
            [style_(py(1), pointer, weight(500))],
            [text(item.text)],
          ),
          ...item.items.map((child) =>
            renderItem(child),
          ),
        ]);
  return nav(
    [
      attr("aria-label", "Sidebar navigation"),
      style_(flexCol, gap(1), pad(4)),
    ],
    groups.map((group) =>
      details(
        [attr("open", "")],
        [
          summary(
            [style_(py(1), pointer, weight(700))],
            [text(group.text)],
          ),
          ...group.items.map((item) =>
            renderItem(item),
          ),
        ],
      ),
    ),
  );
};
