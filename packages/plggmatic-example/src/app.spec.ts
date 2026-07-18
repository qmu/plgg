import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { getOr, isNone } from "plgg";
import { renderToString } from "plgg-view";
import { makeUrl } from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  openMenu,
  select,
} from "plggmatic";
import { app, scheduled } from "./app.ts";

// The behavioral oracle, ported from the hand-written
// workbench to the SCHEDULED program: init depth, URL
// round-trip + canonical serialization (now the derived
// `?c=…&p=…` codec), junk-URL totality, and rendered-
// markup assertions through the multi-column renderer.
const [m0] = app.init(makeUrl("/", ""));
const drive = (
  ...msgs: ReadonlyArray<SchedulerMsg>
): ScheduledModel =>
  msgs.reduce(
    (m: ScheduledModel, msg: SchedulerMsg) =>
      app.update(msg, m)[0],
    m0,
  );

test("init at the root seeds an empty flow", () =>
  all([
    check(isNone(m0.root), toBe(true)),
    check(m0.path.length, toBe(0)),
  ]));

test("init from a deep link pre-drills the flow", () => {
  const [m] = app.init(
    makeUrl("/", "?c=sections&p=botany"),
  );
  return all([
    check(
      getOr("")(m.root),
      toBe("sections"),
    ),
    check(m.path, toEqual(["botany"])),
  ]);
});

test("the URL round-trips and serializes canonically", () => {
  const m = drive(
    openMenu("sections"),
    select(0, "botany"),
    select(1, "moss"),
  );
  const url = scheduled.toUrl(m);
  const back = app.update(
    app.onUrlChange(url),
    drive(openMenu("sections")),
  )[0];
  return all([
    check(
      url.search,
      toBe("?c=sections&p=botany/moss"),
    ),
    check(
      scheduled.toUrl(back).search,
      toBe(url.search),
    ),
    check(back.path, toEqual(["botany", "moss"])),
  ]);
});

test("a junk URL never crashes the derived codec", () => {
  const [m] = app.init(
    makeUrl("/", "?c=ghost&p=%2F&x=1"),
  );
  return check(
    getOr("")(m.root),
    toBe("ghost"),
  );
});

test("the root view is the menu as a navigation landmark", () => {
  const html = renderToString(app.view(m0));
  return all([
    check(html.includes("<nav"), toBe(true)),
    check(html.includes("Field Notes"), toBe(true)),
    check(html.includes("Notes"), toBe(true)),
  ]);
});

test("drilling shows the section's notes with a marked selection", () => {
  const html = renderToString(
    app.view(
      drive(
        openMenu("sections"),
        select(0, "botany"),
      ),
    ),
  );
  return all([
    check(html.includes("<aside"), toBe(true)),
    check(
      html.includes("Moss on the north face"),
      toBe(true),
    ),
    check(
      html.includes('aria-current="page"'),
      toBe(true),
    ),
  ]);
});

test("selecting a note reveals the reader with its body", () => {
  const html = renderToString(
    app.view(
      drive(
        openMenu("sections"),
        select(0, "botany"),
        select(1, "moss"),
      ),
    ),
  );
  return all([
    check(html.includes("<main"), toBe(true)),
    check(
      html.includes("continuous moss mat"),
      toBe(true),
    ),
    // the framework renders the breadcrumb + close links,
    // no hand-written aria-* in this app
    check(
      html.includes('aria-label="Breadcrumb"'),
      toBe(true),
    ),
  ]);
});
