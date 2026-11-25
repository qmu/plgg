import { type SoftStr } from "plgg";
import { cssVar } from "plggmatic/Meta/model/classHooks";

/**
 * The lengths a strip is laid out by, in CSS pixels. A
 * menu and a column each have a width they would like and
 * a share of the window they may not exceed; a pinned
 * panel (a chat, an assistant) has a floor it is never
 * squeezed below; under `phone` the window holds one thing
 * at a time, so the menu and a column are each as wide as
 * the window.
 */
export type StripMetrics = Readonly<{
  menu: number;
  menuShare: number;
  column: number;
  columnShare: number;
  floor: number;
  phone: number;
}>;

/**
 * The numbers two products arrived at separately and
 * identically (corpd, coop-planner): a 220px menu up to
 * 40% of the window, a 320px column up to 60%, a 320px
 * floor for the pinned panel, one-at-a-time under 640px.
 */
export const stripMetrics: StripMetrics = {
  menu: 220,
  menuShare: 0.4,
  column: 320,
  columnShare: 0.6,
  floor: 320,
  phone: 640,
};

/**
 * What the menu is doing. `closed` reserves no track;
 * `open` takes the metric width; a number is a width given
 * outright — a collapsed rail, or the menu part way
 * through opening.
 */
export type MenuTrack =
  | "closed"
  | "open"
  | number;

/**
 * Where everything stands for one window width and one
 * scroll position:
 *
 * - `menu`, `column` — the widths in force;
 * - `track` — the window less the menu: what the pinned
 *   panel and the columns share;
 * - `floor` — the least the pinned panel is given;
 * - `width` — the pinned panel's width now: the whole
 *   track at rest, yielding to the columns as the strip
 *   scrolls, never under `floor`;
 * - `seam` — the spacer after the last column that lets it
 *   come to rest beside the panel at its floor;
 * - `layoutMinimum` — the window less the floor: the room
 *   the columns can ever have.
 */
export type StripGeometry = Readonly<{
  menu: number;
  column: number;
  track: number;
  floor: number;
  seam: number;
  layoutMinimum: number;
  width: number;
}>;

/**
 * The geometry of a strip beside a pinned panel. Pure: the
 * window width and the strip's scroll offset in, lengths
 * out. Nothing here reads the document, so the same call
 * serves a render, a test and a server.
 */
export const stripGeometry =
  (metrics: StripMetrics) =>
  (
    viewport: number,
    scroll: number,
    menuTrack: MenuTrack,
  ): StripGeometry => {
    const narrow = viewport < metrics.phone;
    const menu =
      menuTrack === "closed"
        ? 0
        : narrow
          ? viewport
          : menuTrack === "open"
            ? Math.min(
                metrics.menu,
                viewport * metrics.menuShare,
              )
            : menuTrack;
    const column = narrow
      ? viewport
      : Math.min(
          metrics.column,
          viewport * metrics.columnShare,
        );
    const track = viewport - menu;
    const floor = Math.min(
      metrics.floor,
      viewport - column,
    );
    return {
      menu,
      column,
      track,
      floor,
      seam: Math.max(
        0,
        viewport - floor - column,
      ),
      layoutMinimum: viewport - floor,
      width: Math.max(
        floor,
        track - Math.max(0, scroll),
      ),
    };
  };

/**
 * The custom properties a stylesheet reads the geometry
 * through, named once here so a host's CSS and its inline
 * style cannot spell them differently.
 */
export const stripVar = {
  track: cssVar("strip-track"),
  width: cssVar("strip-panel"),
  menu: cssVar("strip-menu"),
  column: cssVar("strip-column"),
  layoutMinimum: cssVar("strip-minimum"),
  seam: cssVar("strip-seam"),
} satisfies Record<string, SoftStr>;

/**
 * The geometry as one inline `style` value: each length on
 * its custom property, in pixels.
 */
export const stripStyle = (
  g: StripGeometry,
): SoftStr =>
  [
    `${stripVar.track}:${g.track}px`,
    `${stripVar.width}:${g.width}px`,
    `${stripVar.menu}:${g.menu}px`,
    `${stripVar.column}:${g.column}px`,
    `${stripVar.layoutMinimum}:${g.layoutMinimum}px`,
    `${stripVar.seam}:${g.seam}px`,
  ].join(";");

/**
 * The first column to show when only whole columns may
 * stand beside the pinned panels: counting back from the
 * last column while the next one still fits in what
 * `pinned` leaves of the window. The last column always
 * shows, however wide.
 */
export const visibleColumnStart = (
  widths: ReadonlyArray<number>,
  viewport: number,
  pinned: number,
): number => {
  const back = (
    start: number,
    used: number,
  ): number => {
    const before = widths[start - 1];
    return start > 0 &&
      before !== undefined &&
      used + before <= viewport - pinned
      ? back(start - 1, used + before)
      : start;
  };
  const last = Math.max(0, widths.length - 1);
  return back(last, widths[last] ?? 0);
};

/**
 * A remembered scroll offset, held to what the strip can
 * still reach: going back in history returns the reader to
 * where they were, unless the strip is now too short.
 */
export const reachableScroll = (
  left: number,
  scrollWidth: number,
  clientWidth: number,
): number =>
  Math.max(
    0,
    Math.min(
      left,
      Math.max(0, scrollWidth - clientWidth),
    ),
  );
