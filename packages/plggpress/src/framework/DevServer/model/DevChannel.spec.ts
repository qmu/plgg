import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  RELOAD_PATH,
  SSE_PRELUDE,
  RELOAD_FRAME,
  LIVE_RELOAD_SCRIPT,
} from "plggpress/framework/DevServer/model/DevChannel";

test("RELOAD_PATH is the plggpress-owned reload route", () =>
  check(RELOAD_PATH, toBe("/__plggpress_reload")));

test("the SSE frames are correctly framed", () =>
  all([
    check(SSE_PRELUDE, toContain(":")),
    check(SSE_PRELUDE, toContain("\n\n")),
    check(
      RELOAD_FRAME,
      toContain("data: reload"),
    ),
    check(RELOAD_FRAME, toContain("\n\n")),
  ]));

test("the live-reload client opens an EventSource to the reload route", () =>
  all([
    check(
      LIVE_RELOAD_SCRIPT,
      toContain("EventSource"),
    ),
    check(LIVE_RELOAD_SCRIPT, toContain(RELOAD_PATH)),
    check(
      LIVE_RELOAD_SCRIPT,
      toContain("location.reload()"),
    ),
  ]));
