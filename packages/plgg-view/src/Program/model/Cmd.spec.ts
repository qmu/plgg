import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { match } from "plgg";
import {
  type Cmd,
  cmdNone,
  cmdBatch,
  cmdEffect,
  cmdNone$,
  cmdBatch$,
  cmdEffect$,
} from "plgg-view/Program/model/Cmd";

type Msg = "Tick";

// Fold a Cmd to a tag for shape assertions WITHOUT executing it.
const tagOf = (cmd: Cmd<Msg>): string =>
  match(cmd)(
    [cmdNone$(), (): string => "none"],
    [cmdBatch$(), (): string => "batch"],
    [cmdEffect$(), (): string => "effect"],
  );

test("constructors build the right variant", () =>
  all([
    check(tagOf(cmdNone()), toBe("none")),
    check(tagOf(cmdBatch([])), toBe("batch")),
    check(
      tagOf(
        cmdEffect(() =>
          Promise.resolve("Tick"),
        ),
      ),
      toBe("effect"),
    ),
  ]));

test("constructing an effect performs nothing (effects are data)", () => {
  // if the thunk ran at construction it would push here.
  const ran: Array<Msg> = [];
  const cmd = cmdEffect<Msg>(() => {
    ran.push("Tick");
    return Promise.resolve("Tick");
  });
  return all([
    check(ran.length, toBe(0)),
    check(tagOf(cmd), toBe("effect")),
  ]);
});

test("batch preserves its children in order", () =>
  match(
    cmdBatch<Msg>([cmdNone(), cmdNone()]),
  )(
    [
      cmdNone$(),
      () => check(true, toBe(false)),
    ],
    [
      cmdBatch$(),
      ({ content }) =>
        check(content.length, toBe(2)),
    ],
    [
      cmdEffect$(),
      () => check(true, toBe(false)),
    ],
  ));
