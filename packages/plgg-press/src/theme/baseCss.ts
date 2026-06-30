import { type SoftStr } from "plgg";

/**
 * The static, hand-authored base stylesheet for the
 * default theme — a VitePress-like single light theme
 * that OWNS layout, typography, and responsiveness
 * (media queries the atomic `style_` utilities cannot
 * express). It is injected INLINE into the document
 * `<style>` (ahead of the body's collected atomic CSS)
 * by {@link shell}, so it must stay escape-safe: it
 * contains NO raw `<`, `>`, or `&` — only class and
 * descendant selectors, `@media` blocks, and custom
 * properties — so the `text()` `<style>` node survives
 * the SSR escaper byte-for-byte (no child `>`
 * combinators, no `&` nesting).
 *
 * The mobile sidebar collapse is CSS-only: a hidden
 * checkbox (`#vp-menu-toggle`, emitted by the page
 * layout) toggled by the nav's `☰` label, with a
 * general-sibling rule revealing the sidebar — zero
 * client JavaScript.
 */
export const baseCss: SoftStr = `
:root{
  --vp-brand:#2e8b57;
  --vp-brand-dark:#236b43;
  --vp-text:#2c3e50;
  --vp-muted:#67707b;
  --vp-bg:#ffffff;
  --vp-soft:#f6f7f9;
  --vp-border:#e3e6eb;
  --vp-code-bg:#f6f7f9;
  --vp-inline:#eef1f4;
  --vp-nav-h:56px;
  --vp-sidebar-w:272px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body.vp{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,
    "Segoe UI",Roboto,"Helvetica Neue",Arial,
    sans-serif;
  font-size:16px;
  line-height:1.65;
  color:var(--vp-text);
  background:var(--vp-bg);
  -webkit-font-smoothing:antialiased;
}
.vp a{color:var(--vp-brand);text-decoration:none}
.vp a:hover{text-decoration:underline}
.vp-menu-cb{display:none}

/* top navigation */
.vp-nav{
  position:sticky;top:0;z-index:20;
  display:flex;align-items:center;
  gap:1.5rem;height:var(--vp-nav-h);
  padding:0 1.5rem;background:var(--vp-bg);
  border-bottom:1px solid var(--vp-border);
}
.vp-nav-brand{
  font-weight:700;font-size:1.15rem;
  color:var(--vp-text);
}
.vp-nav-links{
  display:flex;align-items:center;gap:1.25rem;
  flex-wrap:wrap;
}
.vp-nav-links a{
  color:var(--vp-text);font-weight:500;
  font-size:0.95rem;
}
.vp-nav-links a:hover{color:var(--vp-brand)}
.vp-nav-links a[aria-current]{
  color:var(--vp-brand);font-weight:600;
}
.vp-menu-btn{
  display:none;margin-left:auto;cursor:pointer;
  font-size:1.4rem;line-height:1;
  padding:0.25rem 0.5rem;color:var(--vp-text);
  user-select:none;
}

/* two-column layout */
.vp-layout{
  display:flex;align-items:flex-start;
  max-width:1440px;margin:0 auto;
}
.vp-sidebar{
  flex:0 0 var(--vp-sidebar-w);
  width:var(--vp-sidebar-w);
  padding:1.5rem 1rem 3rem 1.5rem;
  border-right:1px solid var(--vp-border);
  position:sticky;top:var(--vp-nav-h);
  max-height:calc(100vh - var(--vp-nav-h));
  overflow-y:auto;font-size:0.9rem;
}
.vp-sidebar details{margin-bottom:0.5rem}
.vp-sidebar summary{
  list-style:none;cursor:pointer;
  font-weight:600;color:var(--vp-text);
  padding:0.3rem 0;
}
.vp-sidebar summary::-webkit-details-marker{
  display:none;
}
.vp-sidebar details details summary{
  font-weight:500;color:var(--vp-muted);
}
.vp-sidebar a{
  display:block;padding:0.28rem 0;
  padding-left:0.75rem;color:var(--vp-muted);
  border-left:1px solid transparent;
  font-weight:400;
}
.vp-sidebar a:hover{
  color:var(--vp-text);text-decoration:none;
}
.vp-sidebar a[aria-current]{
  color:var(--vp-brand);font-weight:600;
  border-left:1px solid var(--vp-brand);
}
.vp-sidebar details details{
  padding-left:0.75rem;
  border-left:1px solid var(--vp-border);
  margin-left:0.1rem;
}

/* content column */
.vp-content{
  flex:1 1 auto;min-width:0;
  padding:2rem 3rem 5rem 3rem;
}
.vp-doc{max-width:720px;margin:0 auto}
.vp-doc h1{
  font-size:2rem;font-weight:700;
  line-height:1.25;margin:0 0 1.25rem;
  letter-spacing:-0.01em;
}
.vp-doc h2{
  font-size:1.45rem;font-weight:650;
  margin:2.75rem 0 1rem;padding-top:1.5rem;
  border-top:1px solid var(--vp-border);
  letter-spacing:-0.01em;
}
.vp-doc h3{
  font-size:1.18rem;font-weight:600;
  margin:2rem 0 0.75rem;
}
.vp-doc h4{font-size:1.02rem;margin:1.5rem 0 0.5rem}
.vp-doc p{margin:1rem 0}
.vp-doc ul,.vp-doc ol{
  padding-left:1.35rem;margin:1rem 0;
}
.vp-doc li{margin:0.4rem 0}
.vp-doc strong{font-weight:650}
.vp-doc blockquote{
  margin:1rem 0;padding:0.25rem 1rem;
  border-left:3px solid var(--vp-border);
  color:var(--vp-muted);
}
.vp-doc hr{
  border:none;
  border-top:1px solid var(--vp-border);
  margin:2rem 0;
}
.vp-doc img{max-width:100%}

/* code */
.vp-doc code{
  font-family:"SF Mono",Menlo,Consolas,
    "Liberation Mono",monospace;
  font-size:0.85em;background:var(--vp-inline);
  padding:0.15em 0.4em;border-radius:4px;
}
.vp-doc pre{
  background:var(--vp-code-bg);
  border:1px solid var(--vp-border);
  padding:1.1rem 1.25rem;border-radius:10px;
  overflow-x:auto;margin:1.1rem 0;
  font-size:0.86rem;line-height:1.55;
}
.vp-doc pre code{
  background:none;padding:0;border-radius:0;
  font-size:inherit;
}

/* tables */
.vp-doc table{
  border-collapse:collapse;margin:1.25rem 0;
  display:block;overflow-x:auto;
  font-size:0.92rem;
}
.vp-doc th,.vp-doc td{
  border:1px solid var(--vp-border);
  padding:0.5rem 0.85rem;text-align:left;
}
.vp-doc th{background:var(--vp-soft);font-weight:600}

/* callouts */
.vp-callout{
  margin:1.25rem 0;padding:0.75rem 1rem;
  border-radius:8px;border:1px solid transparent;
  border-left-width:4px;
}
.vp-callout-title{
  font-weight:650;margin:0 0 0.35rem;
}
.vp-callout p{margin:0.35rem 0}
.vp-callout-tip{
  background:#f1f9f4;border-color:var(--vp-brand);
}
.vp-callout-tip .vp-callout-title{color:var(--vp-brand-dark)}
.vp-callout-warning{
  background:#fff8e6;border-color:#e0a106;
}
.vp-callout-warning .vp-callout-title{color:#a3760a}
.vp-callout-danger{
  background:#fdf0f0;border-color:#d05656;
}
.vp-callout-danger .vp-callout-title{color:#b13b3b}

/* home */
.vp-home{max-width:1152px;margin:0 auto;
  padding:3rem 1.5rem 5rem}
.vp-hero{text-align:center;padding:2.5rem 0 2rem}
.vp-hero-title{
  font-size:3rem;font-weight:800;
  line-height:1.1;margin:0 0 1rem;
  color:var(--vp-brand);letter-spacing:-0.02em;
}
.vp-hero-tagline{
  font-size:1.3rem;color:var(--vp-muted);
  max-width:640px;margin:0 auto 2rem;
  line-height:1.5;
}
.vp-actions{
  display:flex;gap:0.75rem;
  justify-content:center;flex-wrap:wrap;
}
.vp-action{
  display:inline-block;padding:0.6rem 1.4rem;
  border-radius:22px;font-weight:600;
  font-size:0.95rem;border:1px solid var(--vp-brand);
}
.vp a.vp-action-primary{
  background:var(--vp-brand);color:#ffffff;
}
.vp a.vp-action-primary:hover{
  background:var(--vp-brand-dark);
  text-decoration:none;border-color:var(--vp-brand-dark);
}
.vp a.vp-action-alt{
  background:var(--vp-bg);color:var(--vp-brand);
  border-color:var(--vp-border);
}
.vp a.vp-action-alt:hover{
  border-color:var(--vp-brand);text-decoration:none;
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
  background:var(--vp-soft);
}
.vp-feature h3{margin:0 0 0.5rem;font-size:1.1rem}
.vp-feature p{margin:0;color:var(--vp-muted);
  font-size:0.95rem}

/* responsive: collapse the sidebar behind the ☰ menu */
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
  .vp-hero-title{font-size:2.2rem}
  .vp-hero-tagline{font-size:1.1rem}
  .vp-nav{gap:1rem;padding:0 1rem}
}
`;
