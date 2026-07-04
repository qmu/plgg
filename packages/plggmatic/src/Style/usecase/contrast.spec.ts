import {
  test,
  check,
  all,
  toBeGreaterThanOrEqual,
} from "plgg-test";
import {
  type Color,
  colorHex,
} from "plggmatic/Style/model/token";
import { schemes } from "plggmatic/Style/model/scheme";

// The accessibility gate, computed — not asserted by
// eye. Every foreground text role must clear WCAG 2.2 AA
// normal-text contrast (>= 4.5:1) against every surface
// it is used on, in BOTH schemes, or this spec fails and
// the ticket cannot be approved. The math is the WCAG
// 2.x relative-luminance / contrast-ratio formula.

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

// Each meaningful foreground/background pairing the seed
// promises. `[text-role, surface-role]`.
const PAIRS: ReadonlyArray<
  readonly [Color, Color]
> = [
  ["text", "surface"],
  ["text", "surface-2"],
  ["muted", "surface"],
  ["muted", "surface-2"],
  ["danger", "surface"],
  ["danger", "surface-2"],
  ["primary-text", "primary"],
];

const AA_NORMAL = 4.5;

test("every text/surface pair clears WCAG AA", () =>
  all(
    schemes.flatMap((scheme) =>
      PAIRS.map(([fg, bg]) =>
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
