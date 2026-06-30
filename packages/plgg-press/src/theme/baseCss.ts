import { type SoftStr } from "plgg";

/**
 * The static, hand-authored base stylesheet for the
 * default theme — a VitePress-like theme with a
 * light/dark palette (custom properties redefined under
 * `html.dark`), a right-aligned header with an
 * appearance toggle, a collapse-caret sidebar, and
 * micro-interaction transitions. It OWNS layout,
 * typography, and responsiveness (the `@media` the
 * atomic `style_` utilities cannot express) and is
 * injected INLINE into the document `<style>` (ahead of
 * the body's collected atomic CSS) by {@link shell}, so
 * it stays escape-safe: NO raw `<`, `>`, or `&` — only
 * class/descendant selectors, `@media`, and custom
 * properties (no child `>` combinators, no `&` nesting)
 * — surviving the SSR `text()` escaper byte-for-byte.
 *
 * Light/dark is driven by the `dark` class on
 * `<html>`, set by the no-FOUC head script and toggled
 * by the header `.vp-theme-toggle` (see themeScript).
 * The mobile sidebar collapse stays CSS-only (a hidden
 * `#vp-menu-toggle` checkbox).
 */
export const baseCss: SoftStr = `
:root{
  --vp-brand:#2e8b57;
  --vp-brand-2:#236b43;
  --vp-bg:#ffffff;
  --vp-bg-alt:#f6f7f9;
  --vp-surface:#ffffff;
  --vp-text:#2c3e50;
  --vp-text-2:#5c6b7a;
  --vp-muted:#7b8694;
  --vp-border:#e4e7ec;
  --vp-divider:#eceff3;
  --vp-code-bg:#f6f7f9;
  --vp-inline:#eef1f4;
  --vp-shadow:0 1px 2px rgba(0,0,0,0.04),
    0 4px 12px rgba(0,0,0,0.05);
  --vp-nav-h:64px;
  --vp-sidebar-w:272px;
}
html.dark{
  --vp-brand:#3fb27f;
  --vp-brand-2:#5fc99a;
  --vp-bg:#1b1b1f;
  --vp-bg-alt:#161618;
  --vp-surface:#202127;
  --vp-text:#dfdfd6;
  --vp-text-2:#b9b9bd;
  --vp-muted:#90909a;
  --vp-border:#2e2e34;
  --vp-divider:#2a2a30;
  --vp-code-bg:#161618;
  --vp-inline:#2c2c32;
  --vp-shadow:0 1px 2px rgba(0,0,0,0.3),
    0 6px 16px rgba(0,0,0,0.4);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body.vp{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,
    "Segoe UI",Roboto,"Helvetica Neue",Arial,
    sans-serif;
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

/* header */
.vp-nav{
  position:sticky;top:0;z-index:30;
  display:flex;align-items:center;
  height:var(--vp-nav-h);padding:0 1.75rem;
  background:var(--vp-bg);
  border-bottom:1px solid var(--vp-divider);
  transition:background-color 0.25s,
    border-color 0.25s;
}
.vp-nav-brand{
  font-weight:700;font-size:1.2rem;
  color:var(--vp-text);letter-spacing:-0.01em;
}
.vp-nav-right{
  display:flex;align-items:center;
  gap:1.5rem;margin-left:auto;
}
.vp-nav-links{
  display:flex;align-items:center;gap:1.4rem;
}
.vp-nav-links a{
  color:var(--vp-text-2);font-weight:500;
  font-size:0.92rem;padding:0.3rem 0;
  border-bottom:2px solid transparent;
  transition:color 0.25s,border-color 0.25s;
}
.vp-nav-links a:hover{
  color:var(--vp-text);text-decoration:none;
}
.vp-nav-links a[aria-current]{
  color:var(--vp-brand);font-weight:600;
}
.vp-theme-toggle{
  display:inline-flex;align-items:center;
  justify-content:center;width:38px;height:38px;
  border-radius:50%;border:1px solid var(--vp-border);
  background:var(--vp-bg-alt);cursor:pointer;
  font-size:1.05rem;line-height:1;color:var(--vp-text);
  padding:0;transition:background-color 0.25s,
    border-color 0.25s,transform 0.15s;
}
.vp-theme-toggle:hover{
  border-color:var(--vp-brand);transform:scale(1.06);
}
.vp-theme-toggle .vp-moon{display:none}
html.dark .vp-theme-toggle .vp-sun{display:none}
html.dark .vp-theme-toggle .vp-moon{display:inline}
.vp-menu-btn{
  display:none;cursor:pointer;font-size:1.4rem;
  line-height:1;padding:0.25rem 0.4rem;
  color:var(--vp-text);user-select:none;border-radius:6px;
  transition:background-color 0.25s;
}
.vp-menu-btn:hover{background:var(--vp-bg-alt)}

/* layout */
.vp-layout{
  display:flex;align-items:flex-start;
  max-width:1440px;margin:0 auto;
}
.vp-sidebar{
  flex:0 0 var(--vp-sidebar-w);
  width:var(--vp-sidebar-w);
  padding:1.75rem 1rem 4rem 1.75rem;
  border-right:1px solid var(--vp-divider);
  position:sticky;top:var(--vp-nav-h);
  max-height:calc(100vh - var(--vp-nav-h));
  overflow-y:auto;font-size:0.9rem;
  transition:border-color 0.25s;
}
.vp-sidebar summary{list-style:none;cursor:pointer}
.vp-sidebar summary::-webkit-details-marker{
  display:none;
}
/* the caret: a chevron that rotates open->down */
.vp-sidebar summary::after{
  content:"";margin-left:auto;flex:0 0 auto;
  width:0;height:0;
  border-left:5px solid currentColor;
  border-top:4px solid transparent;
  border-bottom:4px solid transparent;
  opacity:0.45;transition:transform 0.2s;
}
.vp-sidebar details[open] summary::after{
  transform:rotate(90deg);
}
/* top-level section */
.vp-group{margin-top:0.65rem}
.vp-group:first-child{margin-top:0}
.vp-group-title{
  display:flex;align-items:center;
  padding:0.26rem 0;font-size:0.9rem;
  font-weight:700;color:var(--vp-text);
  transition:color 0.25s;
}
.vp-group-title:hover{color:var(--vp-brand)}
/* every leaf link + nested toggle shares one rhythm */
.vp-sidebar a,
.vp-sidebar details details summary{
  display:flex;align-items:center;
  padding:0.17rem 0 0.17rem 0.85rem;
  font-size:0.875rem;font-weight:400;
  color:var(--vp-text-2);
  border-left:1px solid var(--vp-divider);
  transition:color 0.25s,border-color 0.25s;
}
.vp-sidebar a:hover,
.vp-sidebar details details summary:hover{
  color:var(--vp-text);text-decoration:none;
  border-left-color:var(--vp-muted);
}
.vp-sidebar details details summary{font-weight:500}
.vp-sidebar a[aria-current]{
  color:var(--vp-brand);font-weight:600;
  border-left:2px solid var(--vp-brand);
  padding-left:calc(0.85rem - 1px);
}
/* one extra indent step for items inside a nested group */
.vp-sidebar details details a{
  padding-left:1.6rem;
}
.vp-sidebar details details a[aria-current]{
  padding-left:calc(1.6rem - 1px);
}

/* content */
.vp-content{
  flex:1 1 auto;min-width:0;
  padding:2.25rem 3.25rem 5rem 3.25rem;
}
.vp-doc{max-width:728px;margin:0 auto}
.vp-doc h1{
  font-size:2.05rem;font-weight:700;
  line-height:1.25;margin:0 0 1.25rem;
  letter-spacing:-0.018em;
}
.vp-doc h2{
  font-size:1.5rem;font-weight:650;
  margin:2.85rem 0 1.1rem;padding-top:1.6rem;
  border-top:1px solid var(--vp-divider);
  letter-spacing:-0.01em;
}
.vp-doc h3{
  font-size:1.2rem;font-weight:600;
  margin:2rem 0 0.75rem;
}
.vp-doc h4{font-size:1.03rem;margin:1.5rem 0 0.5rem}
.vp-doc p{margin:1rem 0}
.vp-doc ul,.vp-doc ol{
  padding-left:1.35rem;margin:1rem 0;
}
.vp-doc li{margin:0.45rem 0}
.vp-doc strong{font-weight:650;color:var(--vp-text)}
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
  padding:0.15em 0.4em;border-radius:4px;
  transition:background-color 0.25s;
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
  font-size:inherit;
}

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
.vp-callout-tip{
  background:var(--vp-bg-alt);
  border-color:var(--vp-brand);
}
.vp-callout-tip .vp-callout-title{color:var(--vp-brand)}
.vp-callout-warning{
  background:var(--vp-bg-alt);border-color:#e0a106;
}
.vp-callout-warning .vp-callout-title{color:#c98a06}
.vp-callout-danger{
  background:var(--vp-bg-alt);border-color:#d05656;
}
.vp-callout-danger .vp-callout-title{color:#cf5c5c}

/* home */
.vp-home{max-width:1152px;margin:0 auto;
  padding:3.5rem 1.5rem 5rem}
.vp-hero{text-align:center;padding:2.5rem 0 2rem}
.vp-hero-title{
  font-size:3.2rem;font-weight:800;line-height:1.1;
  margin:0 0 1rem;color:var(--vp-brand);
  letter-spacing:-0.02em;
}
.vp-hero-tagline{
  font-size:1.3rem;color:var(--vp-muted);
  max-width:660px;margin:0 auto 2rem;line-height:1.5;
}
.vp-actions{
  display:flex;gap:0.75rem;
  justify-content:center;flex-wrap:wrap;
}
.vp-action{
  display:inline-block;padding:0.62rem 1.5rem;
  border-radius:22px;font-weight:600;font-size:0.95rem;
  border:1px solid transparent;
  transition:background-color 0.25s,color 0.25s,
    border-color 0.25s,transform 0.15s;
}
.vp-action:hover{transform:translateY(-1px)}
.vp a.vp-action-primary{
  background:var(--vp-brand);color:#ffffff;
  border-color:var(--vp-brand);
}
.vp a.vp-action-primary:hover{
  background:var(--vp-brand-2);
  border-color:var(--vp-brand-2);
  text-decoration:none;
}
.vp a.vp-action-alt{
  background:var(--vp-bg-alt);color:var(--vp-text);
  border-color:var(--vp-border);
}
.vp a.vp-action-alt:hover{
  border-color:var(--vp-brand);
  color:var(--vp-brand);text-decoration:none;
}
.vp-features{
  display:grid;
  grid-template-columns:repeat(
    auto-fit,minmax(252px,1fr));
  gap:1.5rem;margin-top:3.5rem;
}
.vp-feature{
  border:1px solid var(--vp-border);
  border-radius:12px;padding:1.5rem;
  background:var(--vp-bg-alt);
  transition:border-color 0.25s,box-shadow 0.25s,
    transform 0.15s,background-color 0.25s;
}
.vp-feature:hover{
  border-color:var(--vp-brand);
  box-shadow:var(--vp-shadow);transform:translateY(-2px);
}
.vp-feature h3{margin:0 0 0.5rem;font-size:1.1rem}
.vp-feature p{margin:0;color:var(--vp-muted);
  font-size:0.95rem}

/* responsive: collapse sidebar behind the ☰ menu */
@media (max-width:768px){
  .vp-menu-btn{display:inline-block}
  .vp-layout{flex-direction:column}
  .vp-sidebar{
    display:none;width:100%;flex-basis:auto;
    position:static;max-height:none;
    border-right:none;
    border-bottom:1px solid var(--vp-border);
    padding:1rem 1.25rem;
  }
  .vp-menu-cb:checked ~ .vp-layout .vp-sidebar{
    display:block;
  }
  .vp-content{padding:1.5rem 1.25rem 4rem}
  .vp-doc{max-width:100%}
  .vp-hero-title{font-size:2.3rem}
  .vp-hero-tagline{font-size:1.1rem}
  .vp-nav{padding:0 1rem}
  .vp-nav-right{gap:0.75rem}
  .vp-nav-links{display:none}
}
`;
