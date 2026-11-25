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
} from "plgg-view";
// Deep `Style` import, not the `styleEntry` barrel, for the
// reason `themeToggle` records: this module is routed onto
// the `/style` surface, so a barrel import would close a
// cycle.
import {
  type Theme,
  colorVar,
} from "plggmatic/Style";
import { type NavItem } from "plggmatic/Component/model/navItem";

/**
 * A titled bucket of {@link NavItem}s: one section of a
 * {@link sidebarNav}.
 */
export type NavGroup = Readonly<{
  label: SoftStr;
  items: ReadonlyArray<NavItem>;
}>;

/**
 * The class vocabulary of {@link sidebarNav}, exported so a
 * host that draws a look-alike row outside the tree (a
 * section index, a touch-target override) names the same
 * classes instead of re-typing them.
 */
export const sidebarNavClass = {
  nav: "pm-nav",
  numbered: "pm-nav-numbered",
  group: "pm-nav-group",
  groupTitle: "pm-nav-group-title",
  link: "pm-nav-link",
  flat: "pm-nav-flat",
  subgroup: "pm-nav-subgroup",
  subgroupTitle: "pm-nav-subgroup-title",
} satisfies Record<string, SoftStr>;

/**
 * What a {@link sidebarNav} is drawn from. `resolve` turns
 * an item's `href` into the address written on the link
 * (a host's base-path resolver); `current` says whether an
 * `href` is the page being shown. Both are the host's, so
 * the component holds no routing rule of its own.
 */
export type SidebarNavProps = Readonly<{
  groups: ReadonlyArray<NavGroup>;
  resolve: (href: SoftStr) => SoftStr;
  current: (href: SoftStr) => boolean;
  /** Each group is a disclosure, open where the current page lives. */
  toggle: boolean;
  /** Rows are counted 01, 02, … (per group when `toggle`). */
  numbered: boolean;
  label: SoftStr;
}>;

/**
 * The sidebar: full-width ruled rows in titled groups, the
 * current row inverted. **Recorded rule**: the tree is
 * flush left — hierarchy reads from weight and spacing,
 * never indentation — and a group is either always open
 * (a plain header) or, with `toggle`, a named disclosure
 * that opens with the group holding the current page and
 * closes its siblings; there is no third state kept in
 * script. Zero client JavaScript. Returns the `<nav>`
 * landmark itself, unlike {@link navTree}, because a
 * sidebar is the whole landmark, not a list placed inside
 * a pane that owns one.
 */
export const sidebarNav = (
  props: SidebarNavProps,
): Html<never, "nav"> => {
  const c = sidebarNavClass;
  const linkAttrs = (
    href: SoftStr,
  ): ReadonlyArray<Attribute<never>> =>
    props.current(href)
      ? [
          attr("href", props.resolve(href)),
          attr("aria-current", "page"),
          class_(c.link),
        ]
      : [
          attr("href", props.resolve(href)),
          class_(c.link),
        ];
  const leaf = (item: NavItem): Flow<never> =>
    matchOption<SoftStr, Flow<never>>(
      () =>
        span(
          [class_(c.flat)],
          [text(item.label)],
        ),
      (href) =>
        a(linkAttrs(href), [text(item.label)]),
    )(item.href);
  const renderItem = (
    item: NavItem,
  ): Flow<never> =>
    item.children.length === 0
      ? leaf(item)
      : div(
          [class_(c.subgroup)],
          [
            matchOption<SoftStr, Flow<never>>(
              () =>
                div(
                  [class_(c.subgroupTitle)],
                  [text(item.label)],
                ),
              (href) =>
                a(linkAttrs(href), [
                  text(item.label),
                ]),
            )(item.href),
            ...item.children.map(renderItem),
          ],
        );
  const holdsCurrent = (
    items: ReadonlyArray<NavItem>,
  ): boolean =>
    items.some(
      (item) =>
        matchOption<SoftStr, boolean>(
          () => false,
          props.current,
        )(item.href) ||
        holdsCurrent(item.children),
    );
  const group = (g: NavGroup): Flow<never> =>
    props.toggle
      ? details(
          holdsCurrent(g.items)
            ? [
                class_(c.group),
                attr("name", c.group),
                attr("open", ""),
              ]
            : [
                class_(c.group),
                attr("name", c.group),
              ],
          [
            summary(
              [class_(c.groupTitle)],
              [text(g.label)],
            ),
            ...g.items.map(renderItem),
          ],
        )
      : div(
          [class_(c.group)],
          [
            div(
              [class_(c.groupTitle)],
              [text(g.label)],
            ),
            ...g.items.map(renderItem),
          ],
        );
  return nav(
    [
      class_(
        props.numbered
          ? c.nav + " " + c.numbered
          : c.nav,
      ),
      attr("aria-label", props.label),
    ],
    props.groups.map(group),
  );
};

/**
 * The sidebar's stylesheet. Escape-safe — no raw `<`, `>`
 * or `&` (descendant selectors only, no child combinator,
 * no nesting) — so a host may inline it through an SSR
 * text escaper byte-for-byte. Colors resolve through the
 * theme's custom properties, so the rows rescheme with the
 * rest of the tree.
 */
