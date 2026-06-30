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
  class_,
} from "plgg-view";
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
 * (`aria-current="page"`, styled by {@link baseCss}), and
 * any disclosure on the path to it is rendered `open` so
 * the current page is revealed without scripting.
 * Presentation (indent, hierarchy, active highlight) is
 * owned by {@link baseCss} via the `.vp-sidebar` class.
 * Returns a semantic `<nav>` landmark.
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
  const linkAttrs = (
    link: SoftStr,
  ): ReadonlyArray<Attribute<never>> =>
    isActive(link)
      ? [
          attr("href", hrefOf(link)),
          attr("aria-current", "page"),
        ]
      : [attr("href", hrefOf(link))];
  const leaf = (item: SidebarItem): Flow<never> =>
    matchOption<SoftStr, Flow<never>>(
      () => span([], [text(item.text)]),
      (link) => a(linkAttrs(link), [text(item.text)]),
    )(item.link);
  const renderItem = (
    item: SidebarItem,
  ): Flow<never> =>
    item.items.length === 0
      ? leaf(item)
      : details(openAttrs(holdsActive(item)), [
          summary([], [text(item.text)]),
          ...item.items.map((child) =>
            renderItem(child),
          ),
        ]);
  return nav(
    [
      class_("vp-sidebar"),
      attr("aria-label", "Sidebar navigation"),
    ],
    groups.map((group) =>
      details(
        [class_("vp-group"), attr("open", "")],
        [
          summary(
            [class_("vp-group-title")],
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
