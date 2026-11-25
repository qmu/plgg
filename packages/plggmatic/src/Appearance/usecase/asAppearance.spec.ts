import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  monochrome,
  soft,
} from "plggmatic/Appearance/model/appearance";
import { asAppearance } from "plggmatic/Appearance/usecase/asAppearance";

test("an appearance is validated whole: every decision present, colours by role", () =>
  all([
    check(
      isOk(asAppearance(monochrome)),
      toBe(true),
    ),
    check(isOk(asAppearance(soft)), toBe(true)),
    // derived from the default by naming what changes
    check(
      isOk(
        asAppearance({
          ...monochrome,
          name: "rounder",
          radius: "6px",
        }),
      ),
      toBe(true),
    ),
    // a literal colour is not a role
    check(
      isErr(
        asAppearance({
          ...monochrome,
          rule: "#000",
        }),
      ),
      toBe(true),
    ),
    // a decision left out is refused
    check(
      isErr(asAppearance({ name: "empty" })),
      toBe(true),
    ),
  ]));
