import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { none } from "plgg";
import { renderToString } from "plgg-view";
import { type Poc } from "./Poc.js";
import { view } from "./view.js";
import { POCS } from "./pocs.js";

const page = renderToString(view(POCS));

test("the portal lists every PoC", () =>
  all(
    POCS.map((poc) =>
      check(page, toContain(poc.name)),
    ),
  ));

test("cards carry question, signal, verdict", () =>
  all([
    check(page, toContain("Question:")),
    check(page, toContain("Proven when:")),
    check(page, toContain("Verdict:")),
    // No PoC has concluded yet, so the honest
    // empty verdict shows.
    check(page, toContain("Not yet run")),
  ]));

test("building PoCs link; planned ones only reserve", () =>
  all([
    // poc1 is proven → still a real anchor.
    check(
      page,
      toContain(
        'href="https://plgg-poc1.qmu.dev/"',
      ),
    ),
    // poc2 and poc3 (both proven) → real
    // anchors too.
    check(
      page,
      toContain(
        'href="https://plgg-poc2.qmu.dev/"',
      ),
    ),
    check(
      page,
      toContain(
        'href="https://plgg-poc3.qmu.dev/"',
      ),
    ),
    // poc4 (building) → a real anchor now.
    check(
      page,
      toContain(
        'href="https://plgg-poc4.qmu.dev/"',
      ),
    ),
    // poc5 and poc6 (both building now) → real
    // anchors too.
    check(
      page,
      toContain(
        'href="https://plgg-poc5.qmu.dev/"',
      ),
    ),
    check(
      page,
      toContain(
        'href="https://plgg-poc6.qmu.dev/"',
      ),
    ),
  ]));

// The reserve behavior no longer has a planned PoC in the
// live fleet, so exercise it against a synthetic one — a
// planned card shows a "Reserved:" note, never a dead link.
const plannedPoc: Poc = {
  id: "poc-x",
  name: "Synthetic planned PoC",
  question: "does the reserve state render?",
  confidenceSignal: "reserved text, no anchor",
  status: "planned",
  verdict: none(),
  hostname: "plgg-pocx.qmu.dev",
  port: 5199,
};

test("a planned PoC reserves its hostname, never a dead link", () =>
  all([
    check(
      renderToString(view([plannedPoc])),
      not(
        toContain(
          'href="https://plgg-pocx.qmu.dev/"',
        ),
      ),
    ),
    check(
      renderToString(view([plannedPoc])),
      toContain("Reserved: plgg-pocx.qmu.dev"),
    ),
  ]));

test("the allocation table maps the fleet", () =>
  all([
    check(
      page,
      toContain("plgg-poc.qmu.dev"),
    ),
    check(page, toContain("5183")),
    check(page, toContain("5184")),
    check(page, toContain("Hostname")),
  ]));

test("an empty fleet renders an honest empty state", () =>
  check(
    renderToString(view([])),
    toContain("No PoCs planned yet"),
  ));

test("status labels appear as text, not color alone", () =>
  all([
    check(page, toContain("Proven")),
    // The live fleet has building PoCs (poc4/5/6);
    // "Planned" is exercised via the synthetic card.
    check(page, toContain("Building")),
    check(
      renderToString(view([plannedPoc])),
      toContain("Planned"),
    ),
    check(
      renderToString(view([])),
      not(toContain("Proven")),
    ),
  ]));
