import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { colorVar } from "plggmatic/Style/model/token";
import { zValue } from "plggmatic/Style/model/zIndex";
import { maxWidth } from "plggmatic/Style/model/breakpoint";

/**
 * A workspace's fixed lengths: the rail a compact menu
 * folds to, the reading measure a `read` column starts
 * from, and the fallbacks used until the geometry has been
 * written (a server render, a first paint).
 */
export type WorkspaceOptions = Readonly<{
  rail: SoftStr;
  reading: SoftStr;
  menu: SoftStr;
  column: SoftStr;
}>;

/** A 64px rail, a 640px reading measure, 220/320 fallbacks. */
export const workspaceOptions: WorkspaceOptions =
  {
    rail: "64px",
    reading: "640px",
    menu: "220px",
    column: "320px",
  };

/**
 * The WORKSPACE as a declared framework capability: a
 * panel pinned to the left edge and, beside it, a strip of
 * menu and columns that scrolls under it.
 *
 * Two products laid this out by hand with the same grid
 * (corpd, coop-planner). The frame is a two-track grid —
 * the panel's track, then the strip at its natural width —
 * and the panel sits `sticky` across both, so scrolling
 * the frame slides the strip under the panel while the
 * panel's own width (the geometry's `--<p>-strip-panel`)
 * shrinks toward its floor. Every length that depends on
 * the window comes from `stripStyle`; nothing here
 * measures.
 *
 * Emitted, in the theme's namespace:
 * - the frame, the pinned panel, the strip and its seam;
 * - the menu track, folding to {@link WorkspaceOptions.rail}
 *   while the workspace is compact (never on a phone);
 * - the three column widths (`fit`, `wide`, `read`);
 * - below the `sm` breakpoint, one column per swipe: the
 *   panel's track collapses (how the panel is then shown —
 *   a sheet, a tab — is the product's) and the strip snaps
 *   mandatorily, except while the framework itself is
 *   scrolling it.
 *
 * Escape-safe (no `<`, `>`, `&`). Inject after
 * `chromeCss`: a strip column is also a `pm-col`, and the
 * heights given here must win over the chrome's.
 */
export const workspaceCss =
  (theme: Theme) =>
  (opts: WorkspaceOptions): SoftStr => {
    const p = theme.prefix;
    const cvar = colorVar(theme);
    const v = (name: SoftStr): SoftStr =>
      `--${p}-strip-${name}`;
    const ws = `.${p}-workspace`;
    const col = `.${p}-browser .${p}-col`;
    const width = (kind: SoftStr): SoftStr =>
      `${col}[data-${p}-width="${kind}"]`;
    const column = `var(${v("column")},${opts.column})`;
    return (
      `${ws}{display:grid;grid-template-columns:var(${v("track")},100vw) max-content;grid-template-rows:100%;height:100dvh;overflow-x:auto;overflow-y:hidden;overflow-anchor:none;overscroll-behavior-x:contain;}` +
      `.${p}-browser{position:relative;grid-column:2;grid-row:1;height:100%;min-width:var(${v("minimum")},0);width:max-content;}` +
      `.${p}-seam{flex:0 0 var(${v("seam")},0px);}` +
      `.${p}-pinned{grid-column:1 / -1;grid-row:1;justify-self:start;position:sticky;left:0;z-index:${zValue("chrome")};width:var(${v("panel")},100vw);height:100%;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:${cvar("surface")};border-right:1px solid ${cvar("border")};}` +
      `.${p}-menu,${col}{box-sizing:border-box;flex:none;height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;}` +
      `.${p}-menu{width:var(${v("menu")},${opts.menu});transition:width .16s ease;}` +
      `${ws}:not([data-${p}-menu-open]) .${p}-menu{display:none;}` +
      `${ws}[data-${p}-menu-compact]:not([data-${p}-phone]) .${p}-menu{width:${opts.rail};}` +
      `${width("fit")}{width:${column};}` +
      `${width("wide")}{width:min(calc(${column} * 2),100vw);}` +
      `${width("read")}{width:min(clamp(${opts.reading},45vw,calc(${opts.reading} * 1.5)),100vw);}` +
      `@media ${maxWidth("sm")}{${ws}{grid-template-columns:0 max-content;scroll-snap-type:x mandatory;}.${p}-pinned{border-right-width:0;}${ws}[data-${p}-programmatic-scroll]{scroll-snap-type:none;}.${p}-menu,${col}{scroll-snap-align:start;scroll-snap-stop:always;}}` +
      `@media (prefers-reduced-motion:reduce){.${p}-menu{transition:none;}}`
    );
  };
