import {
  type Box,
  type Icon,
  type Option,
  type SoftStr,
  box,
  icon,
  pattern,
} from "plgg";

/**
 * A subscription to an ongoing source, as PURE DATA. `subscriptions(model)`
 * returns the subs that should be ACTIVE for the current model; the runtime
 * diffs them BY KEY on every dispatch — starting genuinely new keys, tearing
 * down removed keys, and leaving survivors running UNTOUCHED (continuity, no
 * restart churn).
 *
 * A closed union:
 * - `SubNone` / `SubBatch` — structural (no key).
 * - `SubInterval` — a timer: dispatch `toMsg()` every `ms`.
 * - `SubWindow` — a window/global event, filtered through
 *   `toMsg: (event) => Option<Msg>` (`none()` ignores the event; no
 *   preventDefault modeling — deferred to the event-decoder research ticket).
 * - `SubCustom` — a keyed descriptor `start: (dispatch) => cleanup`. A
 *   WebSocket/audio channel (D12, ticket 25) plugs in here, carrying its whole
 *   wiring as data the runtime invokes.
 *
 * KEY IDENTITY: every active leaf carries a stable `key` — its diffing
 * identity. Two subs with the same key are "the same subscription": the runtime
 * keeps the running one and ignores a config change until the KEY changes, so
 * to restart a source (e.g. a new interval period) the app changes its key.
 * The interval/window leaves are pure data (the runtime owns
 * `setInterval`/`addEventListener` through an injectable env); `custom` carries
 * its `start` thunk as data, invoked only by the runtime. DOM-free at runtime
 * (`Event` is a type annotation only).
 */
export type Sub<Msg> =
  | Icon<"SubNone">
  | Box<"SubBatch", ReadonlyArray<Sub<Msg>>>
  | Box<
      "SubInterval",
      Readonly<{
        key: SoftStr;
        ms: number;
        toMsg: () => Msg;
      }>
    >
  | Box<
      "SubWindow",
      Readonly<{
        key: SoftStr;
        event: SoftStr;
        toMsg: (event: Event) => Option<Msg>;
      }>
    >
  | Box<
      "SubCustom",
      Readonly<{
        key: SoftStr;
        start: (
          dispatch: (msg: Msg) => void,
        ) => () => void;
      }>
    >;

/** Pattern matchers for folding a {@link Sub} with `match`. */
export const subNone$ = () =>
  pattern("SubNone")();
export const subBatch$ = () =>
  pattern("SubBatch")();
export const subInterval$ = () =>
  pattern("SubInterval")();
export const subWindow$ = () =>
  pattern("SubWindow")();
export const subCustom$ = () =>
  pattern("SubCustom")();

/** No subscription. `Sub<never>` — usable anywhere. */
export const subNone = (): Sub<never> =>
  icon("SubNone");

/** Several subscriptions active at once. */
export const subBatch = <Msg>(
  subs: ReadonlyArray<Sub<Msg>>,
): Sub<Msg> => box("SubBatch")(subs);

/** A timer: dispatch `toMsg()` every `ms` while active. */
export const interval = <Msg>(
  key: SoftStr,
  ms: number,
  toMsg: () => Msg,
): Sub<Msg> =>
  box("SubInterval")({ key, ms, toMsg });

/**
 * A window/global event, filtered to a `Msg` through
 * `toMsg: (event) => Option<Msg>` — `none()` drops the event.
 */
export const windowEvent = <Msg>(
  key: SoftStr,
  event: SoftStr,
  toMsg: (event: Event) => Option<Msg>,
): Sub<Msg> =>
  box("SubWindow")({ key, event, toMsg });

/**
 * A custom keyed subscription: `start` receives `dispatch`, wires the source
 * (a WebSocket, an audio channel), and returns a cleanup the runtime calls when
 * the key leaves or the program unmounts.
 */
export const custom = <Msg>(
  key: SoftStr,
  start: (
    dispatch: (msg: Msg) => void,
  ) => () => void,
): Sub<Msg> => box("SubCustom")({ key, start });

/** A one-shot read owned by a subscription key. Change the key to reload,
 * or drop it to abort. A late result from an old instance is ignored even
 * when the same key has since been mounted again. Map expected errors into Msg.
 */
export const readOnce = <Msg>(key: SoftStr, read: (signal: AbortSignal) => Promise<Msg>): Sub<Msg> =>
  custom(key, dispatch => {
    const controller = new AbortController();
    void read(controller.signal).then(
      msg => { if (!controller.signal.aborted) dispatch(msg); },
      (error: unknown) => { if (!controller.signal.aborted) throw error; },
    );
    return () => controller.abort();
  });
