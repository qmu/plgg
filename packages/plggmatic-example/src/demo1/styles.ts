import { minWidth } from "plggmatic/style";

/**
 * Demo 1's page stylesheet: the demo's OWN chrome (`bo-*`),
 * the monochrome palette variables, and the desktop trailing
 * runway.
 *
 * The framework-component restyle that used to live here as
 * 16-plus by-name `pm-*` overrides is gone: it now travels as
 * declared per-component THEMING SLOTS in `demo1/theme.ts`
 * (`demo1Slots`), which the framework resolves into `pm-*`
 * rules IT owns (`slotCss`). The demo no longer writes a
 * single framework class name to restyle it — the coupling
 * the old header called "a smell" is removed. What remains
 * that still names `pm-*` is the app-owned desktop runway
 * below, whose generalization into the framework is the
 * sibling horizontal-runway capability.
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
 * A `flex` spacer box, never a trailing margin or padding —
 * those are not reliably counted in a flex scroll
 * container's scroll width (the same reason the framework's
 * own runway is a `::after` box).
 */
export const demo1Css = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:var(--pm-surface);color:var(--pm-text);overflow:hidden;}
.bo-root{height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.pm-row{--bo-gap:1.5rem;flex:1;min-height:0;height:auto;gap:var(--bo-gap);overflow-x:auto;overflow-y:hidden;}
.bo-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:var(--pm-surface);color:var(--pm-text);line-height:1;}
.bo-navleft{display:flex;align-items:center;gap:0.75rem;min-width:0;}
.bo-brand{font-weight:600;white-space:nowrap;}
:root{--pm-surface:#ffffff;--pm-surface-2:#ffffff;--pm-text:#000000;--pm-primary-base:#000000;--pm-primary-text:#ffffff;--pm-border:#d4d4d4;}
html.dark{--pm-surface:#000000;--pm-surface-2:#000000;--pm-text:#ffffff;--pm-primary-base:#ffffff;--pm-primary-text:#000000;--pm-border:#3a3a3a;}
.bo-topbar>button{width:30px;height:30px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;}
.bo-topbar>button svg{width:15px;height:15px;}
.bo-topbar>button{transition:background-color 0.15s ease,color 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease,transform 0.08s ease;}
.bo-topbar>button:active{transform:scale(0.97);}
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
.bo-field-link{font-size:0.9rem;line-height:1.3;color:var(--pm-text);text-decoration:underline;text-underline-offset:2px;}
.bo-field-link:hover{opacity:0.65;}
.bo-result-name{display:block;font-weight:600;font-size:0.9rem;line-height:1.3;}
.bo-result-meta{display:block;margin-top:0.05rem;font-size:0.78rem;line-height:1.25;color:color-mix(in oklab,var(--pm-text) 58%,transparent);}
.bo-results a[aria-current="page"] .bo-result-meta{color:color-mix(in oklab,var(--pm-surface) 72%,transparent);}
@media ${minWidth("snap")}{.pm-row::after{content:"";flex:0 0 calc(100% - var(--bo-last,220px) - var(--bo-gap));}}
`;
