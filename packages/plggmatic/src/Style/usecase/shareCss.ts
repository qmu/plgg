import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";

/**
 * One step of a strip's capacity: from `min` up, the
 * window holds `columns` document columns side by side.
 */
export type ShareStep = Readonly<{
  min: SoftStr;
  columns: number;
}>;

/**
 * How many document columns a window holds at once. Below
 * the first step it holds one. Listed narrowest first.
 */
export type ShareOptions = Readonly<{
  steps: ReadonlyArray<ShareStep>;
}>;

/**
 * Two columns from 960px, three from 1760px. A column
 * under about 480px is too narrow to read a page in, and a
 * strip that shows three at 1280 shows three of those.
 */
export const shareOptions: ShareOptions = {
  steps: [
    { min: "960px", columns: 2 },
    { min: "1760px", columns: 3 },
  ],
};

/**
 * The SHARED STRIP as a declared framework capability: the
 * open document columns divide the room between them, up
 * to what the window can hold.
 *
 * The room is the strip's own width less whatever is
 * pinned over it (a sticky sidebar), which the host
 * publishes as `--<p>-share-inset`. The capacity `n` is
 * the window's, from {@link ShareOptions.steps}. Each
 * column's basis is one `n`-th of the room and it may
 * grow but never shrink, so:
 *
 * - one column alone fills the room;
 * - `n` columns stand exactly side by side;
 * - a column past `n` does not squeeze the others — the
 *   strip scrolls, a column at a time.
 *
 * A column marked `.<p>-span-2` takes two columns' worth
 * (never more than the room): a page that is one large
 * figure wants the width two pages of prose would share.
 *
 * Applies to the columns (`[data-<p>-column]`) of a strip
 * carrying `.<p>-share`. Escape-safe (no `<`, `>`, `&`).
 */
export const shareCss =
  (theme: Theme) =>
  (opts: ShareOptions): SoftStr => {
    const p = theme.prefix;
    const n = `--${p}-share-n`;
    const room = `(100% - var(--${p}-share-inset,0px))`;
    const col = `.${p}-share [data-${p}-column]`;
    return (
      `.${p}-share{${n}:1;}` +
      opts.steps
        .map(
          (step: ShareStep): SoftStr =>
            `@media (min-width:${step.min}){.${p}-share{${n}:${step.columns};}}`,
        )
        .join("") +
      `${col}{flex:1 0 calc(${room} / var(${n}));width:auto;min-width:0;}` +
      `${col}.${p}-span-2{flex-basis:min(${room},calc(${room} / var(${n}) * 2));}`
    );
  };
