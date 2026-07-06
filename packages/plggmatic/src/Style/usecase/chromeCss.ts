import { type SoftStr } from "plgg";
import { cssPrefix } from "plggmatic/Meta/model/identity";
import { colorVar } from "plggmatic/Style/model/token";
import { metricVar } from "plggmatic/Style/model/metric";
import { zValue } from "plggmatic/Style/model/zIndex";
import {
  minWidth,
  maxWidth,
} from "plggmatic/Style/model/breakpoint";

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
export const chromeCss: SoftStr =
  `.${cssPrefix}-row{background:${colorVar("surface-2")};}` +
  `.${cssPrefix}-col{background:${colorVar("surface")};border-right:1px solid ${colorVar("border")};}` +
  `.${cssPrefix}-colhead{position:sticky;top:0;z-index:${zValue("content")};display:flex;align-items:center;justify-content:space-between;gap:0.5rem;height:40px;padding:0 0.75rem;background:${colorVar("surface-2")};border-bottom:1px solid ${colorVar("border")};}` +
  `.${cssPrefix}-colhead-title{font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}` +
  `.${cssPrefix}-close{color:${colorVar("muted")};text-decoration:none;line-height:1;padding:0.25rem 0.4rem;border-radius:0.25rem;}` +
  `.${cssPrefix}-close:hover{background:${colorVar("primary-base")};color:${colorVar("surface")};}` +
  `.${cssPrefix}-crumbs{display:flex;align-items:center;gap:0.4rem;min-width:0;overflow:hidden;white-space:nowrap;font-size:0.85rem;color:${colorVar("muted")};}` +
  `.${cssPrefix}-crumbs a{color:${colorVar("muted")};text-decoration:none;padding:0.15rem 0.4rem;border-radius:0.25rem;}` +
  `.${cssPrefix}-crumbs a:hover{background:${colorVar("primary-base")};color:${colorVar("surface")};}` +
  `.${cssPrefix}-crumb-here{color:${colorVar("text")};font-weight:500;overflow:hidden;text-overflow:ellipsis;}` +
  `.${cssPrefix}-crumb-sep{color:${colorVar("border")};}` +
  `.${cssPrefix}-pane a[aria-current="page"]{background:${colorVar("primary-base")};color:${colorVar("surface")};}` +
  `@media ${minWidth("snap")}{.${cssPrefix}-row{height:calc(100vh - ${metricVar("rail")});overflow:hidden;}.${cssPrefix}-col{height:calc(100vh - ${metricVar("rail")});overflow-y:auto;}}` +
  `@media ${maxWidth("snap")}{.${cssPrefix}-row{overflow-x:auto;scroll-snap-type:x proximity;}.${cssPrefix}-col{scroll-snap-align:start;}}`;
