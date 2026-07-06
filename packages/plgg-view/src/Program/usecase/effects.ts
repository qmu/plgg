import {
  type SoftStr,
  pipe,
  match,
  matchOption,
  fromNullable,
} from "plgg";
import {
  type Cmd,
  cmdNone$,
  cmdBatch$,
  cmdEffect$,
} from "plgg-view/Program/model/Cmd";
import {
  type Sub,
  subNone$,
  subBatch$,
  subInterval$,
  subWindow$,
  subCustom$,
} from "plgg-view/Program/model/Sub";

/**
 * Executes a {@link Cmd} — the ONE place effects run. `CmdNone` does nothing,
 * `CmdBatch` runs its children in order, `CmdEffect` invokes the deferred thunk
 * and dispatches the `Msg` it resolves to. `dispatch` is the runtime's
 * alive-gated dispatch, so an effect that resolves after teardown is dropped.
 *
 * A rejection is NOT swallowed: the app is expected to fold its `Result` to a
 * `Msg` inside the thunk, so a rejected effect is a genuine defect and surfaces
 * as an unhandled rejection rather than vanishing (no silent catch here).
 */
export const runCmd = <Msg>(
  cmd: Cmd<Msg>,
  dispatch: (msg: Msg) => void,
): void =>
  match(cmd)(
    [cmdNone$(), (): void => undefined],
    [
      cmdBatch$(),
      ({ content }): void =>
        content.forEach((child) =>
          runCmd(child, dispatch),
        ),
    ],
    [
      cmdEffect$(),
      ({ content }): void => {
        void content().then((msg) =>
          dispatch(msg),
        );
      },
    ],
  );

/**
 * The imperative seams a subscription needs, INJECTED so a timer-controlled /
 * window-less test can drive them deterministically — the same
 * injectable-machinery precedent as the renderer's {@link Play}. Each starter
 * returns its own cleanup.
 */
export type SubEnv = Readonly<{
  interval: (
    ms: number,
    tick: () => void,
  ) => () => void;
  windowEvent: (
    event: SoftStr,
    handler: (event: Event) => void,
  ) => () => void;
}>;

/**
 * The default {@link SubEnv}: real `setInterval` and `window` event listeners,
 * each paired with its clearing cleanup. The confined imperative seam the
 * subscription runtime uses in a browser.
 */
export const browserSubEnv: SubEnv = {
  interval: (ms, tick) => {
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  },
  windowEvent: (event, handler) => {
    window.addEventListener(event, handler);
    return () =>
      window.removeEventListener(
        event,
        handler,
      );
  },
};

/**
 * A flattened active subscription: its stable `key` plus a `start` closure
 * (built from the leaf and the env) returning that subscription's cleanup.
 */
type Leaf<Msg> = Readonly<{
  key: SoftStr;
  start: (
    dispatch: (msg: Msg) => void,
  ) => () => void;
}>;

/**
 * Flattens a {@link Sub} tree into its active keyed leaves, binding each leaf's
 * imperative start to the injected {@link SubEnv}. `SubNone` yields nothing;
 * `SubBatch` concatenates its children.
 */
export const flattenSub = <Msg>(
  sub: Sub<Msg>,
  env: SubEnv,
): ReadonlyArray<Leaf<Msg>> =>
  match(sub)(
    [
      subNone$(),
      (): ReadonlyArray<Leaf<Msg>> => [],
    ],
    [
      subBatch$(),
      ({ content }): ReadonlyArray<Leaf<Msg>> =>
        content.flatMap((child) =>
          flattenSub(child, env),
        ),
    ],
    [
      subInterval$(),
      ({ content }): ReadonlyArray<Leaf<Msg>> => [
        {
          key: content.key,
          start: (dispatch) =>
            env.interval(content.ms, () =>
              dispatch(content.toMsg()),
            ),
        },
      ],
    ],
    [
      subWindow$(),
      ({ content }): ReadonlyArray<Leaf<Msg>> => [
        {
          key: content.key,
          start: (dispatch) =>
            env.windowEvent(
              content.event,
              (event) =>
                matchOption(
                  (): void => undefined,
                  (msg: Msg): void =>
                    dispatch(msg),
                )(content.toMsg(event)),
            ),
        },
      ],
    ],
    [
      subCustom$(),
      ({ content }): ReadonlyArray<Leaf<Msg>> => [
        {
          key: content.key,
          start: content.start,
        },
      ],
    ],
  );

/**
 * A live subscription set for one mount. `reconcile(next)` diffs the running
 * subscriptions against `next` BY KEY — starting genuinely new keys, stopping
 * removed keys, and leaving survivors running untouched (so a surviving key is
 * NEVER restarted). `disposeAll` tears everything down on unmount.
 */
export type SubRuntime<Msg> = Readonly<{
  reconcile: (next: Sub<Msg>) => void;
  disposeAll: () => void;
}>;

export const makeSubRuntime = <Msg>(
  dispatch: (msg: Msg) => void,
  env: SubEnv = browserSubEnv,
): SubRuntime<Msg> => {
  // key → cleanup for every running subscription — the manager's one mutable
  // seam, mirroring the runtime's live model.
  const running = new Map<
    SoftStr,
    () => void
  >();
  const stop = (key: SoftStr): void => {
    pipe(
      fromNullable(running.get(key)),
      matchOption(
        (): void => undefined,
        (cleanup: () => void): void =>
          cleanup(),
      ),
    );
    running.delete(key);
  };
  const reconcile = (next: Sub<Msg>): void => {
    const leaves = flattenSub(next, env);
    const nextKeys = new Set(
      leaves.map((leaf) => leaf.key),
    );
    // stop the removed
    Array.from(running.keys()).forEach((key) => {
      if (!nextKeys.has(key)) {
        stop(key);
      }
    });
    // start the genuinely new — survivors stay running untouched
    leaves.forEach((leaf) => {
      if (!running.has(leaf.key)) {
        running.set(
          leaf.key,
          leaf.start(dispatch),
        );
      }
    });
  };
  const disposeAll = (): void => {
    running.forEach((cleanup) => cleanup());
    running.clear();
  };
  return { reconcile, disposeAll };
};
