import { type SoftStr } from "plgg";

/**
 * The static, hand-authored base stylesheet for the
 * default theme — the qmu.co.jp sidebar-first app shell
 * with a monochrome light/dark palette (custom properties
 * redefined under `html.dark`): a far-left 48px chrome
 * rail (appearance toggle + social), a `w-64` sidebar with
 * the wordmark home link and an always-expanded nav tree
 * (inverted-pill active/hover), and a left-aligned
 * `max-w-3xl` content column with a centred footer. On lg+
 * the row fills the viewport and each column scrolls
 * independently; below lg the rail hides, a sticky mobile
 * bar appears, and the sidebar becomes an off-canvas
 * drawer. It OWNS layout, typography, and responsiveness
 * (the `@media` the atomic `style_` utilities cannot
 * express) and is injected INLINE into the document
 * `<style>` (ahead of the body's collected atomic CSS) by
 * {@link shell}, so it stays escape-safe: NO raw `<`, `>`,
 * or `&` — only class/descendant selectors, `@media`, and
 * custom properties (no child `>` combinators, no `&`
 * nesting) — surviving the SSR `text()` escaper
 * byte-for-byte.
 *
 * Light/dark is driven by the `dark` class on `<html>`,
 * set by the no-FOUC head script and toggled by every
 * `.vp-theme-toggle` (see themeScript). The mobile drawer
 * stays CSS-only (a hidden `#vp-menu-toggle` checkbox).
 */
