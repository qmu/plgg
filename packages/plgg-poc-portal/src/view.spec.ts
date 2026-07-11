import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { renderToString } from "plgg-view";
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
    // poc2 (proven) and poc3 (building) → real
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
    // poc4 is planned → reserved text, never a
    // dead link.
    check(
      page,
      not(
        toContain(
          'href="https://plgg-poc4.qmu.dev/"',
        ),
      ),
    ),
    check(
      page,
      toContain(
        "Reserved: plgg-poc4.qmu.dev",
      ),
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
    check(page, toContain("Planned")),
    check(
      renderToString(view([])),
      not(toContain("Proven")),
    ),
  ]));
