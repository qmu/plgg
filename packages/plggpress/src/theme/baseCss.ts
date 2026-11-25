import { type SoftStr } from "plgg";
import {
  type Theme,
  themeToggleClass,
  sidebarNavClass,
  trailClass,
  shareInsetVar,
  selector,
  colorVar,
  metricVar,
  maxWidth,
  minWidth,
} from "plggpress/themeSupport/styleEntry";
import {
  type Appearance,
  type Mark,
  monochrome,
  shareClass,
  shellMinAttr,
} from "plggmatic";

/**
 * WHAT IS PLGGPRESS'S OWN in the stylesheet — and only
 * that. The frame, the columns, the sidebar, the pages
 * that share the width, the prose, every mark and every
 * motion are plggmatic's kit (`kitCss`: the UI system plus
 * an {@link Appearance}), which {@link shell} composes
 * AHEAD of this sheet. A plggpress site therefore looks
 * like any other plggmatic screen, and takes a different
 * look the same way: by handing the kit another
 * appearance.
 *
 * What a documentation site adds to that screen:
 *
 * - pages of a FIXED reading width (`contentWidth:
 *   "measure"`), the drilled section column, the trail row
 *   and the far-right chrome rail;
 * - the phone form: a sticky bar and the sidebar as an
 *   off-canvas drawer, CSS-only (a hidden
 *   `#vp-menu-toggle` checkbox);
 * - the sheet page (one figure filling its column);
 * - callouts, the footer, social links.
 *
 * Its own rules read the same appearance (rule colour,
 * marks, type), so they change with the kit.
 *
 * Injected INLINE into the document `<style>`, so it stays
 * escape-safe: NO raw `<`, `>`, or `&`. Media boundaries
 * are plggmatic's breakpoint constants
 * ({@link maxWidth}/{@link minWidth}).
 */
