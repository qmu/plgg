import {
  type Box,
  type Option,
  type SoftStr,
  type InvalidError,
  box,
  some,
  none,
  matchResult,
} from "plgg";
import {
  type VoiceState,
  transitionVoiceState,
} from "plgg-cms/agent/VoiceState";

/**
 * The voice agent's TEA model (ticket 25): the lifecycle
 * {@link VoiceState}, the running transcript, and the last error
 * (for the `error` screen). Pure data.
 */
export type VoiceModel = Readonly<{
  state: VoiceState;
  transcript: ReadonlyArray<SoftStr>;
  lastError: Option<SoftStr>;
}>;

/** The initial model — idle, empty. */
export const initVoice: VoiceModel = {
  state: "idle",
  transcript: [],
  lastError: none(),
};

/**
 * Messages into the loop: session control (start/connected/
 * stop/fail), a heard user query, and a formed answer. Payloads
 * are strings the IO seam produces.
 */
export type VoiceMsg =
  | Box<"StartSession", null>
  | Box<"Connected", null>
  | Box<"UserQuery", SoftStr>
  | Box<"AnswerReady", SoftStr>
  | Box<"Spoke", null>
  | Box<"Failed", SoftStr>
  | Box<"Stop", null>;

/**
 * Commands OUT to the coverage-excluded IO seam: open the
 * Realtime connection, run a RAG search, speak an answer,
 * disconnect, or nothing. The reducer only NAMES the effect;
 * the seam performs the WebRTC/Realtime/fetch.
 */
export type VoiceCmd =
  | Box<"Connect", null>
  | Box<"Search", SoftStr>
  | Box<"Speak", SoftStr>
  | Box<"Disconnect", null>
  | Box<"NoCmd", null>;

const NO_CMD: VoiceCmd = box("NoCmd")(null);

export const startSession: VoiceMsg =
  box("StartSession")(null);
export const connected: VoiceMsg =
  box("Connected")(null);
export const userQuery = (
  q: SoftStr,
): VoiceMsg => box("UserQuery")(q);
export const answerReady = (
  a: SoftStr,
): VoiceMsg => box("AnswerReady")(a);
export const spoke: VoiceMsg = box("Spoke")(null);
export const failed = (
  reason: SoftStr,
): VoiceMsg => box("Failed")(reason);
export const stop: VoiceMsg = box("Stop")(null);

/**
 * Move to `to` if the lifecycle allows it, applying `patch` and
 * emitting `cmd`; an ILLEGAL move leaves the model untouched and
 * emits nothing — a stray message can never corrupt the state
 * (the transition guard is the single source of legality).
 */
const advance = (
  model: VoiceModel,
  to: VoiceState,
  cmd: VoiceCmd,
  patch: Partial<VoiceModel>,
): readonly [VoiceModel, VoiceCmd] =>
  matchResult<
    VoiceState,
    InvalidError,
    readonly [VoiceModel, VoiceCmd]
  >(
    () => [model, NO_CMD],
    (next: VoiceState) => [
      { ...model, ...patch, state: next },
      cmd,
    ],
  )(transitionVoiceState(model.state, to));

/**
 * The pure TEA reducer for the voice agent: user speaks → the
 * RAG DB is searched → the agent answers → it listens again,
 * each step a guarded {@link VoiceState} move plus the command
 * the IO seam should run. Total and side-effect-free — the whole
 * agent behaviour is unit-testable without a browser.
 */
export const voiceUpdate = (
  msg: VoiceMsg,
  model: VoiceModel,
): readonly [VoiceModel, VoiceCmd] =>
  msg.__tag === "StartSession"
    ? advance(
        model,
        "connecting",
        box("Connect")(null),
        {},
      )
    : msg.__tag === "Connected"
      ? advance(model, "listening", NO_CMD, {})
      : msg.__tag === "UserQuery"
        ? advance(
            model,
            "searching",
            box("Search")(msg.content),
            {
              transcript: [
                ...model.transcript,
                msg.content,
              ],
            },
          )
        : msg.__tag === "AnswerReady"
          ? advance(
              model,
              "answering",
              box("Speak")(msg.content),
              {
                transcript: [
                  ...model.transcript,
                  msg.content,
                ],
              },
            )
          : msg.__tag === "Spoke"
            ? advance(
                model,
                "listening",
                NO_CMD,
                {},
              )
            : msg.__tag === "Failed"
              ? advance(
                  model,
                  "error",
                  NO_CMD,
                  {
                    lastError: some(
                      msg.content,
                    ),
                  },
                )
              : advance(
                  model,
                  "idle",
                  box("Disconnect")(null),
                  {},
                );
