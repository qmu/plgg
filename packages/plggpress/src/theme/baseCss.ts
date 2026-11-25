import { type SoftStr } from "plgg";
import {
  type Theme,
  themeToggleClass,
  sidebarNavClass,
  sidebarNavCss,
  colClass,
  foldClass,
  trailClass,
  leavingAttr,
  shareInsetVar,
  shareCss,
  shareOptions,
  carouselCss,
  replacingAttr,
  selector,
  colorVar,
  metricVar,
  maxWidth,
  minWidth,
} from "plggpress/themeSupport/styleEntry";

/**
 * The house look is the plgg-flow demo's drawing sheet:
 * ink on paper, Inter with Noto Sans JP, structure drawn
 * with 1px ink hairlines (column edges, head bars, the
 * rule under a title), rows parted by a faint trace line,
 * the current row inverted, nothing rounded, no shadow.
 *
 * The bespoke layout/prose stylesheet for the default
 * theme — the qmu.co.jp sidebar-first app shell: a
 * far-right 48px chrome rail (appearance toggle + social),
 * a `w-64` sidebar with the wordmark home link and an
 * always-expanded nav tree (inverted-pill active/hover),
 * and a left-aligned `max-w-3xl` content column with a
 * centred footer. On lg+ the row fills the viewport and
 * each column scrolls independently; below lg the rail
 * hides, a sticky mobile bar appears, and the sidebar
 * becomes an off-canvas drawer.
 *
 * **What this OWNS after the plggmatic cutover (D3/D16):**
 * layout, prose typography, and the `@media` responsiveness
 * the atomic `style_` utilities cannot express. **What it
 * no longer owns:** the color palette and the geometry are
 * plggmatic tokens (every value is a plggmatic `pm` custom
 * property resolved by plggmatic's `schemeCss` / `metricCss`
 * blocks — the legacy per-theme custom properties are gone,
 * D16 clean cutover); the reduced-motion scroll reset is
 * plggmatic's `reducedMotionCss`; and the appearance
 * toggle's chrome + icon-switch is plggmatic's
 * `themeToggleCss`. `shell` composes those framework blocks
 * ahead of this sheet.
 *
 * Injected INLINE into the document `<style>` (ahead of the
 * body's collected atomic CSS) by {@link shell}, so it stays
 * escape-safe: NO raw `<`, `>`, or `&` — only
 * class/descendant selectors, `@media`, and `var()`
 * references (no child `>` combinators, no `&` nesting) —
 * surviving the SSR `text()` escaper byte-for-byte. The
 * media boundaries are composed from plggmatic's breakpoint
 * constants ({@link maxWidth}/{@link minWidth}), never
 * `pm` custom properties (a `@media` cannot resolve
 * `var()`).
 *
 * Light/dark is driven by the `dark` class on `<html>`, set
 * by plggmatic's no-FOUC `appearanceInitScript` and toggled
 * by every `.${themeToggleClass}` (see appearanceScripts).
 * The mobile drawer stays CSS-only (a hidden
 * `#vp-menu-toggle` checkbox).
 *
 * Parameterized by `theme` (D3, made config-driven): the
 * `colorVar`/`metricVar` token helpers are bound to the
 * theme the site RESOLVED — the monochrome qmu default, or
 * a `SiteConfig` palette override — rather than a hard-bound
 * `defaultTheme`. `shell` passes the resolved theme through.
 */
