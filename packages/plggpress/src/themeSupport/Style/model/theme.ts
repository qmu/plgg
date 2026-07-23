import { type SoftStr } from "plgg";
import { cssPrefix } from "plggpress/themeSupport/Meta/model/identity";
import {
  type Palette,
  defaultPalette,
} from "plggpress/themeSupport/Style/model/palette";
import {
  type Metric,
  metricTable,
} from "plggpress/themeSupport/Style/model/metric";
import {
  type TypeRole,
  type TypeScale,
  typeScale,
} from "plggpress/themeSupport/Style/model/typography";
import { type Scheme } from "plggpress/themeSupport/Style/model/scheme";
import {
  type SyntaxKind,
  syntaxPalette,
} from "plggpress/themeSupport/Style/model/syntax";
import { type HexColor } from "plggpress/themeSupport/Style/model/hexColor";
import {
  type ZBand,
  zBandTable,
} from "plggpress/themeSupport/Style/model/zIndex";
import { appearanceStorageKey } from "plggpress/themeSupport/Style/model/appearance";

/**
 * The design language as a single closed record — the
 * empty-shell answer of the `plggmatic-extraction-cut`
 * trip (ticket A3). Every value the CSS emitters and color
 * atoms used to close over as a module constant is now a
 * field here, so a consumer supplies its inputs explicitly
 * instead of the engine baking one brand in:
 *
 * - `prefix`     — the custom-property namespace
 *   (`--<prefix>-*`); `pm` by default. `colorVar`/
 *   `metricVar`/the emitters read it, so the emitted block
 *   and the atoms that reference it agree by construction.
 * - `palette`    — every color token's hex, per scheme
 *   (the `schemeCss` source; the override API's target).
 * - `metrics`    — the shell-geometry lengths (`metricCss`).
 * - `typeScale`  — the prose type roles.
 * - `syntax`     — the code-token palette (`syntaxCss`).
 * - `zBands`     — the stacking-band integers.
 * - `storageKey` — the appearance persistence key
 *   (`vp-appearance` by default — a visitor's saved scheme
 *   must survive the extraction, D16).
 *
 * A widened or missing field is a `tsc` error — no `as`,
 * no `any`. `plggpress/themeSupport` ships {@link defaultTheme} (values =
 * today's monochrome `--pm-*` design language) so the
 * engine has a brand-neutral default; `plggmatic` owns the
 * BRANDED instance and the palette-override API layered
 * over this contract.
 */
export type Theme = Readonly<{
  prefix: SoftStr;
  palette: Palette;
  metrics: Record<Metric, SoftStr>;
  typeScale: Record<TypeRole, TypeScale>;
  syntax: Record<
    Scheme,
    Record<SyntaxKind, HexColor>
  >;
  zBands: Record<ZBand, number>;
  storageKey: SoftStr;
}>;

/**
 * The neutral default `Theme`: the monochrome `--pm-*`
 * design language `plggpress/themeSupport` shipped before parameterization
 * (prefix `pm`, the oracle palette, `vp-appearance`), so
 * passing `defaultTheme` to the emitters reproduces the old
 * output byte-for-byte (D3/D16). `plggmatic` re-brands this
 * as Pragmatic's; `plggpress` passes it at its composition
 * root and may diverge later.
 */
export const defaultTheme: Theme = {
  prefix: cssPrefix,
  palette: defaultPalette,
  metrics: metricTable,
  typeScale: typeScale,
  syntax: syntaxPalette,
  zBands: zBandTable,
  storageKey: appearanceStorageKey,
};
