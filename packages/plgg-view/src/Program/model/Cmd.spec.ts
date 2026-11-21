import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { match } from "plgg";
import { runCmd } from "plgg-view/Program/usecase/effects";
import {
  type Cmd,
  cmdNone,
  mapCmd,
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

test("mapCmd keeps nested batches lazy and maps each delivered child message", async () => {
  const calls: string[] = [];
  const seen: string[] = [];
  const cmd = mapCmd((n: number) => "plan-" + n)(
    cmdBatch([
      cmdNone(),
      cmdBatch([
        cmdEffect(async () => {
          calls.push("first");
          return 1;
        }),
      ]),
      cmdEffect(async () => {
        calls.push("second");
        return 2;
      }),
    ]),
  );
  const before = calls.length;
  runCmd(cmd, (msg) => seen.push(msg));
  await new Promise<void>((resolve) =>
    setTimeout(resolve, 0),
  );
  return all([
    check(before, toBe(0)),
    check(calls.join(","), toBe("first,second")),
    check(seen.join(","), toBe("plan-1,plan-2")),
  ]);
});
