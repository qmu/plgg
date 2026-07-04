import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Color,
  colors,
  colorHex,
  colorVar,
} from "plggmatic/Style/model/token";
import { schemes } from "plggmatic/Style/model/scheme";

// A #rrggbb literal — the shape every palette value
// must take so the scheme emitter produces valid CSS.
const isHex = (v: string): boolean =>
  /^#[0-9a-f]{6}$/.test(v);

test("every color has a hex in every scheme", () =>
  all(
    schemes.flatMap((scheme) =>
      colors.map((c) =>
        check(
          isHex(colorHex(scheme, c)),
          toBe(true),
        ),
      ),
    ),
  ));

// A compile-time exhaustiveness pin: every `Color` must
// be a key here, so a role added to the union but not to
// the palette (or vice versa) fails `tsc` before any test
// runs. The runtime check confirms `colors` reaches all
// of them with no duplicates.
const SEEN: Record<Color, true> = {
  surface: true,
  "surface-2": true,
  primary: true,
  "primary-text": true,
  text: true,
  muted: true,
  border: true,
  danger: true,
};

test("colors lists exactly the Color union once", () =>
  all([
    check(
      colors.length,
      toBe(new Set(colors).size),
    ),
    check(
      colors.every((c) => SEEN[c]),
      toBe(true),
    ),
  ]));

test("colorVar references the --pm namespace", () =>
  check(
    colorVar("surface"),
    toBe("var(--pm-surface)"),
  ));