export const baseCss: SoftStr = `
:root{
  --vp-brand:#111111;
  --vp-brand-2:#000000;
  --vp-bg:#ffffff;
  --vp-bg-alt:#f6f6f7;
  --vp-surface:#ffffff;
  --vp-text:#1f1f22;
  --vp-text-2:#5b5b61;
  --vp-muted:#5b5b61;
  --vp-border:#ededee;
  --vp-divider:#ededee;
  --vp-code-bg:#f6f6f7;
  --vp-inline:#f6f6f7;
  --vp-hover:#111111;
  --vp-hover-ink:#ffffff;
  --vp-shadow:none;
  --vp-rail-w:48px;
  --vp-sidebar-w:256px;
  --vp-shell-max:1440px;
}
html.dark{
  --vp-brand:#f5f5f7;
  --vp-brand-2:#ffffff;
  --vp-bg:#1b1b1f;
  --vp-bg-alt:#202127;
  --vp-surface:#202127;
  --vp-text:#e6e6e9;
  --vp-text-2:#a0a0a8;
  --vp-muted:#a0a0a8;
  --vp-border:#2e2e34;
  --vp-divider:#2a2a30;
  --vp-code-bg:#202127;
  --vp-inline:#202127;
  --vp-hover:#ffffff;
  --vp-hover-ink:#1b1b1f;
  --vp-shadow:none;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body.vp{
  margin:0;
  font-family:"Inter",-apple-system,
    BlinkMacSystemFont,"Segoe UI",Roboto,
    "Helvetica Neue",Arial,sans-serif;
  font-size:16px;line-height:1.65;
  color:var(--vp-text);background:var(--vp-bg);
  -webkit-font-smoothing:antialiased;
  transition:background-color 0.25s,color 0.25s;
}
.vp a{
  color:var(--vp-brand);text-decoration:none;
  transition:color 0.25s;
}
.vp a:hover{text-decoration:underline}
.vp-menu-cb{display:none}
/* prose links: ink + underline at rest, hover inverts to
   the near-black highlighter with light text (qmu's
   box-highlight, re-expressed without child combinators).
   The small inset padding + equal negative margin keeps
   surrounding text from shifting when the block paints. */
.vp-doc a{
  color:var(--vp-text);
  text-decoration:underline;
  text-decoration-thickness:1px;
  text-underline-offset:2px;
  padding:0.05em 0.15em;
  margin:0 -0.15em;
  border-radius:3px;
  transition:background-color 0.2s,color 0.2s;
}
.vp-doc a:hover{
  background:var(--vp-hover);
  color:var(--vp-hover-ink);
  text-decoration:none;
}

/* app shell: a max-1440 row centred in the viewport. On
   lg+ it fills the screen and does not page-scroll (each
   column scrolls on its own); below lg it collapses to
   normal page flow with a sticky mobile bar + off-canvas
   drawer. */
.vp-shell{position:relative}
.vp-app{
  display:flex;align-items:flex-start;
  max-width:var(--vp-shell-max);margin:0 auto;
  padding:0 1rem;
}
/* far-left chrome rail (lg+ only): appearance toggle +
   social links pinned to the bottom by a flex spacer.
   Carries no navigation. */
.vp-rail{
  display:none;flex:0 0 var(--vp-rail-w);
  width:var(--vp-rail-w);height:100vh;
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
  background:var(--vp-bg);
  border-bottom:1px solid var(--vp-divider);
}
.vp-mobilebar-home{
  font-weight:500;font-size:1.05rem;
  color:var(--vp-text);
  padding:0.1rem 0.4rem;border-radius:6px;
}
.vp-mobilebar-home[aria-current]{
  background:var(--vp-hover);color:var(--vp-hover-ink);
}
.vp-mobilebar .vp-theme-toggle{margin-left:auto}
/* dimmed backdrop behind an open mobile drawer */
.vp-backdrop{
  display:none;position:fixed;inset:0;z-index:40;
  background:rgba(0,0,0,0.4);
}

/* appearance toggle (shared by the chrome rail + mobile bar) */
.vp-theme-toggle{
  display:inline-flex;align-items:center;
  justify-content:center;width:38px;height:38px;
  border-radius:50%;border:1px solid var(--vp-border);
  background:var(--vp-bg-alt);cursor:pointer;
  color:var(--vp-text);padding:0;
  transition:background-color 0.25s,
    border-color 0.25s,transform 0.15s;
}
.vp-theme-toggle:hover{
  border-color:var(--vp-brand);transform:scale(1.06);
}
/* CSS-drawn sun: a disc with four rays */
.vp-sun{
  position:relative;display:inline-block;
  width:8px;height:8px;border-radius:50%;
  background:currentColor;
}
.vp-sun::before,.vp-sun::after{
  content:"";position:absolute;
  background:currentColor;
}
.vp-sun::before{
  left:50%;top:-5px;margin-left:-1px;
  width:2px;height:18px;
}
.vp-sun::after{
  top:50%;left:-5px;margin-top:-1px;
  height:2px;width:18px;
}
/* CSS-drawn crescent moon */
.vp-moon{
  display:inline-block;width:15px;height:15px;
  border-radius:50%;
  box-shadow:inset -4px -2px 0 0 currentColor;
}
.vp-theme-toggle .vp-moon{display:none}
html.dark .vp-theme-toggle .vp-sun{display:none}
html.dark .vp-theme-toggle .vp-moon{
  display:inline-block;
}
/* CSS-drawn 3-bar hamburger (no glyph font) */
.vp-menu-btn{
  display:none;width:22px;height:16px;
  cursor:pointer;color:var(--vp-text);
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
  flex:0 0 var(--vp-sidebar-w);
  width:var(--vp-sidebar-w);
  padding:1.75rem 1rem 2.5rem;
  font-size:0.9rem;
}
.vp-wordmark{
  display:block;width:fit-content;
  margin:0 0 1.25rem;padding:0.1rem 0.5rem;
  border-radius:6px;font-size:1.05rem;
  font-weight:500;color:var(--vp-text);
  transition:background-color 0.2s,color 0.2s;
}
.vp-wordmark:hover{
  background:var(--vp-hover);color:var(--vp-hover-ink);
  text-decoration:none;
}
.vp-wordmark[aria-current]{
  background:var(--vp-hover);color:var(--vp-hover-ink);
}
.vp-sidebar-nav{display:block}
/* top-level section header — always visible, no collapse */
.vp-group{margin-top:1rem}
.vp-group:first-child{margin-top:0.25rem}
.vp-group-title{
  padding:0.25rem 0.5rem;font-size:0.86rem;
  font-weight:600;color:var(--vp-text);
}
/* leaves + subgroup headers: an inverted pill on hover;
   the active leaf wears the same pill permanently (both
   tokens flip under dark). Active and inactive share one
   box so the current page never reflows its neighbours. */
.vp-sidebar-link{
  display:block;width:fit-content;
  padding:0.2rem 0.5rem;border-radius:6px;
  font-size:0.875rem;color:var(--vp-text-2);
  transition:background-color 0.2s,color 0.2s;
}
.vp-sidebar-link:hover{
  background:var(--vp-hover);color:var(--vp-hover-ink);
  text-decoration:none;
}
.vp-sidebar-link[aria-current]{
  background:var(--vp-hover);color:var(--vp-hover-ink);
  font-weight:500;
}
.vp-sidebar-flat{
  display:block;padding:0.2rem 0.5rem;
  font-size:0.875rem;color:var(--vp-muted);
}
/* a nested group: its header, then its children indented,
   always shown (no disclosure). */
.vp-subgroup{margin:0.1rem 0}
.vp-subgroup-title{
  padding:0.2rem 0.5rem;font-size:0.875rem;
  font-weight:500;color:var(--vp-text);
}
.vp-subgroup .vp-sidebar-link,
.vp-subgroup .vp-sidebar-flat,
.vp-subgroup .vp-subgroup-title{
  margin-left:0.75rem;
}
/* social links: shown in the sidebar only below lg (the
   rail carries them on lg+). */
.vp-sidebar-social{
  display:none;margin-top:1.5rem;
  padding-top:1rem;
  border-top:1px solid var(--vp-divider);
}
.vp-social{
  display:inline-flex;align-items:center;
  padding:0.25rem 0.4rem;border-radius:6px;
  font-size:0.8rem;color:var(--vp-muted);
  transition:background-color 0.2s,color 0.2s;
}
.vp-social:hover{
  background:var(--vp-hover);color:var(--vp-hover-ink);
  text-decoration:none;
}
/* in the narrow rail the label rides vertically so the
   full name fits the 48px column. */
.vp-rail-social .vp-social-label{
  writing-mode:vertical-rl;letter-spacing:0.02em;
}

/* content column: independent-scroll on lg+, LEFT-aligned
   prose capped at max-w-3xl, with the footer confined to
   this column. */
.vp-content{
  flex:1 1 auto;min-width:0;
  padding:2.25rem 3rem 3rem;
}
.vp-doc{max-width:48rem;margin:0}
.vp-footer{
  margin-top:3rem;padding:1.5rem 0;
  text-align:center;
}
.vp-footer-text{
  margin:0;font-size:0.8rem;color:var(--vp-muted);
}
.vp-doc h1{
  font-size:1.875rem;font-weight:400;
  line-height:1.25;margin:0 0 1.25rem;
  letter-spacing:-0.011em;
}
.vp-doc h2{
  font-size:1.5rem;font-weight:400;
  margin:2.85rem 0 1.1rem;
  letter-spacing:-0.006em;
}
.vp-doc h3{
  font-size:1.1875rem;font-weight:400;
  margin:2rem 0 0.75rem;
}
.vp-doc h4{font-size:1.03rem;margin:1.5rem 0 0.5rem}
.vp-doc p{margin:1rem 0}
.vp-doc ul,.vp-doc ol{
  padding-left:1.35rem;margin:1rem 0;
}
.vp-doc li{margin:0.45rem 0}
.vp-doc strong{font-weight:400;color:var(--vp-text)}
.vp-doc blockquote{
  margin:1rem 0;padding:0.25rem 1rem;
  border-left:3px solid var(--vp-border);
  color:var(--vp-muted);
}
.vp-doc hr{
  border:none;
  border-top:1px solid var(--vp-divider);
  margin:2rem 0;
}
.vp-doc img{max-width:100%}

/* code */
.vp-doc code{
  font-family:"SF Mono",Menlo,Consolas,
    "Liberation Mono",monospace;
  font-size:0.85em;background:var(--vp-inline);
  border:1px solid var(--vp-border);
  padding:0.15em 0.4em;border-radius:4px;
  transition:background-color 0.25s,
    border-color 0.25s;
}
.vp-doc pre{
  background:var(--vp-code-bg);
  border:1px solid var(--vp-border);
  padding:1.1rem 1.25rem;border-radius:10px;
  overflow-x:auto;margin:1.1rem 0;
  font-size:0.86rem;line-height:1.6;
  transition:background-color 0.25s,
    border-color 0.25s;
}
.vp-doc pre code{
  background:none;padding:0;border-radius:0;
  border:none;font-size:inherit;
}
/* syntax tokens (tok-* classes from plgg-highlight) —
   themed here so they adapt to light/dark; identifier
   and plain inherit the default code text colour */
.vp-doc .tok-keyword{color:#cf222e}
.vp-doc .tok-string{color:#0a3069}
.vp-doc .tok-number{color:#0550ae}
.vp-doc .tok-comment{color:#6e7781;font-style:italic}
.vp-doc .tok-regex{color:#116329}
.vp-doc .tok-template{color:#0a3069}
.vp-doc .tok-punctuation{color:#57606a}
html.dark .vp-doc .tok-keyword{color:#ff7b72}
html.dark .vp-doc .tok-string{color:#a5d6ff}
html.dark .vp-doc .tok-number{color:#79c0ff}
html.dark .vp-doc .tok-comment{color:#8b949e}
html.dark .vp-doc .tok-regex{color:#7ee787}
html.dark .vp-doc .tok-template{color:#a5d6ff}
html.dark .vp-doc .tok-punctuation{color:#c9d1d9}

/* tables */
.vp-doc table{
  border-collapse:collapse;margin:1.25rem 0;
  display:block;overflow-x:auto;font-size:0.92rem;
}
.vp-doc th,.vp-doc td{
  border:1px solid var(--vp-border);
  padding:0.5rem 0.85rem;text-align:left;
}
.vp-doc th{background:var(--vp-bg-alt);font-weight:600}

/* callouts */
.vp-callout{
  margin:1.25rem 0;padding:0.75rem 1rem;
  border-radius:8px;border:1px solid transparent;
  border-left-width:4px;
}
.vp-callout-title{font-weight:650;margin:0 0 0.35rem}
.vp-callout p{margin:0.35rem 0}
/* info/note: monochrome — ink border on the soft
   surface, ink title (both driven by tokens so dark
   flips with the rest of the palette). */
.vp-callout-info,.vp-callout-note{
  background:var(--vp-bg-alt);
  border-color:var(--vp-brand);
}
.vp-callout-info .vp-callout-title,
.vp-callout-note .vp-callout-title{color:var(--vp-text)}
/* tip: the one sanctioned hue — emerald, deep enough for
   AA on the light surface, brightened under dark. */
.vp-callout-tip{
  background:var(--vp-bg-alt);
  border-color:#10b981;
}
.vp-callout-tip .vp-callout-title{color:#047857}
html.dark .vp-callout-tip .vp-callout-title{color:#34d399}
.vp-callout-warning{
  background:var(--vp-bg-alt);border-color:#e0a106;
}
.vp-callout-warning .vp-callout-title{color:#c98a06}
.vp-callout-danger{
  background:var(--vp-bg-alt);border-color:#d05656;
}
.vp-callout-danger .vp-callout-title{color:#cf5c5c}

/* home: LEFT-aligned hero (weight-400 name + muted
   tagline, NO call-to-action) and a FLAT feature grid
   (bg-bg-soft, rounded, no border/hover-lift). */
.vp-home{max-width:64rem;margin:0;
  padding:1rem 0 3rem}
.vp-hero-wrap{display:block}
.vp-hero{text-align:left;padding:2rem 0 1.5rem}
.vp-hero-title{
  font-size:clamp(1.9rem,4vw,2.6rem);
  font-weight:400;line-height:1.15;
  margin:0 0 1rem;color:var(--vp-text);
  letter-spacing:-0.015em;
}
.vp-hero-tagline{
  font-size:clamp(1rem,2vw,1.2rem);
  color:var(--vp-muted);
  max-width:42rem;margin:0;line-height:1.55;
}
.vp-features{
  display:grid;
  grid-template-columns:repeat(
    auto-fit,minmax(240px,1fr));
  gap:1rem;margin-top:2.5rem;
}
.vp-feature{
  border-radius:10px;padding:1.25rem;
  background:var(--vp-bg-alt);
}
.vp-feature-title{
  margin:0 0 0.4rem;font-size:1.02rem;
  font-weight:500;color:var(--vp-text);
}
.vp-feature-text{
  margin:0;color:var(--vp-muted);
  font-size:0.92rem;line-height:1.5;
}

/* 404 */
.vp-notfound{max-width:36rem;margin:0;padding:3rem 0}
.vp-notfound h1{
  font-size:1.875rem;font-weight:400;
  margin:0 0 1rem;color:var(--vp-text);
}
.vp-notfound p{
  margin:0 0 1.5rem;color:var(--vp-muted);
}
.vp-notfound a{
  color:var(--vp-text);text-decoration:underline;
  text-underline-offset:2px;
}

/* lg+ (min-width 1024px): the app shell is ON — the row fills the
   viewport and does not page-scroll; the rail, sidebar,
   and content each scroll independently. lg:pl-0 drops the
   left gutter so the rail sits flush to the column start. */
@media (min-width:1024px){
  .vp-app{
    height:100vh;overflow:hidden;padding-left:0;
  }
  .vp-rail{display:flex}
  .vp-sidebar{height:100vh;overflow-y:auto}
  .vp-content{height:100vh;overflow-y:auto}
}

/* below lg: no rail; a sticky mobile bar + an off-canvas
   drawer (the sidebar), the page scrolls normally. The
   drawer is revealed by the CSS-only menu checkbox and the
   backdrop dims the page — zero client JavaScript. */
@media (max-width:1023px){
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
    background:var(--vp-surface);
    border-right:1px solid var(--vp-divider);
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
