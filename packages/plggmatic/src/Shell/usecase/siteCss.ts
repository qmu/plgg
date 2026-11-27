import { type SoftStr } from "plgg";
import {
  type Theme,
  themeToggleClass,
  sidebarNavClass,
  selector,
  colorVar,
  metricVar,
  maxWidth,
  minWidth,
} from "plggmatic/styleEntry";
import {
  type Appearance,
  monochrome,
} from "plggmatic/Shell";
import {
  docClass,
  figurePageClass,
  shareClass,
  shellBackdropClass,
  shellBarClass,
  shellBodyClass,
  shellClass,
  shellHeadClass,
  shellMenuButtonClass,
  shellMenuClass,
  shellPageClass,
  shellRailClass,
  shellSideClass,
  siteBarHomeClass,
  siteBarNoteClass,
  siteBodyClass,
  siteDrawerNoteClass,
  siteFillClass,
  siteMainClass,
  siteSectionClass,
  siteStripClass,
  trailClass,
} from "plggmatic/Meta/model/classHooks";

/**
 * THE SITE FRAME: what a site of documents adds to the
 * kit's shell — and the kit's to own, so every such site
 * is framed alike. The shell, the columns, the sidebar,
 * the pages that share the width, the prose, every mark
 * and every motion are the kit's own sheets, composed
 * AHEAD of this one. What a documentation site adds:
 *
 * - the page's ground (type, ink, paper) and its links;
 * - pages of a FIXED reading width, the drilled section
 *   column and the far-right chrome rail;
 * - the figure page on a phone: one figure, the bar, and
 *   nothing else;
 * - the words a narrow bar and its drawer carry.
 *
 * Its rules read the same appearance (rule colour, marks,
 * type), so they change with the kit. Escape-safe: no
 * raw `<`, `>` or `&`.
 */