export const baseCss = (
  theme: Theme,
  a: Appearance = monochrome,
): SoftStr => {
  const cvar = colorVar(theme);
  const mvar = metricVar(theme);
  const rule = `${a.ruleWidth} solid ${cvar(a.rule)}`;
  const mark = (m: Mark): SoftStr =>
    `background:${cvar(m.fill)};color:${cvar(m.ink)}`;
  return `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
/* qmu: anchor jumps in the lg app shell scroll the content
   column, not the page; smooth-scroll must be set on both.
   The reduced-motion RESET of these is the shared UI
   reducedMotionCss (composed by shell). */
main{scroll-behavior:smooth}
/* plggpress-owned motion: article/chrome link hover fades.
   Killed under reduced-motion here (the framework reset only
   resets its own scroll motion). */
@media (prefers-reduced-motion:reduce){
  .vp a{transition:none}
  .vp-doc a{transition:none}
}
body.vp{
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
:where(.vp) a{
  color:${cvar("primary-base")};
  text-decoration:none;
}
.vp-menu-cb{display:none}

/* ---- the column system ----------------------------------
   One frame, one strip, one column shape — the layout
   coop-planner and corpd share.
   FRAME  .vp-shell is exactly the viewport, a flex column:
          the trail row (when more than one page is open)
          on top, the strip beneath taking the rest.
   STRIP  .vp-app scrolls HORIZONTALLY as columns open;
          nothing bounds its width.
   COLUMN every column — sections, drilled section, page —
          is the same thing: a fixed-height head bar that
          names it, and a body that scrolls VERTICALLY on
          its own. One hairline on its right edge is the
          only separator; there is no gap.
   Widths are declared once, here. */
.vp-app{scroll-padding-right:${mvar("rail")}}
.vp-section{width:15rem}
.vp-content{
  width:min(
    clamp(40rem,45vw,calc(${mvar(
      "measure",
    )} + 4rem)),
    100vw
  );
}
.vp-section .vp-col-body{
  padding:0;font-size:0.875rem;
}
${selector(trailClass)}{
  flex:none;display:flex;align-items:stretch;
  height:2rem;overflow-x:auto;
  border-bottom:${rule};
  background:${cvar("surface")};
  font-size:0.75rem;
}
${selector(trailClass)} button{
  flex:none;border:0;background:none;
  color:${cvar("muted")};font:inherit;
  padding:0 0.75rem;cursor:pointer;
  white-space:nowrap;max-width:14rem;
  overflow:hidden;text-overflow:ellipsis;
}
${selector(trailClass)} button + button::before{
  content:"›";margin-right:0.75rem;
  color:${cvar("muted")};
}
${selector(trailClass)} button[aria-current]{
  color:${cvar("text")};font-weight:600;
}
${selector(trailClass)} button:hover{
  color:${cvar("text")};
}
/* far-RIGHT chrome rail (lg+ only): the appearance toggle
   and the social links. Always the rightmost bar: pushed
   right while the strip is narrower than the viewport,
   stuck to the right edge once it scrolls. */
.vp-rail{
  display:none;flex:0 0 ${mvar("rail")};
  width:${mvar("rail")};
  flex-direction:column;align-items:center;
  padding:0.5rem 0 0.75rem;
  margin-left:auto;position:sticky;right:0;
  background:${cvar("surface")};
  border-left:${rule};
}
.vp-rail-controls{
  display:flex;flex-direction:column;
  align-items:center;gap:0.5rem;
}
.vp-rail-social{
  display:flex;flex-direction:column;
  align-items:center;gap:0.4rem;
}
/* sticky mobile bar (below lg only): menu button (when the
   page has a drawer), wordmark home link, appearance
   toggle. Hidden on lg+. */
.vp-mobilebar{
  display:none;position:sticky;top:0;z-index:30;
  align-items:center;gap:0.6rem;
  height:52px;padding:0 1rem;
  background:${cvar("surface")};
  border-bottom:${rule};
}
.vp-mobilebar-home{
  font-weight:600;font-size:1rem;
  color:${cvar("text")};
  padding:0.1rem 0.4rem;
  transition:background-color 0.15s
    cubic-bezier(0.4,0,0.2,1);
}
.vp-mobilebar-home:focus-visible{
  outline:${rule};outline-offset:-1px;
}
.vp-mobilebar-home[aria-current]{
  ${mark(a.current)};
}
.vp-mobilebar .${themeToggleClass}{margin-left:0.4rem}
/* dimmed backdrop behind an open mobile drawer */
.vp-backdrop{
  display:none;position:fixed;inset:0;z-index:40;
  background:rgba(0,0,0,0.4);
}

/* CSS-drawn 3-bar hamburger (no glyph font) */
.vp-menu-btn{
  display:none;width:22px;height:16px;
  cursor:pointer;color:${cvar("text")};
  background-image:linear-gradient(
      currentColor,currentColor),
    linear-gradient(currentColor,currentColor),
    linear-gradient(currentColor,currentColor);
  background-size:100% 2px;
  background-position:0 1px,0 7px,0 13px;
  background-repeat:no-repeat;
}

/* a site that keeps its controls in the sidebar: a fold
   control in the head, the appearance toggle at the foot */
.vp-fold-btn{display:none}
.vp-foot-social{display:flex;align-items:center}
/* social links live ONLY in the chrome group: the rail on
   lg+, the mobile bar below it. Nothing chrome-like is left
   in the sections column at any breakpoint. */
.vp-mobilebar-social{
  display:flex;align-items:center;gap:0.4rem;
  margin-left:auto;
}
.vp-social{
  display:inline-flex;align-items:center;
  padding:0.25rem 0.4rem;
  font-size:0.8rem;color:${cvar("muted")};
  transition:background-color 0.15s
    cubic-bezier(0.4,0,0.2,1);
}
.vp-social:hover{
  ${mark(a.press)};
  text-decoration:none;
}
.vp-social:focus-visible{
  ${mark(a.press)};
  text-decoration:none;
}
/* in the narrow rail the label rides vertically so the
   full name fits the 48px column. */
.vp-rail-social .vp-social-label{
  writing-mode:vertical-rl;letter-spacing:0.02em;
}

.vp-main{display:block}
.vp-footer{
  margin-top:2rem;padding:1.25rem 0;
  text-align:center;
}
.vp-footer-text{
  margin:0;font-size:13px;color:${cvar("muted")};
}
/* callouts — qmu's tinted model (VitePress-style), now on
   the D9 role matrix: tip=success, warning, danger each a
   role surface + text + border that reschemes per light/
   dark on the token layer (so the separate html.dark
   blocks collapse away); info/note stay the monochrome
   ink-on-neutral panel with a primary edge. Metrics follow
   qmu: my-5, rounded-md, border-l-4, px-4 py-3, text-sm
   leading-relaxed, semibold title inheriting the callout's
   text colour. */
.vp-callout{
  margin:1.25rem 0;padding:0.75rem 1rem;
  border:1px solid transparent;
  border-left-width:1px;
  font-size:0.875rem;line-height:1.625;
}
.vp-callout-title{font-weight:600;margin:0 0 0.35rem}
.vp-callout p{margin:0.35rem 0}
.vp-callout-info,.vp-callout-note{
  background:${cvar("surface")};
  border-color:${cvar("primary-base")};
  color:${cvar("text")};
}
.vp-callout-tip{
  background:${cvar("success-surface")};
  border-color:${cvar("success-border")};
  color:${cvar("success-text")};
}
.vp-callout-warning{
  background:${cvar("warning-surface")};
  border-color:${cvar("warning-border")};
  color:${cvar("warning-text")};
}
.vp-callout-danger{
  background:${cvar("danger-surface")};
  border-color:${cvar("danger-border")};
  color:${cvar("danger-text")};
}

/* below sm (qmu's 639px block): the prose headings render
   oversized relative to the phone column; scale them down.
   Body text keeps its base size. */
@media ${maxWidth("sm")}{
  .vp-doc h1{font-size:1.25rem}
}

@media ${minWidth("lg")}{
  .vp-rail{display:flex}
  .vp-fold-btn{display:inline-flex}
  html[${shellMinAttr}] .vp-sidebar .vp-tagline,
  html[${shellMinAttr}] .vp-sidebar .vp-footer-link,
  html[${shellMinAttr}] .vp-sidebar .vp-foot-social{display:none}
  /* pages of a fixed width do not share the room, so the
     sidebar scrolls away with the strip as it always did */
  .vp-app:not(.${shareClass}) .vp-sidebar{position:static}
  .vp-app:not(.${shareClass}){scroll-padding-left:0}
}

/* below lg: no rail; a sticky mobile bar + an off-canvas
   drawer (the sidebar), the page scrolls normally. The
   drawer is revealed by the CSS-only menu checkbox and the
   backdrop dims the page — zero client JavaScript. */
@media ${maxWidth("lg")}{
  .vp-shell{${shareInsetVar}:0px}
  .vp-menu-btn{display:inline-block}
  .vp-mobilebar{display:flex}
  /* the drilled section column duplicates navigation the
     drawer already carries; drop it so the phone shows just
     the content column full-bleed. */
  .vp-section{display:none}
  /* one page per screen: the strip snaps column by
     column, as the apps do on a phone */
  .vp-app{scroll-snap-type:x mandatory}
  .vp-content{
    width:100vw;scroll-snap-align:start;
    scroll-snap-stop:always;
  }
  .vp-content .vp-col-body{
    padding:1.25rem 1.25rem 3rem;
  }
  .vp-doc{max-width:100%}
  .vp-doc pre{max-width:100%}
  .vp-sidebar{
    position:fixed;top:0;left:0;z-index:50;
    height:100dvh;width:17rem;max-width:82vw;
    background:${cvar("surface")};
    border-right:${rule};
    transform:translateX(-100%);
    transition:transform 0.2s ease-out;
  }
  .vp-menu-cb:checked ~ .vp-app .vp-sidebar{
    transform:translateX(0);
  }
  .vp-menu-cb:checked ~ .vp-backdrop{display:block}
}
@media(min-width:1024px) and (max-width:1099px){
 .vp-shell:has(.vp-sheet) .vp-mobilebar{display:flex}
 .vp-shell:has(.vp-sheet) .vp-menu-btn{display:inline-block}
 .vp-app:has(.vp-sheet) :is(.vp-section,.vp-rail){display:none}
 .vp-app:has(.vp-sheet) .vp-sidebar{position:fixed;inset:0 auto 0 0;z-index:50;background:${cvar("surface")};transform:translateX(-100%)}
 .vp-menu-cb:checked ~ .vp-app:has(.vp-sheet) .vp-sidebar{transform:translateX(0)}
 .vp-menu-cb:checked ~ .vp-backdrop{display:block}
}
.vp-sheet{color-scheme:light}
html.dark .vp-sheet{color-scheme:dark}
.vp-drawer-description,.vp-mobile-description{display:none}
@media(max-width:759px),(orientation:landscape) and (max-height:499px){
 .vp-shell:has(.vp-sheet){height:100dvh;box-sizing:border-box;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
 .vp-shell:has(.vp-sheet) .vp-mobilebar{height:48px;flex:none;box-sizing:border-box;padding-inline:0 12px}
 .vp-shell:has(.vp-sheet) .vp-menu-btn{background-size:22px 2px;background-position:12px calc(50% - 6px),12px center,12px calc(50% + 6px)}
 .vp-shell:has(.vp-sheet) .vp-mobilebar :is(label,button){min-width:44px;min-height:44px}
 .vp-sheet .vp-col-head{display:none}
 .vp-shell:has(.vp-sheet) .vp-mobilebar-home{display:block;flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:20px}
 .vp-mobile-description{display:block;font-size:12px;line-height:14px;height:14px;overflow:hidden;white-space:normal;color:${cvar("muted")}}
 .vp-mobile-description span{display:inline-block;width:max-content}
 .vp-mobile-description[data-overflow]{height:0;visibility:hidden}
 .vp-shell:has(.vp-sheet) .${sidebarNavClass.link}{min-height:44px;box-sizing:border-box}
 .vp-drawer-description{display:block;padding:0 1rem}
 .vp-app:has(.vp-sheet){scrollbar-width:none}
}
@media(orientation:landscape) and (max-height:499px){
 .vp-shell:has(.vp-sheet) .vp-mobilebar{height:40px}
}
.vp-doc [data-island]{display:block;margin:1.25rem 0}
::selection{
  background:${cvar("text")};
  color:${cvar("surface")};
}

.vp-content.vp-sheet{flex:1 0 0;min-width:min(28rem,100vw);align-self:stretch}
.vp-sheet .vp-col-head{align-items:baseline;gap:1rem;overflow:hidden}
.vp-description{color:${cvar("muted")};overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.vp-content.vp-sheet .vp-col-body{padding:0;overflow:hidden;min-height:0}
.vp-sheet .vp-main,.vp-sheet-body,.vp-sheet-body div:has([data-fill]){display:flex;flex-direction:column;flex:1;min-height:0}
.vp-sheet .vp-col-body,.vp-sheet-body{display:flex;flex-direction:column}
.vp-sheet-body h1:first-child{display:none}
.vp-sheet-body [data-fill]{flex:1;min-height:0;overflow:hidden}

.vp-sheet .vp-col-title{flex:0 0 auto;max-width:65%}
.vp-sheet .vp-col-head{padding-top:.75rem}
/* pages that share the width need no row naming them: each
   one's own head does, and its close control is there */
.vp-shell:has(.vp-fill) ${selector(trailClass)}{display:none}
@media (prefers-reduced-motion:reduce){
  .vp-sidebar{transition:none}
}
.vp-tagline,.vp-footer-link{padding:.75rem 1.25rem;font-size:.8rem}
.vp-tagline{color:${cvar("muted")};margin:0}
.vp-footer-link{border-top:${rule}}
`;
};
