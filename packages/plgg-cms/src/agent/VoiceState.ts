import {
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * The browser voice agent's lifecycle (ticket 25). A closed set
 * driving what the UI shows and which command the TEA `update`
 * issues next: connect → listen → (user speaks) → search the
 * RAG DB → answer → listen again. `error` is a terminal cul-de-
 * sac reset only by stopping. Folded with {@link matchVoiceState};
 * legal moves are {@link transitionVoiceState}.
 */
export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "searching"
  | "answering"
  | "error";

/** Validate an unknown into a {@link VoiceState}. */
export const asVoiceState = (
  v: unknown,
): Result<VoiceState, InvalidError> =>
  isSoftStr(v) &&
  (v === "idle" ||
    v === "connecting" ||
    v === "listening" ||
    v === "searching" ||
    v === "answering" ||
    v === "error")
    ? ok(v)
    : err(
        invalidError({
          message: "not a voice state",
        }),
      );

/** Exhaustive fold over a {@link VoiceState}. */
export const matchVoiceState =
  <R>(
    onIdle: () => R,
    onConnecting: () => R,
    onListening: () => R,
    onSearching: () => R,
    onAnswering: () => R,
    onError: () => R,
  ) =>
  (state: VoiceState): R =>
    state === "idle"
      ? onIdle()
      : state === "connecting"
        ? onConnecting()
        : state === "listening"
          ? onListening()
          : state === "searching"
            ? onSearching()
            : state === "answering"
              ? onAnswering()
              : onError();

/**
 * The voice lifecycle as data. Legal moves:
 * - `idle → connecting` (start) / `connecting → listening`
 *   (connected) / `connecting → error` (mint or transport fail);
 * - `listening → searching` (a query needs the RAG tool) /
 *   `listening → idle` (stop);
 * - `searching → answering` (tool result) / `searching → error`;
 * - `answering → listening` (spoken); `error → idle` (reset);
 * - any live state `→ idle` (disconnect).
 *
 * Anything else — including a same-state no-op — is illegal and
 * a typed `Err`, so the UI can never wedge into an impossible
 * screen. Never throws.
 */
export const transitionVoiceState = (
  from: VoiceState,
  to: VoiceState,
): Result<VoiceState, InvalidError> =>
  to === "idle"
    ? from === "idle"
      ? illegal(from, to)
      : ok(to)
    : (from === "idle" && to === "connecting") ||
        (from === "connecting" &&
          to === "listening") ||
        (from === "connecting" &&
          to === "error") ||
        (from === "listening" &&
          to === "searching") ||
        (from === "searching" &&
          to === "answering") ||
        (from === "searching" &&
          to === "error") ||
        (from === "answering" &&
          to === "listening")
      ? ok(to)
      : illegal(from, to);

const illegal = (
  from: VoiceState,
  to: VoiceState,
): Result<VoiceState, InvalidError> =>
  err(
    invalidError({
      message: `illegal voice transition: ${from} -> ${to}`,
    }),
  );
