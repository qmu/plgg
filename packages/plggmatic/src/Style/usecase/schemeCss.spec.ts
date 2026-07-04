import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { schemeCss } from "plggmatic/Style/usecase/schemeCss";
import { colors } from "plggmatic/Style/model/token";
import { schemes } from "plggmatic/Style/model/scheme";

// The emitter maps over `colors`, so it emits every token
// for every scheme with no per-token logic. These specs
// pin that: the full matrix + neutral scale is present
// (including the decorative `--pm-border` the contrast
// spec leaves un-gated), and the block stays escape-safe so
// it survives an SSR text escaper byte-for-byte.

const count = (
  hay: string,
  needle: string,
): number => hay.split(needle).length - 1;

test("emits exactly schemes × colors custom-property declarations", () =>
  check(
    count(schemeCss, "--pm-"),
    toBe(schemes.length * colors.length),
  ));

test("emits the matrix and neutral tokens explicitly", () =>
  all([
    check(
      schemeCss.includes("--pm-primary-base:"),
      toBe(true),
    ),
    check(
      schemeCss.includes("--pm-info-surface:"),
      toBe(true),
    ),
    check(
      schemeCss.includes("--pm-border:"),
      toBe(true),
    ),
  ]));

test("scheme CSS is escape-safe (no <, >, &)", () =>
  all([
    check(schemeCss.includes("<"), toBe(false)),
    check(schemeCss.includes(">"), toBe(false)),
    check(schemeCss.includes("&"), toBe(false)),
  ]));
