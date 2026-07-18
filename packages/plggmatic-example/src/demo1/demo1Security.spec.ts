// Demo 1's security assessment, kept honest as executable
// assertions (see docs/demo1-security-assessment.md). Every
// path by which URL params / form drafts / record data
// reach the DOM goes through plgg-view's escaping seam:
// text via escapeText, attributes via
// escapeAttr(safeAttrValue(...)), and URL-bearing
// attributes have their scheme neutralized. These tests
// exercise that through the real render + URL codec.
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  renderToString,
  a,
  href,
  text,
} from "plgg-view";
import { makeUrl } from "plgg-view/client";
import {
  app,
  type Model,
} from "./bizMenuDemo.ts";
import { resultHref } from "./url.ts";
import { type Rec } from "./records.ts";
import { syncRecords } from "./logic.ts";

const scriptPayload = "<script>alert(1)</script>";

const hostileClient: Rec = {
  id: "evil-co",
  values: {
    name: scriptPayload,
    status: "Active",
    since: "2026",
    contact: "x",
    projects: "y",
    notes: '"><img src=x onerror=alert(1)>',
  },
};

const search = (model: Model): string =>
  app.toUrl === undefined
    ? ""
    : app.toUrl(model).search;

test("a hostile record value renders escaped in a text position", () => {
  // Inject a record whose name is markup INTO THE MODEL
  // (records live in the Model now — no shared store to
  // reset), sync it into the scheduler slot, deep-link to
  // its detail, and render. Each `init` is independent, so
  // nothing leaks to other specs.
  const [m0] = app.init(
    makeUrl(
      "/demo1.html",
      "?c=clients&p=evil-co",
    ),
  );
  const m = syncRecords({
    ...m0,
    records: {
      ...m0.records,
      clients: [
        ...m0.records.clients,
        hostileClient,
      ],
    },
  });
  const html = renderToString(app.view(m));
  return all([
    check(
      html.includes(scriptPayload),
      toBe(false),
    ),
    check(html.includes("<img "), toBe(false)),
    check(
      html.includes("&lt;script&gt;"),
      toBe(true),
    ),
  ]);
});

test("a hostile keyword param renders escaped in an attribute position", () => {
  const evil = '"><script>alert(1)</script>';
  const [m] = app.init(
    makeUrl(
      "/demo1.html",
      "?c=projects&search=1&submitted=1&kw=" +
        encodeURIComponent(evil) +
        "&st=Any",
    ),
  );
  const html = renderToString(app.view(m));
  return all([
    // The keyword reaches the search input `value=` via
    // escapeAttr, so it cannot break out of its quotes or
    // become a tag.
    check(html.includes("<script>"), toBe(false)),
    check(
      html.includes('"><script'),
      toBe(false),
    ),
    check(
      html.includes("&lt;script&gt;"),
      toBe(true),
    ),
  ]);
});

test("the href sink neutralizes a javascript: scheme", () => {
  // Even a hostile url.path (never attacker-supplied in
  // practice — the browser owns it) is neutralized to "#"
  // by safeUrl when the href renders.
  const link = a(
    [
      href(
        resultHref(
          makeUrl(
            "javascript:alert(1)",
            "?c=projects",
          ),
          "beacon",
        ),
      ),
    ],
    [text("x")],
  );
  const html = renderToString(link);
  return all([
    check(
      html.includes("javascript:"),
      toBe(false),
    ),
    check(html.includes('href="#"'), toBe(true)),
  ]);
});

test("hostile params round-trip through the codec without raw markup", () => {
  const [m] = app.init(
    makeUrl(
      "/demo1.html",
      "?c=projects&search=1&submitted=1&kw=" +
        encodeURIComponent(scriptPayload) +
        "&st=Any",
    ),
  );
  const printed = search(m);
  return all([
    check(
      printed.includes(scriptPayload),
      toBe(false),
    ),
    check(printed.includes("<"), toBe(false)),
    check(
      printed.includes("kw=%3Cscript%3E"),
      toBe(true),
    ),
  ]);
});
