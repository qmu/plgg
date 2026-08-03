/**
 * Demo 1's page stylesheet: the demo's OWN chrome (`bo-*`)
 * and the monochrome palette variables. Nothing here names a
 * framework `pm-*` class.
 *
 * Everything that used to couple the demo to the framework by
 * class name is gone:
 * - the 16-plus by-name `pm-*` appearance overrides now
 *   travel as declared per-component THEMING SLOTS in
 *   `demo1/theme.ts` (`demo1Slots`), resolved by the
 *   framework's `slotCss`;
 * - the app-owned **unbounded-depth horizontal runway** — the
 *   row scroll-at-every-width override, the desktop `::after`
 *   spacer, the last-column measurement, and the per-content
 *   column widths — is now the framework's
 *   declared runway capability (`runwayCss` + `advanceColumns`,
 *   with the widths as `rowCol` slots), which the reference
 *   merely enables.
 *
 * The reference is now a pure consumer of the framework's
 * theming and layout surfaces; it writes only its own `bo-*`
 * chrome and palette.
 */
import { cssVar, cssVarRef } from "plggmatic";
export const demo1Css = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:${cssVarRef("surface")};color:${cssVarRef("text")};overflow:hidden;}
.bo-root{height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.bo-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:${cssVarRef("surface")};color:${cssVarRef("text")};line-height:1;}
.bo-navleft{display:flex;align-items:center;gap:0.75rem;min-width:0;}
.bo-brand{font-weight:600;white-space:nowrap;}
:root{${cssVar("surface")}:#ffffff;${cssVar("surface-2")}:#ffffff;${cssVar("text")}:#000000;${cssVar("primary-base")}:#000000;${cssVar("primary-text")}:#ffffff;${cssVar("border")}:#d4d4d4;}
html.dark{${cssVar("surface")}:#000000;${cssVar("surface-2")}:#000000;${cssVar("text")}:#ffffff;${cssVar("primary-base")}:#ffffff;${cssVar("primary-text")}:#000000;${cssVar("border")}:#3a3a3a;}
.bo-topbar>button{width:30px;height:30px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;}
.bo-topbar>button svg{width:15px;height:15px;}
.bo-topbar>button{transition:background-color 0.15s ease,color 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease,transform 0.08s ease;}
.bo-topbar>button:active{transform:scale(0.97);}
.bo-trail-detail{display:flex;flex-direction:column;gap:0.4rem;}
.bo-field{display:flex;flex-direction:column;}
.bo-field-label{font-size:0.72rem;color:color-mix(in oklab,${cssVarRef("text")} 58%,transparent);}
.bo-field-value{font-size:0.9rem;line-height:1.3;}
.bo-field-prose{width:0;min-width:100%;}
.bo-trail-jump{display:inline-block;align-self:flex-start;margin-top:0.5rem;padding:0.25rem 0.55rem;border:1px solid ${cssVarRef("border")};border-radius:6px;color:${cssVarRef("text")};text-decoration:none;font-size:0.85rem;}
.bo-trail-jump:hover{background:${cssVarRef("text")};color:${cssVarRef("surface")};}
.bo-field-link{font-size:0.9rem;line-height:1.3;color:${cssVarRef("text")};text-decoration:underline;text-underline-offset:2px;}
.bo-field-link:hover{opacity:0.65;}
.bo-result-name{display:block;font-weight:600;font-size:0.9rem;line-height:1.3;}
.bo-result-meta{display:block;margin-top:0.05rem;font-size:0.78rem;line-height:1.25;color:color-mix(in oklab,${cssVarRef("text")} 58%,transparent);}
.bo-results a[aria-current="page"] .bo-result-meta{color:color-mix(in oklab,${cssVarRef("surface")} 72%,transparent);}
`;
