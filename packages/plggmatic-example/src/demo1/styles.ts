import { minWidth } from "plggmatic/style";

/**
 * Demo 1's page stylesheet.
 *
 * These rules override 16 framework `pm-*` classes by name
 * (`.pm-scheduler`, `.pm-row`, `.pm-col`, `.pm-colhead`,
 * `.pm-colhead-title`, `.pm-close`, `.pm-pane`,
 * `.pm-menu-body`, `.pm-query`, `.pm-list`, `.pm-list-item`,
 * `.pm-row-link`, `.pm-list-action`, `.pm-list-actions`,
 * `.pm-form`, `.pm-btn-primary`) plus the demo's own `bo-*`
 * chrome. Keeping the override block here — one documented
 * place — makes the framework-class coupling visible and
 * greppable instead of buried in the CSR entry.
 *
 * The coupling itself is a smell: cleanly removing it would
 * mean giving plggmatic real theming hooks so a consumer
 * restyles through tokens/slots rather than by class name.
 * That is a framework change, out of scope here; tracked as
 * a candidate follow-up.
 *
 * **The desktop trailing runway.** The framework strip only
 * scrolls horizontally BELOW its `snap` breakpoint (900px);
 * above it the row is `overflow:hidden`, because a framework
 * column strip is expected to fit. This app's recursion is
 * unbounded, so it overrides `.pm-row` to scroll at every
 * width — and therefore owns the desktop runway the
 * framework only ships below `snap`. Without one, the strip
 * stops scrolling once the last column meets the RIGHT edge,
 * so `advanceColumnsCmd`'s scroll-to-left-edge is silently
 * clamped exactly when the trail runs deep.
 *
 * The spacer is one column short of the strip's own width:
 * at full scroll the last column sits at the left edge with
 * the runway filling the rest. Which means the rule needs
 * that column's width — and since the columns below size to
 * their CONTENT, no constant here can know it. It was
 * written as one twice and was wrong both times, once per
 * width that changed under it. So `advanceColumnsCmd`
 * publishes the measurement it already takes as `--bo-last`,
 * from the first paint onwards — `init` issues it too,
 * because a deep link stands the whole trail up before any
 * navigation has happened to measure it.
 *
 * The fallback is therefore only ever read if that Cmd never
 * runs at all, and being a guess, it is wrong by whatever the
 * last column is not: 220px against a 196px column left the
 * strip 24px short of the left edge, which is how the gap
 * below caught the fallback standing in for a measurement
 * that should have been taken.
 *
 * A `flex` spacer box, never a trailing margin or padding —
 * those are not reliably counted in a flex scroll
 * container's scroll width (the same reason the framework's
 * own runway is a `::after` box).
 */
