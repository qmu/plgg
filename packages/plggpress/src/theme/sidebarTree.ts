import { type SoftStr } from "plgg";
import { type Html } from "plggpress/framework";
import {
  type NavItem,
  sidebarNav,
} from "plggmatic";
import {
  type SidebarGroup,
  type SidebarItem,
} from "plggpress/SiteConfig/model/SiteConfig";
import {
  href,
  samePath,
} from "plggpress/Href/usecase/href";

/**
 * The documentation sidebar: plggmatic's `sidebarNav`
 * drawn from the site config. This module only adapts —
 * it maps the config's `text`/`link`/`items` onto the
 * component's `NavItem`s and lends it the two things that
 * are plggpress's own: the single base-path {@link href}
 * resolver, and {@link samePath} to say which link is the
 * page being built. Rows, groups, the inverted current row
 * and (with `toggle`) the disclosure groups are the
 * framework's, so any plgg project that takes plggmatic
 * gets the same sidebar. Zero client JavaScript.
 */
export const sidebarTree = (
  groups: ReadonlyArray<SidebarGroup>,
  activePath: SoftStr,
  base: SoftStr,
  toggle: boolean = false,
  numbered: boolean = false,
): Html<never, "nav"> => {
  const sameAsActive = samePath(base);
  const item = (i: SidebarItem): NavItem => ({
    label: i.text,
    href: i.link,
    children: i.items.map(item),
  });
  return sidebarNav({
    groups: groups.map((g) => ({
      label: g.text,
      items: g.items.map(item),
    })),
    resolve: href(base),
    current: (link) =>
      sameAsActive(link, activePath),
    toggle,
    numbered,
    label: "Sidebar navigation",
  });
};
