import { type SoftStr, matchOption } from "plgg";
import {
  type Html,
  type Flow,
  type Attribute,
  nav,
  div,
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
  return nav(
    [
      class_("vp-sidebar-nav"),
      attr("aria-label", "Sidebar navigation"),
    ],
    groups.map((group) =>
      div(
        [class_("vp-group")],
        [
          div(
            [class_("vp-group-title")],
            [text(group.text)],
          ),
          ...group.items.map(renderItem),
        ],
      ),
    ),
  );
};
