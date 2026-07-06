// Demo 3's proof, asserted on the DERIVED URL codec (the
// point of the demo): a queried + selected slice serializes
// to the canonical ?c=…&p=…&q=…, that URL parses back to the
// same slice (total both directions), and a junk deep link
// never crashes. The address-bar reflection and back/forward
// are browser checks (the runtime owns the URL there).
import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { getOr } from "plgg";
import { makeUrl } from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  openMenu,
  select,
  queryInput,
} from "plggmatic";
import {
  app,
  scheduled,
} from "./queryUrlDemo.ts";

const [m0] = app.init(makeUrl("/", ""));

const drive = (
  ...msgs: ReadonlyArray<SchedulerMsg>
): ScheduledModel =>
  msgs.reduce(
    (m: ScheduledModel, msg: SchedulerMsg) =>
      app.update(msg, m)[0],
    m0,
  );

test("the query filter reflects to ?q=… on the list", () => {
  const m = drive(
    openMenu("items"),
    queryInput("mo"),
  );
  return check(
    scheduled.toUrl(m).search,
    toBe("?c=items&q=mo"),
  );
});

test("selecting a row reflects to ?p=… (drilling clears the filter)", () => {
  const m = drive(
    openMenu("items"),
    queryInput("mo"),
    select(0, "moss"),
  );
  return check(
    scheduled.toUrl(m).search,
    toBe("?c=items&p=moss"),
  );
});

test("the derived URL round-trips back to the same slice", () => {
  const m = drive(
    openMenu("items"),
    select(0, "moss"),
  );
  const url = scheduled.toUrl(m);
  const back = app.update(
    app.onUrlChange(url),
    drive(openMenu("items")),
  )[0];
  return all([
    check(
      scheduled.toUrl(back).search,
      toBe(url.search),
    ),
    check(back.path, toEqual(["moss"])),
  ]);
});

test("a deep link pre-seeds the query and the selection", () => {
  const [m] = app.init(
    makeUrl("/", "?c=items&p=fern&q=fer"),
  );
  return all([
    check(getOr("")(m.root), toBe("items")),
    check(m.path, toEqual(["fern"])),
    check(m.query, toBe("fer")),
  ]);
});

test("a junk deep link never crashes the derived codec", () => {
  const [m] = app.init(
    makeUrl("/", "?c=ghost&p=%2F&q=%2F&x=1"),
  );
  return check(getOr("")(m.root), toBe("ghost"));
});