export const demo1Css = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:var(--pm-surface);color:var(--pm-text);overflow:hidden;}
.bo-root{height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.pm-scheduler{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:0 1rem;}
.pm-row{--bo-gap:1.5rem;flex:1;min-height:0;height:auto;gap:var(--bo-gap);overflow-x:auto;overflow-y:hidden;}
.bo-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:var(--pm-surface);color:var(--pm-text);line-height:1;}
.bo-navleft{display:flex;align-items:center;gap:0.75rem;min-width:0;}
.bo-brand{font-weight:600;white-space:nowrap;}
.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}
:root{--pm-surface:#ffffff;--pm-surface-2:#ffffff;--pm-text:#000000;--pm-primary-base:#000000;--pm-primary-text:#ffffff;--pm-border:#d4d4d4;}
html.dark{--pm-surface:#000000;--pm-surface-2:#000000;--pm-text:#ffffff;--pm-primary-base:#ffffff;--pm-primary-text:#000000;--pm-border:#3a3a3a;}
.pm-col{border-right:none;height:auto;}
.pm-colhead{border-bottom:none;background:transparent;color:var(--pm-text);border-radius:0;height:auto;padding:0;margin-bottom:0.5rem;justify-content:flex-start;}
.pm-colhead .pm-colhead-title{background:transparent;color:var(--pm-text);border-radius:0;padding:0;margin:0;font-weight:700;font-size:0.95rem;flex:0 0 auto;text-decoration:none;}
.pm-colhead a.pm-colhead-title:hover{text-decoration:underline;}
.pm-pane{padding-top:0.25rem;}
.bo-topbar>button{width:30px;height:30px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;}
.bo-topbar>button svg{width:15px;height:15px;}
.pm-menu-body{padding:0;border:none;}
.pm-menu-body ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.1rem;}
.pm-menu-body li a{display:inline-block;border:none;border-radius:3px;padding:0.1rem 0.35rem;margin-left:-0.35rem;background:transparent;color:var(--pm-text);text-decoration:none;font-size:0.95rem;line-height:1.35;}
.pm-list{margin:0;padding:0;border:1px solid var(--pm-border);border-radius:8px;background:var(--pm-surface);overflow:hidden;}
.pm-list-item{margin:0;}
.pm-list-item+.pm-list-item{margin-top:0;border-top:1px solid var(--pm-border);}
.pm-row-link{display:block;border:none;border-radius:0;background:transparent;padding:0.35rem 0.65rem;color:var(--pm-text);}
.pm-menu-body li a:not([aria-current="page"]):hover,.pm-row-link:not([aria-current="page"]):hover{background:var(--pm-text);color:var(--pm-surface);}
.pm-menu-body li a:focus-visible,.pm-row-link:focus-visible{outline-offset:0;}
.pm-list-actions{display:flex;flex-direction:column;margin:0 0 0.5rem 0;}
.pm-list-action{display:block;border:1px solid var(--pm-border);border-radius:8px;padding:0.5rem 0.65rem;background:var(--pm-surface);color:var(--pm-text);text-decoration:none;text-align:center;}
.pm-list-action:not([aria-current="page"]):hover{background:color-mix(in oklab,var(--pm-text) 8%,transparent);}
.pm-form>*:first-child{margin-top:0;}
.pm-form{background:transparent;border:none;border-radius:0;padding:0;box-sizing:border-box;}
.pm-btn-primary{background:transparent;color:var(--pm-text);border-color:var(--pm-text);}
.pm-btn-primary:hover{background:var(--pm-text);color:var(--pm-surface);}
.pm-row .pm-col{flex:0 0 240px;width:240px;}
.pm-row .pm-col:has(.pm-menu-body){flex:0 0 auto;width:fit-content;max-width:190px;}
.pm-row .pm-col:has(.pm-form){flex:0 0 380px;width:380px;}
.pm-row .pm-col:has(.bo-search-condition){flex:0 0 200px;width:200px;}
.pm-row .pm-col:has(.bo-results){flex:0 0 auto;width:fit-content;max-width:220px;}
.pm-row .pm-col:has(.bo-trail-detail){flex:0 0 auto;width:fit-content;max-width:220px;}
.bo-trail-detail{display:flex;flex-direction:column;gap:0.4rem;}
.bo-field{display:flex;flex-direction:column;}
.bo-field-label{font-size:0.72rem;color:color-mix(in oklab,var(--pm-text) 58%,transparent);}
.bo-field-value{font-size:0.9rem;line-height:1.3;}
.bo-field-prose{width:0;min-width:100%;}
.bo-trail-jump{display:inline-block;align-self:flex-start;margin-top:0.5rem;padding:0.25rem 0.55rem;border:1px solid var(--pm-border);border-radius:6px;color:var(--pm-text);text-decoration:none;font-size:0.85rem;}
.bo-trail-jump:hover{background:var(--pm-text);color:var(--pm-surface);}
.bo-hidelist .pm-col:has(.pm-query){display:none;}
.bo-hidelist .pm-col:has(.pm-fields){display:none;}
.bo-field-link{font-size:0.9rem;line-height:1.3;color:var(--pm-text);text-decoration:underline;text-underline-offset:2px;}
.bo-field-link:hover{opacity:0.65;}
.bo-result-name{display:block;font-weight:600;font-size:0.9rem;line-height:1.3;}
.bo-result-meta{display:block;margin-top:0.05rem;font-size:0.78rem;line-height:1.25;color:color-mix(in oklab,var(--pm-text) 58%,transparent);}
.bo-results a[aria-current="page"] .bo-result-meta,.bo-results .pm-row-link:not([aria-current="page"]):hover .bo-result-meta{color:color-mix(in oklab,var(--pm-surface) 72%,transparent);}
.bo-results .pm-list{border:none;background:transparent;border-radius:0;overflow:visible;}
.bo-results .pm-list-item+.pm-list-item{border-top:none;margin-top:0.35rem;}
.bo-results .pm-row-link{padding:0.1rem 0.35rem;border-radius:3px;}
.pm-form .pm-field{margin:0;}
.pm-form .pm-field+.pm-field{margin-top:0.3rem;}
.pm-form .pm-field-label{font-size:0.72rem;margin-bottom:0.1rem;color:color-mix(in oklab,var(--pm-text) 58%,transparent);}
.pm-form .pm-input{padding:0.2rem 0.4rem;font-size:0.82rem;border-radius:5px;}
.pm-form .pm-btn-primary{display:inline-block;width:auto;align-self:flex-start;margin-top:0.5rem;padding:0.25rem 0.7rem;font-size:0.82rem;border-radius:5px;}
.pm-pane a[aria-current="page"]{background:var(--pm-text);color:var(--pm-surface);box-shadow:none;}
.pm-menu-body li a,.pm-row-link,.pm-list-action,.pm-colhead-title,.bo-topbar>button{transition:background-color 0.15s ease,color 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease,transform 0.08s ease;}
.pm-menu-body li a:active,.pm-row-link:active,.pm-list-action:active,.bo-topbar>button:active{transform:scale(0.97);}
@media ${minWidth("snap")}{.pm-row::after{content:"";flex:0 0 calc(100% - var(--bo-last,220px) - var(--bo-gap));}}
`;