export const siteCss = (
  theme: Theme,
  a: Appearance = monochrome,
): SoftStr => {
  const cvar = colorVar(theme);
  const mvar = metricVar(theme);
  return `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
/* qmu: anchor jumps in the lg app shell scroll the content
   column, not the page; smooth-scroll must be set on both.
   The reduced-motion RESET of these is the shared UI
   reducedMotionCss (composed by shell). */
main{scroll-behavior:smooth}
/* the site's own motion: article/chrome link hover fades.
   Killed under reduced-motion here (the framework reset only
   resets its own scroll motion). */
@media (prefers-reduced-motion:reduce){
  .${siteBodyClass} a{transition:none}
  .${docClass} a{transition:none}
}
body.${siteBodyClass}{
  margin:0;
  font-family:${a.font};
  font-size:${a.size};line-height:${a.leading};
  color:${cvar("text")};
  background:${cvar("surface")};
  -webkit-font-smoothing:antialiased;
}
/* Chrome links carry no underline in any state (qmu:
   every hover affordance is the inverted pill; only
   article prose underlines, and only at rest). No generic
   a:hover rule - its (0,2,1) specificity silently beat
   the pill classes' (0,2,0) and re-underlined them. */
:where(.${siteBodyClass}) a{
  color:${cvar("primary-base")};
  text-decoration:none;
}

/* ---- the column system ----------------------------------
   One frame, one strip, one column shape — the layout
   coop-planner and corpd share.
   FRAME  .${shellClass} is exactly the viewport, a flex column:
          the trail row (when more than one page is open)
          on top, the strip beneath taking the rest.
   STRIP  .${siteStripClass} scrolls HORIZONTALLY as columns open;
          nothing bounds its width.
   COLUMN every column — sections, drilled section, page —
          is the same thing: a fixed-height head bar that
          names it, and a body that scrolls VERTICALLY on
          its own. One hairline on its right edge is the
          only separator; there is no gap.
   Widths are declared once, here. */
.${siteStripClass}{scroll-padding-right:${mvar("rail")}}
.${siteSectionClass}{width:15rem}
.${shellPageClass}{
  width:min(
    clamp(40rem,45vw,calc(${mvar(
      "measure",
    )} + 4rem)),
    100vw
  );
}
.${siteSectionClass} .${shellBodyClass}{
  padding:0;font-size:0.875rem;
}
/* the phone bar and the drawer are the kit's; a site
   adds the appearance toggle and the social links to the
   bar */
.${shellBarClass} .${themeToggleClass}{margin-left:0.4rem}
.${siteMainClass}{display:block}
/* below sm (qmu's 639px block): the prose headings render
   oversized relative to the phone column; scale them down.
   Body text keeps its base size. */
@media ${maxWidth("sm")}{
  .${docClass} h1{font-size:1.25rem}
}

@media ${minWidth("lg")}{
  /* pages of a fixed width do not share the room, so the
     sidebar scrolls away with the strip as it always did */
  .${siteStripClass}:not(.${shareClass}) .${shellSideClass}{position:static}
  .${siteStripClass}:not(.${shareClass}){scroll-padding-left:0}
}

/* below lg the kit turns the sidebar into a drawer under
   a bar; what is the site's own there: no rail, no
   drilled section column (the drawer carries it), and a
   fixed-width page takes the whole window. */
@media ${maxWidth("lg")}{
  .${siteSectionClass}{display:none}
  .${shellPageClass}{width:100vw}
  .${shellPageClass} .${shellBodyClass}{
    padding:1.25rem 1.25rem 3rem;
  }
  .${docClass}{max-width:100%}
  .${docClass} pre{max-width:100%}
}
@media(min-width:1024px) and (max-width:1099px){
 .${shellClass}:has(.${figurePageClass}) .${shellBarClass}{display:flex}
 .${shellClass}:has(.${figurePageClass}) .${shellMenuButtonClass}{display:inline-block}
 .${siteStripClass}:has(.${figurePageClass}) :is(.${siteSectionClass},.${shellRailClass}){display:none}
 .${siteStripClass}:has(.${figurePageClass}) .${shellSideClass}{position:fixed;inset:0 auto 0 0;z-index:50;background:${cvar("surface")};transform:translateX(-100%)}
 .${shellMenuClass}:checked ~ .${siteStripClass}:has(.${figurePageClass}) .${shellSideClass}{transform:translateX(0)}
 .${shellMenuClass}:checked ~ .${shellBackdropClass}{display:block}
}
.${figurePageClass}{color-scheme:light}
html.dark .${figurePageClass}{color-scheme:dark}
.${siteDrawerNoteClass},.${siteBarNoteClass}{display:none}
@media(max-width:759px),(orientation:landscape) and (max-height:499px){
 .${shellClass}:has(.${figurePageClass}){height:100dvh;box-sizing:border-box;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
 .${shellClass}:has(.${figurePageClass}) .${shellBarClass}{height:48px;flex:none;box-sizing:border-box;padding-inline:0 12px}
 .${shellClass}:has(.${figurePageClass}) .${shellMenuButtonClass}{background-size:22px 2px;background-position:12px calc(50% - 6px),12px center,12px calc(50% + 6px)}
 .${shellClass}:has(.${figurePageClass}) .${shellBarClass} :is(label,button){min-width:44px;min-height:44px}
 .${figurePageClass} .${shellHeadClass}{display:none}
 .${shellClass}:has(.${figurePageClass}) .${siteBarHomeClass}{display:block;flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:20px}
 .${siteBarNoteClass}{display:block;font-size:12px;line-height:14px;height:14px;overflow:hidden;white-space:normal;color:${cvar("muted")}}
 .${siteBarNoteClass} span{display:inline-block;width:max-content}
 .${siteBarNoteClass}[data-overflow]{height:0;visibility:hidden}
 .${shellClass}:has(.${figurePageClass}) .${sidebarNavClass.link}{min-height:44px;box-sizing:border-box}
 .${siteDrawerNoteClass}{display:block;padding:0 1rem}
 .${siteStripClass}:has(.${figurePageClass}){scrollbar-width:none}
}
@media(orientation:landscape) and (max-height:499px){
 .${shellClass}:has(.${figurePageClass}) .${shellBarClass}{height:40px}
}
.${docClass} [data-island]{display:block;margin:1.25rem 0}
::selection{
  background:${cvar("text")};
  color:${cvar("surface")};
}

/* the sheet page (one figure filling its column) is the
   kit's figure page; nothing of it is declared here */
/* pages that share the width need no row naming them: each
   one's own head does, and its close control is there */
.${shellClass}:has(.${siteFillClass}) ${selector(trailClass)}{display:none}
@media (prefers-reduced-motion:reduce){
  .${shellSideClass}{transition:none}
}
`;
};
