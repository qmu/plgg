import { type SoftStr, matchOption } from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  nav,
  div,
  details,
  summary,
  a,
  span,
  text,
  attr,
  class_,
} from "plggpress/framework";
import {
  type SidebarGroup,
  type SidebarItem,
} from "plggpress/SiteConfig/model/SiteConfig";
import {
  href,
  samePath,
} from "plggpress/Href/usecase/href";

/**
 * The documentation sidebar as an ALWAYS-EXPANDED nav
 * tree (qmu.co.jp's sidebar-first model) — no
 * `<details>`/collapse carets. Top-level groups render as
 * plain `.vp-group` section headers; nested groups render
 * their header then their children, indented and always
 * visible; leaves are links routed through the single
 * {@link href} resolver. The link whose resolved target
 * equals the resolved `activePath` is marked active at
 * build time (`aria-current="page"`) and wears the
 * inverted-pill styling {@link baseCss} owns; hovering any
 * leaf applies the same inversion. A link-less, child-less
 * item renders as plain text. Zero client JavaScript —
 * the whole tree is static SSR. Returns a semantic `<nav>`
 * landmark.
 */
export const sidebarTree = (
  groups: ReadonlyArray<SidebarGroup>,
  activePath: SoftStr,
  base: SoftStr,
  toggle: boolean = false,
): Html<never, "nav"> => {
  const hrefOf = href(base);
  const sameAsActive = samePath(base);
  const isActive = (link: SoftStr): boolean =>
    sameAsActive(link, activePath);
  const linkAttrs = (
    link: SoftStr,
  ): ReadonlyArray<Attribute<never>> =>
    isActive(link)
      ? [
          attr("href", hrefOf(link)),
          attr("aria-current", "page"),
          class_("vp-sidebar-link"),
        ]
      : [
          attr("href", hrefOf(link)),
          class_("vp-sidebar-link"),
        ];
  const leaf = (item: SidebarItem): Flow<never> =>
    matchOption<SoftStr, Flow<never>>(
      () =>
        span(
          [class_("vp-sidebar-flat")],
          [text(item.text)],
        ),
      (link) =>
        a(linkAttrs(link), [text(item.text)]),
    )(item.link);
  const renderItem = (
    item: SidebarItem,
  ): Flow<never> =>
    item.items.length === 0
      ? leaf(item)
      : div(
          [class_("vp-subgroup")],
          [
            matchOption<SoftStr, Flow<never>>(
              () =>
                div(
                  [class_("vp-subgroup-title")],
                  [text(item.text)],
                ),
              (link) =>
                a(linkAttrs(link), [
                  text(item.text),
                ]),
            )(item.link),
            ...item.items.map(renderItem),
          ],
        );
  const holdsActive = (
    items: ReadonlyArray<SidebarItem>,
  ): boolean =>
    items.some(
      (item) =>
        matchOption<SoftStr, boolean>(
          () => false,
          isActive,
        )(item.link) || holdsActive(item.items),
    );
  // A disclosure group is open only where the current
  // page lives, so a page opens with its own section
  // unfolded and the rest folded away.
  const group = (g: SidebarGroup): Flow<never> =>
    toggle
      ? details(
          holdsActive(g.items)
            ? [
                class_("vp-group"),
                attr("name", "vp-group"),
                attr("open", ""),
              ]
            : [
                class_("vp-group"),
                attr("name", "vp-group"),
              ],
          [
            summary(
              [class_("vp-group-title")],
              [text(g.text)],
            ),
            ...g.items.map(renderItem),
          ],
        )
      : div(
          [class_("vp-group")],
          [
            div(
              [class_("vp-group-title")],
              [text(g.text)],
            ),
            ...g.items.map(renderItem),
          ],
        );
  return nav(
    [
      class_("vp-sidebar-nav"),
      attr("aria-label", "Sidebar navigation"),
    ],
    groups.map(group),
  );
};
