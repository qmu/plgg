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
import {
  navClass,
  navNumberedClass,
  navGroupClass,
  navGroupTitleClass,
  navLinkClass,
  navFlatClass,
  navSubgroupClass,
  navSubgroupTitleClass,
} from "plggmatic/Meta/model/classHooks";

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
  nav: navClass,
  numbered: navNumberedClass,
  group: navGroupClass,
  groupTitle: navGroupTitleClass,
  link: navLinkClass,
  flat: navFlatClass,
  subgroup: navSubgroupClass,
  subgroupTitle: navSubgroupTitleClass,
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
  const c = sidebarNavClass;
  return `.${c.nav}{display:block}
/* top-level section header — always visible, no collapse */
.${c.group}{margin:0}
.${c.groupTitle}{
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
.${c.link}{
  display:block;
  padding:0.5rem 1.25rem;
  border-bottom:1px solid ${cvar("border")};
  font-size:0.875rem;line-height:1.45;
  color:${cvar("text")};
  text-decoration:none;
}
.${c.link}:hover{
  background:${cvar("surface-2")};
  text-decoration:none;
}
.${c.link}:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.${c.link}[aria-current]{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  border-bottom-color:${cvar("primary-base")};
}
.${c.flat}{
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
.${c.subgroup}{margin:0}
.${c.subgroupTitle}{
  padding:0.5rem 1.25rem;font-size:0.875rem;
  line-height:1.45;
  border-bottom:1px solid ${cvar("border")};
  font-weight:600;color:${cvar("text")};
}
.${c.numbered}{counter-reset:sample}
/* toggle groups: a disclosure per section. The summary
   wears the links' inverted pill on hover, its chevron
   turns as the section opens, and the section's height
   eases where the browser can interpolate to auto. */
details.${c.group}{counter-reset:sample;interpolate-size:allow-keywords}
details.${c.group} summary{
  cursor:pointer;list-style:none;display:flex;
  justify-content:space-between;align-items:center;
  padding:.7rem 1.25rem;font-size:.8rem;user-select:none;
  transition:background-color .15s ease,color .15s ease;
}
details.${c.group} summary::-webkit-details-marker{display:none}
details.${c.group} summary::after{
  content:"";width:.4rem;height:.4rem;margin-right:.2rem;
  border-right:1px solid currentColor;
  border-bottom:1px solid currentColor;
  transform:rotate(-45deg);transition:transform .2s ease;
}
details.${c.group}[open] summary::after{transform:rotate(45deg)}
details.${c.group}[open] summary{color:${cvar("text")}}
details.${c.group} summary:hover,
details.${c.group} summary:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};outline:0;
}
details.${c.group} summary:active{opacity:.8}
details.${c.group}::details-content{
  block-size:0;overflow:clip;
  transition:block-size .22s ease,
    content-visibility .22s allow-discrete;
}
details.${c.group}[open]::details-content{block-size:auto}
details.${c.group} .${c.link}{
  transition:background-color .15s ease,color .15s ease,
    padding-left .15s ease;
}
details.${c.group} .${c.link}:hover{padding-left:1.5rem}
details.${c.group} .${c.link}[aria-current]:hover{
  padding-left:1.25rem;
}
@media (prefers-reduced-motion:reduce){
  details.${c.group} summary,
  details.${c.group} summary::after,
  details.${c.group}::details-content,
  details.${c.group} .${c.link}{transition:none}
}
.${c.numbered} .${c.link}{counter-increment:sample}
.${c.numbered} .${c.link}::before{content:counter(sample,decimal-leading-zero);font-variant-numeric:tabular-nums;margin-right:1rem}`;
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
