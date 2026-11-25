import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Option, some, none } from "plgg";
import {
  type TrailResolver,
  resolveTrail,
  settledTrail,
  foldTrail,
  stepFrom,
  restep,
} from "plggmatic/Navigate/model/Trail";

// A column that names itself and the steps it offers.
type Col = Readonly<{
  name: string;
  offers: ReadonlyArray<string>;
}>;
const cols: ReadonlyArray<Col> = [
  { name: "menu", offers: ["Lnodes", "Lpeople"] },
  { name: "Lnodes", offers: ["Sa", "Sb"] },
  { name: "Lpeople", offers: [] },
  { name: "Sa", offers: ["Rjobs"] },
  { name: "Sb", offers: [] },
  { name: "Rjobs", offers: [] },
];
const named = (name: string): Option<Col> => {
  const found = cols.find((c) => c.name === name);
  return found === undefined
    ? none()
    : some(found);
};
const resolver: TrailResolver<Col> = {
  root: () => ({
    name: "menu",
    offers: ["Lnodes", "Lpeople"],
  }),
  resolve: (previous, step) =>
    previous.offers.includes(step)
      ? named(step)
      : none(),
};
const names = (trail: ReadonlyArray<string>) =>
  resolveTrail(resolver)(trail)
    .map((c) => c.column.name)
    .join(" > ");

test("the empty trail is the root alone, and every step offered adds its column", () =>
  all([
    check(names([]), toBe("menu")),
    check(
      names(["Lnodes", "Sa", "Rjobs"]),
      toBe("menu > Lnodes > Sa > Rjobs"),
    ),
  ]));

test("the first step a column does not offer ends the walk; the prefix stands", () =>
  all([
    // Sb is real, but Sa does not offer it
    check(
      names(["Lnodes", "Sa", "Sb", "Rjobs"]),
      toBe("menu > Lnodes > Sa"),
    ),
    check(
      names(["nope", "Lnodes"]),
      toBe("menu"),
    ),
    check(
      settledTrail(
        resolveTrail(resolver)([
          "Lnodes",
          "Sa",
          "Sb",
        ]),
      ).join("."),
      toBe("Lnodes.Sa"),
    ),
  ]));

test("each column carries the trail that reaches it", () =>
  check(
    resolveTrail(resolver)(["Lnodes", "Sa"])
      .map((c) => c.prefix.join("."))
      .join("|"),
    toBe("|Lnodes|Lnodes.Sa"),
  ));

test("folding keeps the columns up to one; a step from a column replaces what lay to its right", () =>
  all([
    check(
      foldTrail(["a", "b", "c"], 1).join("."),
      toBe("a"),
    ),
    check(
      foldTrail(["a", "b"], 0).length,
      toBe(0),
    ),
    check(
      foldTrail(["a", "b"], -3).length,
      toBe(0),
    ),
    check(
      stepFrom(["a", "b", "c"], 1, "x").join("."),
      toBe("a.x"),
    ),
    check(
      stepFrom([], 0, "x").join("."),
      toBe("x"),
    ),
  ]));

test("restep exchanges one step in place and keeps the rest", () =>
  check(
    restep(
      ["Lnodes", "Sa", "Rjobs"],
      0,
      "Lnodes_vuptime",
    ).join("."),
    toBe("Lnodes_vuptime.Sa.Rjobs"),
  ));
