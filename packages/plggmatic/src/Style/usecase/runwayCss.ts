import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { minWidth } from "plggmatic/Style/model/breakpoint";

/**
 * The parameters of a runway: the column {@link gap} (also
 * the width the trailing spacer leaves for the gap after the
 * last column) and the {@link lastFallback} width used until
 * the advance effect has measured the real last column.
 */
export type RunwayOptions = Readonly<{
  gap: SoftStr;
  lastFallback: SoftStr;
}>;

/**
 * The UNBOUNDED-DEPTH HORIZONTAL RUNWAY as a declared
 * framework capability.
 *
 * The framework's own multi-column chrome ({@link chromeCss})
 * only scrolls the strip BELOW the `snap` breakpoint — above
 * it a column strip is expected to fit, so the row is
 * `overflow:hidden`. An app whose column recursion is
 * UNBOUNDED (the reference's central claim: the strip
 * expanding rightward with the body/top-bar width invariant,
 * "depth does not consume the viewport") needs the strip to
 * scroll at EVERY width, plus a trailing runway so the last —
 * content-width — column can still slide to the left edge.
 * The reference used to hand-write this as app-owned `pm-row`
 * overrides; it is now this capability, which the reference
 * merely enables.
 *
 * Emitted (in the theme's namespace, `pm` by default):
 * - `.<p>-row` scrolls horizontally at every width, laid out
 *   to fill its flex parent, its gap published as an internal
 *   `--<p>-runway-gap` custom property; and
 * - a `min-width:snap` trailing `::after` FLEX SPACER (never
 *   a margin — unreliably counted in a flex scroll container's
 *   scroll width) sized `calc(100% - <last> - <gap>)`, one
 *   column short of the strip so the last column rests at the
 *   left edge with the runway filling the rest. `<last>` is
 *   read from `--<p>-runway-last`, which {@link advanceColumns}
 *   publishes from its measurement, falling back to
 *   {@link RunwayOptions.lastFallback} until the first paint
 *   measures it.
 *
 * Escape-safe (no `<`,`>`,`&`) and injected AFTER
 * {@link chromeCss} so the every-width scroll wins the
 * cascade over the framework's above-`snap` `overflow:hidden`
 * at equal specificity. Curried `runwayCss(theme)(opts)`.
 */
export const runwayCss =
  (theme: Theme) =>
  (opts: RunwayOptions): SoftStr => {
    const p = theme.prefix;
    const gapVar = `--${p}-runway-gap`;
    const lastVar = `--${p}-runway-last`;
    return (
      `.${p}-row{${gapVar}:${opts.gap};flex:1;min-height:0;height:auto;gap:var(${gapVar});overflow-x:auto;overflow-y:hidden;}` +
      `@media ${minWidth("snap")}{.${p}-row::after{content:"";flex:0 0 calc(100% - var(${lastVar},${opts.lastFallback}) - var(${gapVar}));}}`
    );
  };