export const baseCss = (
  theme: Theme,
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
/* plggpress-owned motion: article/chrome link hover fades.
   Killed under reduced-motion here (the framework reset only
   resets its own scroll motion). */
@media (prefers-reduced-motion:reduce){
  .vp a{transition:none}
  .vp-doc a{transition:none}
}
body.vp{
  margin:0;
  font-family:"Inter","Noto Sans JP",system-ui,
    -apple-system,"Segoe UI","Hiragino Sans",
    sans-serif,"Apple Color Emoji","Segoe UI Emoji";
  font-size:15px;line-height:1.75;
  color:${cvar("text")};
  background:${cvar("surface")};
  -webkit-font-smoothing:antialiased;
}
/* Chrome links carry no underline in any state (qmu:
   every hover affordance is the inverted pill; only
   article prose underlines, and only at rest). No generic
   a:hover rule - its (0,2,1) specificity silently beat
   the pill classes' (0,2,0) and re-underlined them. */
.vp a{
  color:${cvar("primary-base")};
  text-decoration:none;
}
.vp-menu-cb{display:none}
/* prose links (qmu .prose a): ink + standing underline at
   rest, weight 500, generous inline padding cancelled by an
   equal negative margin so text never shifts — the padded
   highlighter only paints on hover/focus. The inversion is
   keyboard-reachable (:focus-visible parity) and clones onto
   every line fragment when a wrapped link inverts. */
.vp-doc a{
  color:${cvar("text")};
  text-decoration:underline;
  text-decoration-thickness:1px;
  font-weight:400;
  text-underline-offset:3px;
  padding:0.15em 0.3em;
  margin-inline:-0.3em;
  transition:background-color 0.15s;
}
.vp-doc a:hover{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
}
.vp-doc a:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
}

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
.vp-shell{
  position:relative;display:flex;
  flex-direction:column;height:100dvh;
}
.vp-app{
  flex:1 1 auto;min-height:0;
  display:flex;align-items:stretch;
  overflow-x:auto;overflow-y:hidden;
  overscroll-behavior-x:contain;
  scroll-padding-right:${mvar("rail")};
}
.vp-app ${selector(colClass)}{
  flex:none;display:flex;flex-direction:column;
  min-height:0;overflow:hidden;
  background:${cvar("surface")};
  border-right:1px solid ${cvar("text")};
}
.vp-col-head{
  flex:none;display:flex;align-items:center;
  gap:0.5rem;height:3rem;
  padding:0 0.5rem 0 1.25rem;
  border-bottom:1px solid ${cvar("text")};
  font-size:0.875rem;line-height:1.25rem;
  font-weight:600;color:${cvar("text")};
}
.vp-col-title{
  flex:1 1 auto;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;
}
.vp-col-body{
  flex:1 1 auto;min-height:0;overflow:auto;
  scroll-behavior:smooth;
}
.vp-sidebar{width:${mvar("sidebar")}}
.vp-section{width:15rem}
.vp-content{
  width:min(
    clamp(40rem,45vw,calc(${mvar(
      "measure",
    )} + 4rem)),
    100vw
  );
}
.vp-sidebar .vp-col-body,
.vp-section .vp-col-body{
  padding:0;font-size:0.875rem;
}
.vp-content .vp-col-body{
  padding:2rem 2.5rem 3rem;
}
/* the close control a followed column carries, in its
   head bar; the trail names every open column, above the
   strip */
${selector(foldClass)}{
  flex:none;width:1.75rem;height:1.75rem;
  border:0;background:none;
  color:${cvar("muted")};font:inherit;
  font-size:1.1rem;line-height:1;cursor:pointer;
}
${selector(foldClass)}:hover,
${selector(foldClass)}:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
}
${selector(trailClass)}{
  flex:none;display:flex;align-items:stretch;
  height:2rem;overflow-x:auto;
  border-bottom:1px solid ${cvar("text")};
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
  border-left:1px solid ${cvar("text")};
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
  border-bottom:1px solid ${cvar("text")};
}
.vp-mobilebar-home{
  font-weight:600;font-size:1rem;
  color:${cvar("text")};
  padding:0.1rem 0.4rem;
  transition:background-color 0.15s
    cubic-bezier(0.4,0,0.2,1);
}
.vp-mobilebar-home:hover{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-mobilebar-home:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-mobilebar-home[aria-current]{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
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
.vp-fold-btn{
  display:none;margin-left:auto;flex:none;
  width:1.9rem;height:1.9rem;padding:0;border:0;
  background:none;color:${cvar("text")};cursor:pointer;
  align-items:center;justify-content:center;
  transition:background-color .15s ease,color .15s ease;
}
.vp-fold-btn:hover,.vp-fold-btn:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};outline:0;
}
.vp-fold-icon{
  position:relative;display:block;box-sizing:border-box;
  width:1rem;height:.8rem;border:1.5px solid currentColor;
}
.vp-fold-icon::before{
  content:"";position:absolute;top:0;bottom:0;left:.25rem;
  border-left:1.5px solid currentColor;
}
.vp-sidebar-foot{
  flex:none;margin-top:auto;display:flex;
  align-items:center;gap:.5rem;padding:.6rem 1.25rem;
  border-top:1px solid ${cvar("text")};
}
.vp-foot-social{display:flex;align-items:center}
/* the sections column's head bar holds the wordmark home
   link */
