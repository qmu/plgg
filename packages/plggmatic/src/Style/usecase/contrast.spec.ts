import {
  test,
  check,
  all,
  toBe,
  toBeGreaterThanOrEqual,
} from "plgg-test";
import {
  type Color,
  colors,
  semanticRoles,
  colorHex,
} from "plggmatic/Style/model/token";
import { schemes } from "plggmatic/Style/model/scheme";

// The accessibility gate, COMPUTED — not asserted by eye.
// This is the roadmap's phase-1 gate (D9): every text
// pairing clears WCAG 2.2 AA normal-text contrast
// (>= 4.5:1) and every semantic-role border clears the
// 1.4.11 non-text floor (>= 3:1), in BOTH schemes, across
// the full role×variant matrix, or this spec fails and the
// ticket cannot be approved. The math is the WCAG 2.x
// relative-luminance / contrast-ratio formula.

const channel = (b: number): number => {
  const s = b / 255;
  return s <= 0.03928
    ? s / 12.92
    : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channel(r) +
    0.7152 * channel(g) +
    0.0722 * channel(b)
  );
};

const contrast = (
  fg: string,
  bg: string,
): number => {
  const a = luminance(fg) + 0.05;
  const b = luminance(bg) + 0.05;
  return a > b ? a / b : b / a;
};

const pair = (
  fg: Color,
  bg: Color,
): readonly [Color, Color] => [fg, bg];

// Normal-text pairings (>= 4.5:1). Neutrals: body/secondary
// ink on both surfaces. Per role: the role ink on the two
// neutral surfaces and on the role's own tinted surface,
// plus the on-base label (the neutral `surface` token on
// the role's solid fill — the inverted-pill affordance).
const TEXT_PAIRS: ReadonlyArray<
  readonly [Color, Color]
> = [
  pair("text", "surface"),
  pair("text", "surface-2"),
  pair("muted", "surface"),
  pair("muted", "surface-2"),
  ...semanticRoles.flatMap((r) => [
    pair(`${r}-text`, "surface"),
    pair(`${r}-text`, "surface-2"),
    pair(`${r}-text`, `${r}-surface`),
    pair("surface", `${r}-base`),
  ]),
];

// Non-text pairings (>= 3:1): each semantic role's edge hue
// against both neutral surfaces (WCAG 1.4.11).
const BORDER_PAIRS: ReadonlyArray<
  readonly [Color, Color]
> = semanticRoles.flatMap((r) => [
  pair(`${r}-border`, "surface"),
  pair(`${r}-border`, "surface-2"),
]);

const AA_NORMAL = 4.5;
const AA_NON_TEXT = 3.0;

test("every text pairing clears WCAG AA (>=4.5:1) in both schemes", () =>
  all(
    schemes.flatMap((scheme) =>
      TEXT_PAIRS.map(([fg, bg]) =>
        check(
          contrast(
            colorHex(scheme, fg),
            colorHex(scheme, bg),
          ),
          toBeGreaterThanOrEqual(AA_NORMAL),
        ),
      ),
    ),
  ));

test("every semantic border clears the non-text floor (>=3:1) in both schemes", () =>
  all(
    schemes.flatMap((scheme) =>
      BORDER_PAIRS.map(([fg, bg]) =>
        check(
          contrast(
            colorHex(scheme, fg),
            colorHex(scheme, bg),
          ),
          toBeGreaterThanOrEqual(AA_NON_TEXT),
        ),
      ),
    ),
  ));

// Coverage: every color token appears in at least one
// asserted pairing — EXCEPT the neutral `border`, the sole
// decorative hairline divider, whose legibility is not a
// contrast requirement (it is verified to be EMITTED by
// schemeCss.spec, not gated for ratio here).
test("every token except the neutral hairline is contrast-gated", () => {
  const covered = new Set<Color>();
  [...TEXT_PAIRS, ...BORDER_PAIRS].forEach(
    ([fg, bg]) => {
      covered.add(fg);
      covered.add(bg);
    },
  );
  return check(
    colors
      .filter((c) => c !== "border")
      .every((c) => covered.has(c)),
    toBe(true),
  );
});
