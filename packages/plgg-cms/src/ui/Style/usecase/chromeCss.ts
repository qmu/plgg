import { type SoftStr } from "plgg";
import { type Theme } from "plgg-cms/ui/Style/model/theme";
import { colorVar } from "plgg-cms/ui/Style/model/token";
import { metricVar } from "plgg-cms/ui/Style/model/metric";
import { zValue } from "plgg-cms/ui/Style/model/zIndex";
import {
  minWidth,
  maxWidth,
} from "plgg-cms/ui/Style/model/breakpoint";

/**
 * The multi-column mode's framework chrome, as a single
 * escape-safe CSS block (no `<`, `>`, `&` — survives an
 * SSR text escaper byte-for-byte). This is the pattern
 * the workbench example hand-wrote as app-side `ex-*`
 * rules, lifted into the design system: column surfaces,
 * sticky `colHead` headers, the breadcrumb trail, the
 * `aria-current` inverted pill (and the close/crumb hover
 * pills) — all painted as neutral `surface` ink on a
 * `primary-base` fill, the on-fill label the `base` variant
 * documents (NOT `primary-text`, which is the role ink for
 * neutral surfaces and equals `primary-base` under the
 * monochrome default, rendering the pill label invisible) —
 * per-column scroll above
 * the `snap` breakpoint (viewport minus the chrome-rail
 * metric), and the below-`snap` horizontal scroll-snap
 * strip. Every color is a `--pm-*` variable (via
 * {@link colorVar}), every dimension a token
 * ({@link metricVar}/{@link zValue}), and the media
 * boundaries come from the breakpoint builders (never a
 * `--pm-*` custom property — a `@media` cannot resolve
 * `var()`). Class hooks are `cssPrefix`-derived
 * (`pm-row`/`pm-col`/`pm-pane`/`pm-colhead`/`pm-crumbs`).
 * Inject once at boot AFTER the scheme CSS so the
 * variables resolve.
 */
export const chromeCss = (
  theme: Theme,
): SoftStr => {
  const p = theme.prefix;
  const cvar = colorVar(theme);
  const mvar = metricVar(theme);
  return (
    `.${p}-row{background:${cvar("surface-2")};}` +
    `.${p}-col{background:${cvar("surface")};border-right:1px solid ${cvar("border")};}` +
    `.${p}-colhead{position:sticky;top:0;z-index:${zValue("content")};display:flex;align-items:center;justify-content:space-between;gap:0.5rem;height:40px;padding:0 0.75rem;background:${cvar("surface-2")};border-bottom:1px solid ${cvar("border")};}` +
    `.${p}-colhead-title{font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}` +
    `.${p}-colhead-link{margin-left:auto;color:${cvar("primary-base")};text-decoration:none;line-height:1;padding:0.35rem 0.55rem;border:1px solid ${cvar("border")};border-radius:0.375rem;background:${cvar("surface")};font-size:0.8rem;font-weight:600;white-space:nowrap;}` +
    `.${p}-colhead-link:hover{background:${cvar("primary-base")};border-color:${cvar("primary-base")};color:${cvar("surface")};}` +
    `.${p}-close{color:${cvar("muted")};text-decoration:none;line-height:1;padding:0.25rem 0.4rem;border-radius:0.25rem;}` +
    `.${p}-close:hover{background:${cvar("primary-base")};color:${cvar("surface")};}` +
    `.${p}-crumbs{display:flex;align-items:center;gap:0.4rem;min-width:0;overflow:hidden;white-space:nowrap;font-size:0.85rem;color:${cvar("muted")};}` +
    `.${p}-crumbs a{color:${cvar("muted")};text-decoration:none;padding:0.15rem 0.4rem;border-radius:0.25rem;}` +
    `.${p}-crumbs a:hover{background:${cvar("primary-base")};color:${cvar("surface")};}` +
    `.${p}-crumb-here{color:${cvar("text")};font-weight:500;overflow:hidden;text-overflow:ellipsis;}` +
    `.${p}-crumb-sep{color:${cvar("border")};}` +
    `.${p}-list{list-style:none;margin:0.75rem;padding:0.4rem;border:1px solid ${cvar("border")};border-radius:0.5rem;background:${cvar("surface-2")};}` +
    `.${p}-list-item{margin:0;}` +
    `.${p}-list-item+.${p}-list-item{margin-top:0.35rem;}` +
    `.${p}-row-link{display:block;color:${cvar("text")};text-decoration:none;padding:0.45rem 0.55rem;border:1px solid ${cvar("border")};border-radius:0.375rem;background:${cvar("surface")};}` +
    `.${p}-row-link:hover{border-color:${cvar("primary-base")};}` +
    `.${p}-pane a[aria-current="page"]{background:${cvar("primary-base")};color:${cvar("surface")};}` +
    `@media ${minWidth("snap")}{.${p}-row{height:calc(100vh - ${mvar("rail")});overflow:hidden;}.${p}-col{height:calc(100vh - ${mvar("rail")});overflow-y:auto;}}` +
    `@media ${maxWidth("snap")}{.${p}-row{overflow-x:auto;scroll-snap-type:x proximity;}.${p}-col{scroll-snap-align:start;}}`
  );
};
