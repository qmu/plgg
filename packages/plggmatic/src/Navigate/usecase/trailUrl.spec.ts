import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none } from "plgg";
import {
  type StepCodec,
  encodeTrail,
  decodeTrail,
  trailQuery,
  printSteps,
  parseSteps,
} from "plggmatic/Navigate/usecase/trailUrl";

// The spelling corpd's `ui/src/route.ts` has used since
// before this module (its `trailOf`, and its `stepsOf`
// without the product's own legacy rewrites), copied here
// as the reference the framework's format must equal: corpd
// is the first product this format returns to, and its
// addresses are already in bookmarks.
const corpdTrailOf = (
  steps: ReadonlyArray<string>,
): string =>
  steps
    .map((s) =>
      encodeURIComponent(s).replace(/\./g, "%2E"),
    )
    .join(".");
const corpdDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
const corpdStepsOf = (
  x: string,
): ReadonlyArray<string> =>
  x
    .split(".")
    .filter((s) => s !== "")
    .map(corpdDecode);

const trails: ReadonlyArray<
  ReadonlyArray<string>
> = [
  [],
  ["Lnodes"],
  ["Lsettings", "Lnodes_vuptime", "Smac-studio"],
  ["Ltimeline", "Rwait", "S2026-11-25T08:03"],
  ["Lcatalog", "Sv1.2.3", "Tnotes"],
  ["L人", "S田中 太郎", "R担当/案件"],
  ["La.b", "S100%", "C~x=y&z"],
];

test("a trail is written exactly as corpd writes it", () =>
  check(
    trails.map(encodeTrail).join("\n"),
    toBe(trails.map(corpdTrailOf).join("\n")),
  ));

test("the query is corpd's: the x value percent-encoded once more, nothing restored", () =>
  check(
    trails.map(trailQuery).join("\n"),
    toBe(
      trails
        .map((t) =>
          t.length === 0
            ? ""
            : "?x=" +
              encodeURIComponent(corpdTrailOf(t)),
        )
        .join("\n"),
    ),
  ));

test("every trail survives the address bar: query, URLSearchParams, decode", () =>
  check(
    trails
      .map((t) =>
        JSON.stringify(
          decodeTrail(
            t.length === 0
              ? none()
              : some(
                  new URLSearchParams(
                    trailQuery(t),
                  ).get("x") ?? "",
                ),
          ),
        ),
      )
      .join("\n"),
    toBe(
      trails
        .map((t) => JSON.stringify(t))
        .join("\n"),
    ),
  ));

test("hand-cut and malformed values are read as corpd reads them, never thrown on", () => {
  const raw = [
    "",
    ".",
    "Lnodes.",
    "Lnodes..Sx",
    "L%",
    "L%E0%A4%A.Sok",
    "L%2E%2e.S%41",
    "a%20b.c+d",
  ];
  return check(
    raw
      .map((x) =>
        JSON.stringify(decodeTrail(some(x))),
      )
      .join("\n"),
    toBe(
      raw
        .map((x) =>
          JSON.stringify(corpdStepsOf(x)),
        )
        .join("\n"),
    ),
  );
});

type Step =
  | Readonly<{ kind: "list"; of: string }>
  | Readonly<{ kind: "record"; id: string }>;
const list = (of: string): Step => ({
  kind: "list",
  of,
});
const record = (id: string): Step => ({
  kind: "record",
  id,
});
const codec: StepCodec<Step> = {
  print: (step) =>
    step.kind === "list"
      ? "L" + step.of
      : "S" + step.id,
  parse: (raw) =>
    raw.startsWith("L") && raw.length > 1
      ? some(list(raw.slice(1)))
      : raw.startsWith("S") && raw.length > 1
        ? some(record(raw.slice(1)))
        : none(),
};

test("typed steps print and parse back; the first string that is no step ends the reading", () =>
  all([
    check(
      JSON.stringify(
        parseSteps(codec)(
          printSteps(codec)([
            { kind: "list", of: "nodes" },
            { kind: "record", id: "a.b" },
          ]),
        ),
      ),
      toBe(
        JSON.stringify([
          { kind: "list", of: "nodes" },
          { kind: "record", id: "a.b" },
        ]),
      ),
    ),
    check(
      parseSteps(codec)(["Lnodes", "?", "Sx"])
        .length,
      toBe(1),
    ),
  ]));
