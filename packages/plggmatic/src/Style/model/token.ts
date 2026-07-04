import { type SoftStr } from "plgg";
import { type Scheme } from "plggmatic/Style/model/scheme";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The closed color vocabulary. Because it is a union (not
 * a free string) an unknown role like `bg("blurple")`, or
 * a bare `bg("primary")` without a variant, is a compile
 * error — the type-driven win over stringly CSS classes.
 *
 * Per D9 (roadmap 2026-07-04,
 * `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`)
 * the vocabulary is a MATRIX: five semantic roles ×
 * four variants (20 tokens), plus a five-member neutral
 * scale (25 tokens total), assembled from the exported
 * {@link SemanticRole}/{@link Variant}/{@link Neutral}
 * unions so the shape stays closed and adding a role
 * later is a single union-member edit whose fallout
 * (`colors`, `PALETTE`, the exhaustiveness pin, the
 * contrast pairs) is driven entirely by `tsc`.
 *
 * DOCTRINE (amended by D9): `token.ts` was originally a
 * deliberate *seed*, not a catalog — each role earned its
 * place from a concrete consumer. D9 fixes the role×variant
 * *shape* up front as roadmap vocabulary, so the
 * earned-place rule now applies one tier up: new ROLES
 * (secondary/tertiary) are still earned by a concrete
 * consumer and are deliberately NOT shipped yet.
 *
 * Variant semantics:
 * - `base` — the solid accent fill (button, active marker).
 *   Its on-fill label is the neutral `surface` token
 *   (inverted per scheme — exactly the qmu oracle's
 *   `--vp-hover`/`--vp-hover-ink` pair).
 * - `text` — the role's ink used as foreground on the
 *   neutral surfaces AND on the role's own `surface`.
 * - `surface` — the role-tinted panel background (a
 *   callout body).
 * - `border` — the role's edge hue (WCAG 1.4.11 non-text).
 *
 * Neutral scale:
 * - `surface` — the page/pane background prose sits on
 * - `surface-2` — a secondary panel (code block, table
 *   header, sunken rail) distinct from `surface`
 * - `text` — default body/heading ink on `surface`
 * - `muted` — secondary ink (captions, metadata); still
 *   meets AA on both surfaces (not decoration-only)
 * - `border` — hairline dividers and pane edges
 */
export type SemanticRole =
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info";

export type Variant =
  | "base"
  | "text"
  | "surface"
  | "border";

export type Neutral =
  | "surface"
  | "surface-2"
  | "text"
  | "muted"
  | "border";

export type Color =
  | `${SemanticRole}-${Variant}`
  | Neutral;

export const semanticRoles: ReadonlyArray<SemanticRole> =
  [
    "primary",
    "success",
    "danger",
    "warning",
    "info",
  ];

export const variants: ReadonlyArray<Variant> = [
  "base",
  "text",
  "surface",
  "border",
];

export const neutrals: ReadonlyArray<Neutral> = [
  "surface",
  "surface-2",
  "text",
  "muted",
  "border",
];

/**
 * Every {@link Color}, DERIVED from the unions so the list
 * can never drift from the type. The scheme emitter and
 * specs iterate this; the exhaustiveness spin in
 * `token.spec.ts` pins it to the union at compile time.
 */
export const colors: ReadonlyArray<Color> = [
  ...semanticRoles.flatMap(
    (r): ReadonlyArray<Color> =>
      variants.map((v): Color => `${r}-${v}`),
  ),
  ...neutrals,
];

/**
 * The concrete hex for every token in every scheme. The
 * `Record<Scheme, Record<Color, SoftStr>>` shape makes
 * this exhaustive twice over: a missing scheme or a
 * missing token is a `tsc` error, so the palette can never
 * ship a hole. Literal color values live ONLY here — every
 * atom resolves through {@link colorVar}.
 *
 * The default is MONOCHROME (D9): the qmu.co.jp oracle port
 * carried in `plggpress/src/theme/baseCss.ts` — black
 * `#111111` on white `#ffffff` in light, near-white on
 * near-black in dark. The dark neutral inks are the
 * oracle's translucent whites flattened over the dark
 * `surface` (single solid hex is required by the hex-shape
 * spec and the emitter): text `rgba(240,240,245,.92)` →
 * `#dfdfe4`, muted `rgba(235,235,245,.55)` → `#8d8d95`,
 * brand `rgba(255,255,255,.95)` → `#f4f4f4`. Semantic
 * surfaces/inks are seeded from the oracle callout hues;
 * `base`/`border` tiers are chosen so the on-base label
 * and the 3:1 border floor clear AA (the contrast spec is
 * the arbiter). `info` has no oracle value (plggpress
 * renders info in brand) — a provisional blue family,
 * flagged as the one non-oracle role.
 */
const PALETTE: Record<
  Scheme,
  Record<Color, SoftStr>
> = {
  light: {
    surface: "#ffffff",
    "surface-2": "#f6f6f7",
    text: "#1f1f22",
    muted: "#5b5b61",
    border: "#ededee",
    "primary-base": "#111111",
    "primary-text": "#111111",
    "primary-surface": "#f6f6f7",
    "primary-border": "#767679",
    "success-base": "#047857",
    "success-text": "#065f46",
    "success-surface": "#ecfdf5",
    "success-border": "#059669",
    "danger-base": "#b91c1c",
    "danger-text": "#991b1b",
    "danger-surface": "#fef2f2",
    "danger-border": "#dc2626",
    "warning-base": "#92400e",
    "warning-text": "#78350f",
    "warning-surface": "#fffbeb",
    "warning-border": "#b45309",
    "info-base": "#1d4ed8",
    "info-text": "#1e40af",
    "info-surface": "#eff6ff",
    "info-border": "#2563eb",
  },
  dark: {
    surface: "#1b1b1f",
    "surface-2": "#202127",
    text: "#dfdfe4",
    muted: "#8d8d95",
    border: "#262629",
    "primary-base": "#f4f4f4",
    "primary-text": "#f4f4f4",
    "primary-surface": "#202127",
    "primary-border": "#8a8a90",
    "success-base": "#34d399",
    "success-text": "#34d399",
    "success-surface": "#022c22",
    "success-border": "#34d399",
    "danger-base": "#f87171",
    "danger-text": "#f87171",
    "danger-surface": "#450a0a",
    "danger-border": "#f87171",
    "warning-base": "#fbbf24",
    "warning-text": "#fbbf24",
    "warning-surface": "#451a03",
    "warning-border": "#fbbf24",
    "info-base": "#60a5fa",
    "info-text": "#60a5fa",
    "info-surface": "#172554",
    "info-border": "#60a5fa",
  },
};

/**
 * A token's literal hex in a given scheme. Consumed by the
 * scheme CSS emitter and the contrast spec; runtime code
 * and atoms use {@link colorVar} instead so a single `dark`
 * class reswitches everything.
 */
export const colorHex = (
  scheme: Scheme,
  c: Color,
): SoftStr => PALETTE[scheme][c];

/**
 * The `var(--pm-<token>)` reference for a token — what
 * every color atom emits, so the value is resolved by the
 * active scheme's custom properties at paint time rather
 * than baked in. The `pm` namespace comes from
 * {@link cssPrefix}.
 */
export const colorVar = (c: Color): SoftStr =>
  `var(--${cssPrefix}-${c})`;