.vp-wordmark{
  display:block;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;
  margin-left:-0.5rem;padding:0.25rem 0.5rem;
  font-size:1rem;letter-spacing:-0.01em;
  line-height:1.25rem;font-weight:600;
  color:${cvar("text")};
  transition:background-color 0.15s
    cubic-bezier(0.4,0,0.2,1);
}
.vp-wordmark:hover{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-wordmark:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-wordmark[aria-current]{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
}
${sidebarNavCss(theme)}
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
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-social:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
/* in the narrow rail the label rides vertically so the
   full name fits the 48px column. */
.vp-rail-social .vp-social-label{
  writing-mode:vertical-rl;letter-spacing:0.02em;
}

.vp-main{display:block}
.vp-doc{max-width:${mvar("measure")};margin:0}
.vp-footer{
  margin-top:2rem;padding:1.25rem 0;
  text-align:center;
}
.vp-footer-text{
  margin:0;font-size:13px;color:${cvar("muted")};
}
/* Heading scale = qmu's calm ~1.25 modular scale on a 1rem
   body (30/24/19/17), all weight 400, no letter-spacing.
   The vertical rhythm is tightened from the original airy
   VitePress spacing (2026-07-14, developer): the H1 carries
   no top margin and a 2rem bottom margin so the air above
   (the column's own 2rem top padding) and below the title
   read the same. */
.vp-doc h1{
  font-size:1.375rem;font-weight:600;
  letter-spacing:-0.01em;
  line-height:1.3;margin:0 0 1rem;
}
/* the sentence under the title is the page's description:
   quieter, as beside the demo's titles */
.vp-doc h1 + p{color:${cvar("muted")}}
.vp-doc h2{
  font-size:1.0625rem;font-weight:600;
  line-height:1.4;margin:2.5rem 0 0.75rem;
}
.vp-doc h3{
  font-size:0.9375rem;font-weight:600;
  line-height:1.5;margin:1.75rem 0 0.5rem;
}
.vp-doc h4{
  font-size:0.875rem;font-weight:600;
  line-height:1.5;color:${cvar("muted")};
  margin:1.25rem 0 0.5rem;
}
/* Anchor jumps clear the sticky bars (mobile bar / lg pane
   header, both 3rem) — qmu scroll-margin-top. */
.vp-doc h1,.vp-doc h2,.vp-doc h3,.vp-doc h4{
  scroll-margin-top:1rem;
}
.vp-doc p{margin:0.85rem 0}
.vp-doc ul,.vp-doc ol{
  padding-left:1.35rem;margin:0.85rem 0;
}
.vp-doc li{margin:0.35rem 0}
.vp-doc strong{
  font-weight:600;color:${cvar("text")};
}
.vp-doc blockquote{
  margin:1rem 0;padding:0.1rem 1rem;
  border-left:1px solid ${cvar("text")};
  color:${cvar("muted")};
}
.vp-doc hr{
  border:none;
  border-top:1px solid ${cvar("border")};
  margin:1.5rem 0;
}
.vp-doc img{max-width:100%}
/* a HIGHLIGHTED passage: the span a composition URL asked
   for, located in the document's own text exactly once (an
   unlocatable quotation is refused and paints nothing, so
   this rule can only ever wrap the document's own words).
   An inverted-pill fill, the same affordance the chrome
   uses, so the mark reads as this site's own emphasis
   rather than a browser default yellow. */
.vp-doc mark{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  padding:0.1em 0.25em;
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
  scroll-margin-top:1rem;
}

/* code — inline code is qmu's soft translucent badge: an
   overlay fill/border (adapts to whatever surface it sits
   on) that darkens on hover; the badge itself carries the
   "this is code" signal. The overlay alphas are a
   surface-independent choice, deliberately NOT tokens. */
.vp-doc code{
  font-family:"SF Mono",Menlo,Consolas,
    "Liberation Mono",monospace;
  font-size:0.86em;font-weight:400;
  color:${cvar("text")};
  background:${cvar("surface-2")};
  border:1px solid transparent;
  padding:0.1em 0.35em;
}
/* a LINK wrapping an inline-code badge: when the link's
   hover/focus inversion paints, the badge must flip to the
   hover ink too - otherwise brand-colored code text lands
   on the near-identical inverted fill and vanishes (the
   guide links package names as code constantly). */
.vp-doc a:hover code{
  color:${cvar("surface")};
  background:none;
  border-color:transparent;
}
.vp-doc a:focus-visible code{
  color:${cvar("surface")};
  background:none;
  border-color:transparent;
}
html.dark .vp-doc a:hover code{
  color:${cvar("surface")};
  background:none;
  border-color:transparent;
}
html.dark .vp-doc a:focus-visible code{
  color:${cvar("surface")};
  background:none;
  border-color:transparent;
}
.vp-doc pre{
  background:${cvar("surface")};
  border:1px solid ${cvar("text")};
  padding:0.875rem 1rem;
  overflow-x:auto;margin:1.1rem 0;
  font-size:0.8125rem;line-height:1.65;
}
.vp-doc pre code{
  background:none;padding:0;
  border:none;font-size:inherit;
  color:inherit;
}
/* syntax-highlight hues (plgg-highlight's span classes) are
   framework-owned now: themeSupport's syntaxCss emits the
   framework code-token properties + the class rules per
   scheme
   (ticket 08 finishes the D16 cutover for code blocks). No
   syntax colors live here anymore. */

/* tables */
.vp-doc table{
  border-collapse:collapse;margin:1.25rem 0;
  display:block;overflow-x:auto;font-size:0.92rem;
}
.vp-doc th,.vp-doc td{
  border-bottom:1px solid ${cvar("border")};
  padding:0.5rem 1.25rem 0.5rem 0;text-align:left;
}
.vp-doc th{
  border-bottom-color:${cvar("text")};
  font-weight:600;
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
  .vp-shell:has(.vp-fill){${shareInsetVar}:${mvar("sidebar")}}
  html.vp-side-min .vp-shell:has(.vp-fill){${shareInsetVar}:3rem}
  .vp-sidebar{transition:width .2s ease}
  html.vp-side-min .vp-sidebar{width:3rem}
  html.vp-side-min .vp-sidebar .vp-wordmark,
  html.vp-side-min .vp-sidebar .vp-col-body,
  html.vp-side-min .vp-sidebar .vp-tagline,
  html.vp-side-min .vp-sidebar .vp-footer-link,
  html.vp-side-min .vp-sidebar .vp-foot-social{display:none}
  html.vp-side-min .vp-sidebar .vp-col-head{
    padding:0;justify-content:center;
  }
  html.vp-side-min .vp-fold-btn{margin:0}
  html.vp-side-min .vp-sidebar-foot{
    padding:.6rem 0;justify-content:center;
  }
}

/* below lg: no rail; a sticky mobile bar + an off-canvas
   drawer (the sidebar), the page scrolls normally. The
   drawer is revealed by the CSS-only menu checkbox and the
   backdrop dims the page — zero client JavaScript. */
@media ${maxWidth("lg")}{
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
    border-right:1px solid ${cvar("text")};
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
/* fill: the open pages share the width right of the
   sidebar; text keeps a reading measure inside it, figures
   and code take the room */
${shareCss(theme)(shareOptions)}
${carouselCss(theme)}
/* the sidebar stays where it is while the pages beside it
   scroll: with pages sharing the width it is the one fixed
   thing, and a new page comes to rest clear of it */
.vp-app:has(.vp-fill) .vp-sidebar{
  position:sticky;left:0;z-index:3;
}
/* the width the pinned sidebar takes from the room: what
   the columns divide, where a stepped column comes to rest
   and where the previous-column control stands. Below lg
   the sidebar is a drawer and takes nothing. */
.vp-shell{${shareInsetVar}:0px}
.vp-app:has(.vp-fill){
  scroll-padding-left:var(${shareInsetVar});
}
/* pages that share the width need no row naming them: each
   one's own head does, and its close control is there */
.vp-shell:has(.vp-fill) ${selector(trailClass)}{display:none}
/* a followed page eases in from nothing while the page it
   came from gives up the room; a closed one eases out */
@keyframes vp-col-in{
  from{flex-grow:0;flex-basis:0;opacity:0}
}
@keyframes vp-col-out{
  to{flex-grow:0;flex-basis:0;opacity:0;border-right-width:0}
}
.vp-content.vp-fill ~ .vp-content.vp-fill{
  animation:vp-col-in .34s cubic-bezier(.2,.7,.2,1);
}
/* a page opened in place of another: the room is already
   there, so only the page itself fades in */
@keyframes vp-col-swap{from{opacity:0}}
.vp-app .vp-content.vp-fill.vp-fill[${replacingAttr}]{
  animation:vp-col-swap .18s ease-out;
}
.vp-app .vp-content.vp-fill.vp-fill[${leavingAttr}]{
  animation:vp-col-out .26s cubic-bezier(.4,0,.6,1) forwards;
  pointer-events:none;
}
.vp-fill .vp-doc{max-width:none}
.vp-fill .vp-doc :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,dl){
  max-width:${mvar("measure")};
}
@media (prefers-reduced-motion:reduce){
  .vp-sidebar,.vp-fold-btn{transition:none}
  .vp-content.vp-fill ~ .vp-content.vp-fill,
  .vp-app .vp-content.vp-fill.vp-fill[${replacingAttr}],
  .vp-app .vp-content.vp-fill.vp-fill[${leavingAttr}]{animation:none}
}
.vp-tagline,.vp-footer-link{padding:.75rem 1.25rem;font-size:.8rem}
.vp-tagline{color:${cvar("muted")};margin:0}
.vp-footer-link{border-top:1px solid ${cvar("text")}}
`;
};
