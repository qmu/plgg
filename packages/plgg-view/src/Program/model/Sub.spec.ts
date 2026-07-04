import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { match, none } from "plgg";
import {
  type Sub,
  subNone,
  subBatch,
  interval,
  windowEvent,
  custom,
  subNone$,
  subBatch$,
  subInterval$,
  subWindow$,
  subCustom$,
} from "plgg-view/Program/model/Sub";

type Msg = "Tick";

const tagOf = (sub: Sub<Msg>): string =>
  match(sub)(
    [subNone$(), (): string => "none"],
    [subBatch$(), (): string => "batch"],
    [
      subInterval$(),
      (): string => "interval",
    ],
    [subWindow$(), (): string => "window"],
    [subCustom$(), (): string => "custom"],
  );

test("constructors build the right variant", () =>
  all([
    check(tagOf(subNone()), toBe("none")),
    check(
      tagOf(subBatch<Msg>([])),
      toBe("batch"),
    ),
    check(
      tagOf(interval("t", 100, () => "Tick")),
      toBe("interval"),
    ),
    check(
      tagOf(
        windowEvent<Msg>("k", "keydown", () =>
          none(),
        ),
      ),
      toBe("window"),
    ),
    check(
      tagOf(
        custom<Msg>(
          "c",
          () => () => undefined,
        ),
      ),
      toBe("custom"),
    ),
  ]));

test("an interval leaf carries its key / ms / toMsg", () =>
  match(
    interval<Msg>("tick", 250, () => "Tick"),
  )(
    [
      subNone$(),
      () => check(true, toBe(false)),
    ],
    [
      subBatch$(),
      () => check(true, toBe(false)),
    ],
    [
      subInterval$(),
      ({ content }) =>
        all([
          check(content.key, toBe("tick")),
          check(content.ms, toBe(250)),
          check(content.toMsg(), toBe("Tick")),
        ]),
    ],
    [
      subWindow$(),
      () => check(true, toBe(false)),
    ],
    [
      subCustom$(),
      () => check(true, toBe(false)),
    ],
  ));
