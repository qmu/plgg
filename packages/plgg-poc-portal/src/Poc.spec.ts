import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { some, none } from "plgg";
import {
  type Poc,
  STATUS_LABEL,
  isConcluded,
  isLinkable,
  verdictText,
  pocConsistent,
} from "./Poc.js";
import { POCS } from "./pocs.js";

const base: Poc = {
  id: "poc0",
  name: "Sample",
  question: "Q?",
  confidenceSignal: "S",
  status: "planned",
  verdict: none(),
  hostname: "plgg-poc0.qmu.dev",
  port: 5190,
};

test("every status renders a label", () =>
  all([
    check(
      STATUS_LABEL["planned"],
      toBe("Planned"),
    ),
    check(
      STATUS_LABEL["building"],
      toBe("Building"),
    ),
    check(STATUS_LABEL["proven"], toBe("Proven")),
    check(
      STATUS_LABEL["disproven"],
      toBe("Disproven"),
    ),
    check(
      STATUS_LABEL["needs-another-round"],
      toBe("Needs another round"),
    ),
  ]));

test("verdictText is honest about absence", () =>
  all([
    check(
      verdictText(none()),
      toBe("Not yet run"),
    ),
    check(
      verdictText(some("FTS wins")),
      toBe("FTS wins"),
    ),
  ]));

test("concluded statuses demand a verdict", () =>
  all([
    check(pocConsistent(base), toBe(true)),
    check(
      pocConsistent({
        ...base,
        status: "proven",
      }),
      toBe(false),
    ),
    check(
      pocConsistent({
        ...base,
        status: "proven",
        verdict: some("measured"),
      }),
      toBe(true),
    ),
    check(
      pocConsistent({
        ...base,
        status: "building",
        verdict: some("premature"),
      }),
      toBe(false),
    ),
  ]));

test("planned PoCs never link", () =>
  all([
    check(isLinkable("planned"), toBe(false)),
    check(isLinkable("building"), toBe(true)),
    check(isLinkable("proven"), toBe(true)),
  ]));

test("the fleet data is consistent", () =>
  all([
    // Seven PoC entries: the six mission PoCs plus 4b,
    // the co-editing-EXPERIENCE spin-off of PoC 4.
    check(POCS.length, toBe(7)),
    // Every record honors the verdict invariant.
    check(POCS.every(pocConsistent), toBe(true)),
    // Ports are unique and inside the reserved
    // 5184–5190 block (5183 is the portal).
    check(
      new Set(POCS.map((p) => p.port)).size,
      toBe(POCS.length),
    ),
    check(
      POCS.every(
        (p) => p.port >= 5184 && p.port <= 5190,
      ),
      toBe(true),
    ),
    // Hostnames are unique *.qmu.dev names.
    check(
      new Set(POCS.map((p) => p.hostname)).size,
      toBe(POCS.length),
    ),
    check(
      POCS.every((p) =>
        p.hostname.endsWith(".qmu.dev"),
      ),
      toBe(true),
    ),
    // poc1–poc4 and poc4b are the concluded
    // (proven) PoCs; poc5 and poc6 are building
    // (served, awaiting live verdicts).
    check(
      POCS.filter(
        (p) => p.status === "proven",
      ).map((p) => p.id),
      toEqual([
        "poc1",
        "poc2",
        "poc3",
        "poc4",
        "poc4b",
      ]),
    ),
  ]));

test("isConcluded matches the closed set", () =>
  all([
    check(isConcluded("planned"), toBe(false)),
    check(isConcluded("building"), toBe(false)),
    check(isConcluded("proven"), toBe(true)),
    check(isConcluded("disproven"), toBe(true)),
    check(
      isConcluded("needs-another-round"),
      toBe(true),
    ),
  ]));
