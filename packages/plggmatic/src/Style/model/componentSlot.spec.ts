import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  componentSlots,
  slotSelector,
} from "plggmatic/Style/model/componentSlot";
import { defaultTheme } from "plggmatic/Style/model/theme";

const sel = slotSelector(defaultTheme);

test("every declared slot resolves to a pm-prefixed selector", () =>
  all(
    componentSlots.map((slot) =>
      check(
        sel(slot).startsWith(".pm-"),
        toBe(true),
      ),
    ),
  ));

test("compound slots reference the framework class on both sides", () =>
  all([
    check(
      sel("colHeadTitle"),
      toBe(".pm-colhead .pm-colhead-title"),
    ),
    check(
      sel("listItemAdjacent"),
      toBe(".pm-list-item+.pm-list-item"),
    ),
    check(
      sel("colHasQuery"),
      toBe(".pm-col:has(.pm-query)"),
    ),
  ]));

test("the selector namespace follows the theme prefix", () =>
  check(
    slotSelector({
      ...defaultTheme,
      prefix: "vp",
    })("list"),
    toBe(".vp-list"),
  ));
