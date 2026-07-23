import { type SoftStr } from "plgg";
import {
  themeToggleClass,
  colorVar,
  metricVar,
  maxWidth,
  minWidth,
  defaultTheme,
} from "plggpress/themeSupport/styleEntry";

// plggpress's docs-site look is an explicit theme choice
// (D3): it passes `defaultTheme` — the monochrome `--pm-*`
// design language — to the parameterized token helpers at
// this composition root, binding them once for the whole
// stylesheet. Swapping this for a branded theme is where a
// future divergence would live; plggpress never imports
// plggmatic.
const cvar = colorVar(defaultTheme);
const mvar = metricVar(defaultTheme);

/**
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
 */
export const baseCss: SoftStr = `
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
  font-family:"Inter",ui-sans-serif,system-ui,
    -apple-system,"Segoe UI",sans-serif,
    "Apple Color Emoji","Segoe UI Emoji";
  font-size:16px;line-height:1.7;
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
  text-underline-offset:2px;
  font-weight:500;
  padding:0.15em 0.4em;
  margin-inline:-0.4em;
  border-radius:0.3em;
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

/* app shell: a max-1440 row centred in the viewport. On
   lg+ it fills the screen and does not page-scroll (each
   column scrolls on its own); below lg it collapses to
   normal page flow with a sticky mobile bar + off-canvas
   drawer. */
.vp-shell{position:relative}
.vp-app{
  display:flex;align-items:flex-start;
  max-width:${mvar("shell-max")};margin:0 auto;
  padding:0 1rem;
}
/* far-RIGHT chrome rail (lg+ only, qmu DocsLayout):
   appearance toggle + social links pinned to the bottom
   by a flex spacer. Carries no navigation. */
.vp-rail{
  display:none;flex:0 0 ${mvar("rail")};
  width:${mvar("rail")};height:100vh;
  flex-direction:column;align-items:center;
  padding:0 0 0.75rem;
}
.vp-rail-spacer{flex:1 1 auto}
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
  border-bottom:1px solid ${cvar("border")};
}
.vp-mobilebar-home{
  font-weight:500;font-size:1.05rem;
  color:${cvar("text")};
  padding:0.1rem 0.4rem;border-radius:6px;
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
.vp-mobilebar .${themeToggleClass}{margin-left:auto}
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

/* sidebar column (the nav): a permanent independent-scroll
   column on lg+, an off-canvas drawer below lg. Holds the
   wordmark home link, the always-expanded tree, and (below
   lg) the social links the rail carries on lg+. */
.vp-sidebar{
  flex:0 0 ${mvar("sidebar")};
  width:${mvar("sidebar")};
  padding:2rem 1rem;
  font-size:0.9rem;
}
.vp-wordmark{
  display:block;width:fit-content;
  margin:0 0 1rem;padding:0.25rem 0.5rem;
  border-radius:6px;font-size:1rem;
  line-height:1.5rem;
  font-weight:500;color:${cvar("text")};
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
.vp-sidebar-nav{display:block}
/* top-level section header — always visible, no collapse */
.vp-group{margin-top:1rem}
.vp-group:first-child{margin-top:0.25rem}
.vp-group-title{
  padding:0.25rem 0.5rem;font-size:0.875rem;
  line-height:1.25rem;
  font-weight:600;color:${cvar("text")};
}
/* leaves + subgroup headers: an inverted pill on hover;
   the active leaf wears the same pill permanently (both
   tokens flip under dark). Active and inactive share one
   box so the current page never reflows its neighbours. */
/* qmu's text-sm pins the leading at 1.25rem (20px) and
   gap-px separates items - a 29px pitch, tighter than the
   prose leading these would otherwise inherit. */
.vp-sidebar-link{
  display:block;width:fit-content;
  margin-top:1px;
  padding:0.25rem 0.5rem;border-radius:4px;
  font-size:0.875rem;line-height:1.25rem;
  color:${cvar("text")};
  transition:background-color 0.15s
    cubic-bezier(0.4,0,0.2,1);
}
.vp-sidebar-link:hover{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-sidebar-link:focus-visible{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  text-decoration:none;
}
.vp-sidebar-link[aria-current]{
  background:${cvar("primary-base")};
  color:${cvar("surface")};
  font-weight:500;
}
.vp-sidebar-flat{
  display:block;margin-top:1px;
  padding:0.25rem 0.5rem;
  font-size:0.875rem;line-height:1.25rem;
  color:${cvar("muted")};
}
/* a nested group: its header, then its children, always
   shown (no disclosure). qmu keeps the whole tree flush
   left — hierarchy reads from weight and spacing alone,
   never indentation (SidebarTree.tsx has no pl-/ml-). */
.vp-subgroup{margin:0.1rem 0}
.vp-subgroup-title{
  padding:0.25rem 0.5rem;font-size:0.875rem;
  line-height:1.25rem;
  font-weight:500;color:${cvar("text")};
}
/* social links: shown in the sidebar only below lg (the
   rail carries them on lg+). */
.vp-sidebar-social{
  display:none;margin-top:1.5rem;
  padding-top:1rem;
  border-top:1px solid ${cvar("border")};
}
.vp-social{
  display:inline-flex;align-items:center;
  padding:0.25rem 0.4rem;border-radius:6px;
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

/* content column: independent-scroll on lg+, LEFT-aligned
   prose capped at the prose measure, with the footer
   confined to this column. */
.vp-content{
  flex:1 1 auto;min-width:0;
  padding:2rem 2.5rem 2.5rem;
}
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
  font-size:1.875rem;font-weight:400;
  line-height:1.25;margin:0 0 2rem;
}
.vp-doc h2{
  font-size:1.5rem;font-weight:400;
  line-height:1.3;margin:2.1rem 0 0.9rem;
}
.vp-doc h3{
  font-size:1.1875rem;font-weight:400;
  line-height:1.45;margin:1.6rem 0 0.6rem;
}
.vp-doc h4{
  font-size:1.0625rem;line-height:1.5;
  margin:1.25rem 0 0.5rem;
}
/* Anchor jumps clear the sticky bars (mobile bar / lg pane
   header, both 3rem) — qmu scroll-margin-top. */
.vp-doc h1,.vp-doc h2,.vp-doc h3,.vp-doc h4{
  scroll-margin-top:3.75rem;
}
.vp-doc p{margin:0.85rem 0}
.vp-doc ul,.vp-doc ol{
  padding-left:1.35rem;margin:0.85rem 0;
}
.vp-doc li{margin:0.35rem 0}
.vp-doc strong{
  font-weight:400;color:${cvar("text")};
}
.vp-doc blockquote{
  margin:1rem 0;padding:0.25rem 1rem;
  border-left:3px solid ${cvar("border")};
  color:${cvar("muted")};
}
.vp-doc hr{
  border:none;
  border-top:1px solid ${cvar("border")};
  margin:1.5rem 0;
}
.vp-doc img{max-width:100%}

/* code — inline code is qmu's soft translucent badge: an
   overlay fill/border (adapts to whatever surface it sits
   on) that darkens on hover; the badge itself carries the
   "this is code" signal. The overlay alphas are a
   surface-independent choice, deliberately NOT tokens. */
.vp-doc code{
  font-family:"SF Mono",Menlo,Consolas,
    "Liberation Mono",monospace;
  font-size:0.8em;font-weight:400;
  color:${cvar("primary-base")};
  background:rgba(0,0,0,0.08);
  border:1px solid rgba(0,0,0,0.15);
  padding:0.1em 0.4em;border-radius:0.2rem;
  transition:background-color 0.15s;
}
.vp-doc code:hover{
  background:rgba(0,0,0,0.16);
}
html.dark .vp-doc code{
  background:rgba(255,255,255,0.13);
  border-color:rgba(255,255,255,0.18);
}
html.dark .vp-doc code:hover{
  background:rgba(255,255,255,0.24);
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
  background:${cvar("surface-2")};
  border:1px solid ${cvar("border")};
  padding:1.1rem 1.25rem;border-radius:10px;
  overflow-x:auto;margin:1.1rem 0;
  font-size:0.86rem;line-height:1.6;
}
.vp-doc pre code{
  background:none;padding:0;border-radius:0;
  border:none;font-size:inherit;
  color:inherit;
}
html.dark .vp-doc pre code{background:none}
/* syntax-highlight hues (plgg-highlight's span classes) are
   framework-owned now: themeSupport's syntaxCss emits the
   --pm-code-* properties + the class rules per scheme
   (ticket 08 finishes the D16 cutover for code blocks). No
   syntax colors live here anymore. */

/* tables */
.vp-doc table{
  border-collapse:collapse;margin:1.25rem 0;
  display:block;overflow-x:auto;font-size:0.92rem;
}
.vp-doc th,.vp-doc td{
  border:1px solid ${cvar("border")};
  padding:0.5rem 0.85rem;text-align:left;
}
.vp-doc th{
  background:${cvar("surface-2")};font-weight:600;
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
  border-radius:6px;border:1px solid transparent;
  border-left-width:4px;
  font-size:0.875rem;line-height:1.625;
}
.vp-callout-title{font-weight:600;margin:0 0 0.35rem}
.vp-callout p{margin:0.35rem 0}
.vp-callout-info,.vp-callout-note{
  background:${cvar("surface-2")};
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
  .vp-doc h1{font-size:1.75rem;line-height:1.25}
  .vp-doc h2{font-size:1.375rem;line-height:1.3}
  .vp-doc h3{font-size:1.125rem}
}

/* lg+ (min-width 1024px): the app shell is ON — the row fills the
   viewport and does not page-scroll; the sidebar, content,
   and rail each scroll independently. The right gutter is
   dropped so the far-right rail sits flush to the edge. */
@media ${minWidth("lg")}{
  .vp-app{
    height:100vh;overflow:hidden;padding-right:0;
  }
  .vp-rail{display:flex}
  .vp-sidebar{height:100vh;overflow-y:auto}
  .vp-content{height:100vh;overflow-y:auto}
}

/* below lg: no rail; a sticky mobile bar + an off-canvas
   drawer (the sidebar), the page scrolls normally. The
   drawer is revealed by the CSS-only menu checkbox and the
   backdrop dims the page — zero client JavaScript. */
@media ${maxWidth("lg")}{
  .vp-menu-btn{display:inline-block}
  .vp-mobilebar{display:flex}
  .vp-content{
    min-width:0;padding:1.5rem 1.25rem 3rem;
  }
  .vp-doc{max-width:100%}
  .vp-doc pre{max-width:100%}
  .vp-sidebar{
    position:fixed;top:0;left:0;z-index:50;
    height:100vh;width:17rem;max-width:82vw;
    overflow-y:auto;
    background:${cvar("surface-2")};
    border-right:1px solid ${cvar("border")};
    transform:translateX(-100%);
    transition:transform 0.2s ease-out;
  }
  .vp-menu-cb:checked ~ .vp-app .vp-sidebar{
    transform:translateX(0);
  }
  .vp-menu-cb:checked ~ .vp-backdrop{display:block}
  .vp-sidebar-social{display:block}
}
`;
