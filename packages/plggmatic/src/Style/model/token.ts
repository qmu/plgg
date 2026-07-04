import { type SoftStr } from "plgg";
import { type Scheme } from "plggmatic/Style/model/scheme";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The closed color-role vocabulary. Because it is a
 * union (not a free string) an unknown role like
 * `bg("blurple")` is a compile error — the type-driven
 * win over stringly CSS classes. This is a deliberate
 * *seed*, not a catalog (emergent-design-system): each
 * role earns its place from a concrete consumer in the
 * pane (20260703144035) and component (20260703144036)
 * tickets, and later roles arrive one-per-component.
 *
 * Roles and their consumers:
 * - `surface` — the page/pane background prose sits on
 * - `surface-2` — a secondary panel (code block, table
 *   header, sunken rail) distinct from `surface`
 * - `primary` — the accent fill (primary button, active
 *   marker)
 * - `primary-text` — the label that sits ON `primary`
 * - `text` — default body/heading ink on `surface`
 * - `muted` — secondary ink (captions, metadata); still
 *   meets AA on both surfaces (not decoration-only)
 * - `border` — hairline dividers and pane edges
 * - `danger` — error text and destructive affordances
 */
export type Color =
  | "surface"
  | "surface-2"
  | "primary"
  | "primary-text"
  | "text"
  | "muted"
  | "border"
  | "danger";

/**
 * Every {@link Color}, for specs and the scheme emitter
 * to iterate without re-listing the union. Kept in sync
 * with {@link Color} by the exhaustiveness spec: a role
 * added to the union but missing here (or vice versa) is
 * caught there.
 */
export const colors: ReadonlyArray<Color> = [
  "surface",
  "surface-2",
  "primary",
  "primary-text",
  "text",
  "muted",
  "border",
  "danger",
];

/**
 * The concrete hex for every role in every scheme. The
 * `Record<Scheme, Record<Color, SoftStr>>` shape makes
 * this exhaustive twice over: a missing scheme or a
 * missing role is a `tsc` error, so the palette can
 * never ship a hole. Literal color values live ONLY
 * here — every atom resolves through {@link colorVar}
 * (a `var(--pm-*)` reference), so this map is the single
 * place a scheme's values are defined and the scheme CSS
 * emitter's only source.
 *
 * Values are a warm editorial palette (ink on cream in
 * light, warm off-white on near-black in dark), adopted
 * from the plgg-view seed and tuned so every text/surface
 * pairing clears WCAG 2.2 AA (see the contrast spec):
 * - `muted` is darker than plgg-view's decorative gray so
 *   secondary text meets 4.5:1 on `surface-2`, not just
 *   the 3:1 large-text floor.
 * - the `primary`/`primary-text` button pair is held
 *   constant across schemes (a stable brand affordance),
 *   so its 6:1 label contrast holds in both.
 * - dark `danger` is lightened to a coral so error text
 *   stays legible on the near-black surfaces.
 */
const PALETTE: Record<
  Scheme,
  Record<Color, SoftStr>
> = {
  light: {
    surface: "#fffdf7",
    "surface-2": "#f0e9d8",
    primary: "#1f6b54",
    "primary-text": "#fbfaf3",
    text: "#2a241d",
    muted: "#6b6459",
    border: "#e6dcc8",
    danger: "#b23a2a",
  },
  dark: {
    surface: "#1c1a17",
    "surface-2": "#262320",
    primary: "#1f6b54",
    "primary-text": "#fbfaf3",
    text: "#ece7dd",
    muted: "#a39a8a",
    border: "#38332b",
    danger: "#ec8175",
  },
};

/**
 * A role's literal hex in a given scheme. Consumed by
 * the scheme CSS emitter and the contrast spec; runtime
 * code and atoms use {@link colorVar} instead so a single
 * `dark` class reswitches everything.
 */
export const colorHex = (
  scheme: Scheme,
  c: Color,
): SoftStr => PALETTE[scheme][c];

/**
 * The `var(--pm-<role>)` reference for a role — what
 * every color atom emits, so the value is resolved by
 * the active scheme's custom properties at paint time
 * rather than baked in. The `pm` namespace comes from
 * {@link cssPrefix}, keeping framework variables from
 * colliding with an app's own.
 */
export const colorVar = (c: Color): SoftStr =>
  `var(--${cssPrefix}-${c})`;