export const sidebarNavCss = (
  theme: Theme,
): SoftStr => {
  const cvar = colorVar(theme);
  return `.pm-nav{display:block}
/* top-level section header — always visible, no collapse */
.pm-nav-group{margin:0}
.pm-nav-group-title{
  padding:1.1rem 1.25rem 0.4rem;font-size:0.75rem;
  line-height:1.25rem;
  font-weight:500;color:${cvar("muted")};
  border-bottom:1px solid ${cvar("border")};
}
/* leaves + subgroup headers: an inverted pill on hover;
   the active leaf wears the same pill permanently (both
   tokens flip under dark). Active and inactive share one
   box so the current page never reflows its neighbours. */
/* qmu's text-sm pins the leading at 1.25rem (20px) and
   gap-px separates items - a 29px pitch, tighter than the
   prose leading these would otherwise inherit. */
.pm-nav-link{
  display:block;
  padding:0.5rem 1.25rem;
  border-bottom:1px solid ${cvar("border")};
  font-size:0.875rem;line-height:1.45;
  color:${cvar("text")};
}
.pm-nav-link:hover{
  background:${cvar("surface-2")};
  text-decoration:none;
}
.pm-nav-link:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.pm-nav-link[aria-current]{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  border-bottom-color:${cvar("primary-base")};
}
.pm-nav-flat{
  display:block;
  padding:0.5rem 1.25rem;
  border-bottom:1px solid ${cvar("border")};
  font-size:0.875rem;line-height:1.45;
  color:${cvar("muted")};
}
/* a nested group: its header, then its children, always
   shown (no disclosure). qmu keeps the whole tree flush
   left — hierarchy reads from weight and spacing alone,
   never indentation (SidebarTree.tsx has no pl-/ml-). */
.pm-nav-subgroup{margin:0}
.pm-nav-subgroup-title{
  padding:0.5rem 1.25rem;font-size:0.875rem;
  line-height:1.45;
  border-bottom:1px solid ${cvar("border")};
  font-weight:600;color:${cvar("text")};
}
.pm-nav-numbered{counter-reset:sample}
/* toggle groups: a disclosure per section. The summary
   wears the links' inverted pill on hover, its chevron
   turns as the section opens, and the section's height
   eases where the browser can interpolate to auto. */
details.pm-nav-group{counter-reset:sample;interpolate-size:allow-keywords}
details.pm-nav-group summary{
  cursor:pointer;list-style:none;display:flex;
  justify-content:space-between;align-items:center;
  padding:.7rem 1.25rem;font-size:.8rem;user-select:none;
  transition:background-color .15s ease,color .15s ease;
}
details.pm-nav-group summary::-webkit-details-marker{display:none}
details.pm-nav-group summary::after{
  content:"";width:.4rem;height:.4rem;margin-right:.2rem;
  border-right:1px solid currentColor;
  border-bottom:1px solid currentColor;
  transform:rotate(-45deg);transition:transform .2s ease;
}
details.pm-nav-group[open] summary::after{transform:rotate(45deg)}
details.pm-nav-group[open] summary{color:${cvar("text")}}
details.pm-nav-group summary:hover,
details.pm-nav-group summary:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};outline:0;
}
details.pm-nav-group summary:active{opacity:.8}
details.pm-nav-group::details-content{
  block-size:0;overflow:clip;
  transition:block-size .22s ease,
    content-visibility .22s allow-discrete;
}
details.pm-nav-group[open]::details-content{block-size:auto}
details.pm-nav-group .pm-nav-link{
  transition:background-color .15s ease,color .15s ease,
    padding-left .15s ease;
}
details.pm-nav-group .pm-nav-link:hover{padding-left:1.5rem}
details.pm-nav-group .pm-nav-link[aria-current]:hover{
  padding-left:1.25rem;
}
@media (prefers-reduced-motion:reduce){
  details.pm-nav-group summary,
  details.pm-nav-group summary::after,
  details.pm-nav-group::details-content,
  details.pm-nav-group .pm-nav-link{transition:none}
}
.pm-nav-numbered .pm-nav-link{counter-increment:sample}
.pm-nav-numbered .pm-nav-link::before{content:counter(sample,decimal-leading-zero);font-variant-numeric:tabular-nums;margin-right:1rem}`;
};

/**
 * A statement (no `<script>` wrapper) that brings the
 * current row into view when the page opened with it below
 * the fold of its scrolling column. The one piece of script
 * a sidebar wants, and optional: without it the row is
 * still marked, only possibly off screen.
 */
export const sidebarNavRevealScript: SoftStr =
  "(function(){var a=document.querySelector(" +
  JSON.stringify(
    "." + sidebarNavClass.nav + " [aria-current]",
  ) +
  ");for(var b=a&&a.parentElement;b;b=b.parentElement){" +
  "if(b.scrollHeight>b.clientHeight+1){" +
  "var r=a.getBoundingClientRect()," +
  "q=b.getBoundingClientRect();" +
  "if(r.top<q.top||r.bottom>q.bottom)" +
  "b.scrollTop+=r.top-q.top-q.height/2;" +
  "break;}}})();";
