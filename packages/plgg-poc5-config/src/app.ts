/**
 * PoC 5 — central configuration generation. One
 * Elm-Architecture program on PoC 4b's proven Realtime
 * scaffold, re-aimed at the CONFIG question: a typed
 * command (or a voice tool call) maintains the site's
 * central configuration, and the sample site re-renders
 * live from it.
 *
 * The reducer is the PURE domain layer — model + `update`,
 * total over plain data, tested offline by app.spec.ts.
 * Every side effect (fetch, WebRTC) is returned as a `Cmd`
 * value built by effects.ts; nothing here does IO. The
 * config lives in the model (client state, no disk write):
 * the durable-core question the mission asks — can the
 * agent maintain config AS TYPED DATA the site renders — is
 * answered by the typed model + the two write paths
 * funneling through the one pure `applyOp`.
 */
import {
  type SoftStr,
  type Result,
  type Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchResult,
} from "plgg";
import {
  type Sandbox,
  type Cmd,
  cmdNone,
} from "plgg-view/client";
import {
  type Config,
  DEFAULT_CONFIG,
} from "./config.ts";
import { type Page } from "./pages.ts";
import {
  type Line,
  type ConfigTrail,
  type AgentEvent,
  summarizeOp,
} from "./agent.ts";
import {
  type ConfigOp,
  type ConfigError,
  applyOp,
} from "./apply.ts";
import {
  type CommandError,
  parseConfigCommand,
} from "./command.ts";
import {
  loadAssets,
  startSession,
  stopSession,
  toolReply,
  subscriptions,
} from "./effects.ts";
import { view } from "./view.ts";

export type SessionPhase =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "starting" }>
  | Readonly<{ kind: "live" }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>;

export type Ready = Readonly<{
  pages: ReadonlyArray<Page>;
  /** Whether the server seam holds a key (voice bonus). */
  configured: boolean;
}>;

export type AssetsPhase =
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>
  | Readonly<{ kind: "ready"; ready: Ready }>;

export type Model = Readonly<{
  assets: AssetsPhase;
  /** The central configuration — the durable data itself. */
  config: Config;
  session: SessionPhase;
  transcript: ReadonlyArray<Line>;
  /** Every config-tool/command outcome, newest last. */
  configTrail: ReadonlyArray<ConfigTrail>;
  /** The command box's current draft. */
  draft: SoftStr;
  /** Bumped per landed change so the preview can flash. */
  changeSeq: number;
  /** A one-line summary of the last landed change. */
  lastChange: Option<SoftStr>;
}>;

export type Msg =
  | Readonly<{
      kind: "AssetsLoaded";
      result: Result<Ready, Error>;
    }>
  | Readonly<{
      kind: "DraftEdited";
      value: SoftStr;
    }>
  | Readonly<{ kind: "CommandSubmitted" }>
  | Readonly<{
      kind: "OpRequested";
      op: ConfigOp;
    }>
  | Readonly<{ kind: "StartRequested" }>
  | Readonly<{ kind: "StopRequested" }>
  | Readonly<{ kind: "SessionOpened" }>
  | Readonly<{
      kind: "SessionFailed";
      reason: SoftStr;
    }>
  | Readonly<{ kind: "SessionClosed" }>
  | Readonly<{ kind: "ToolReplied" }>
  | Readonly<{
      kind: "FromRealtime";
      event: AgentEvent;
    }>;

export const init: Model = {
  assets: { kind: "loading" },
  config: DEFAULT_CONFIG,
  session: { kind: "idle" },
  transcript: [],
  configTrail: [],
  draft: "",
  changeSeq: 0,
  lastChange: none(),
};

/** A landed-op trail entry. */
const landed = (
  op: ConfigOp,
): ConfigTrail => ({
  summary: summarizeOp(op),
  outcome: { kind: "landed" },
});

/** A refused trail entry (bad command or bad op). */
const refused = (
  summary: SoftStr,
  reason: SoftStr,
): ConfigTrail => ({
  summary,
  outcome: { kind: "refused", reason },
});

/**
 * Land an op on the config, or record the refusal. Shared
 * by the typed-command path and the voice tool-call path so
 * both funnel through the one applier. Returns the new
 * model plus the outcome (the caller decides the Cmd — a
 * voice tool call must always answer the model).
 */
const applyToModel = (
  model: Model,
  op: ConfigOp,
): readonly [Model, Result<null, ConfigError>] =>
  pipe(
    applyOp(model.config, op),
    matchResult(
      (
        e: ConfigError,
      ): readonly [
        Model,
        Result<null, ConfigError>,
      ] => [
        {
          ...model,
          configTrail: [
            ...model.configTrail,
            refused(summarizeOp(op), e.message),
          ],
        },
        err(e),
      ],
      (
        config: Config,
      ): readonly [
        Model,
        Result<null, ConfigError>,
      ] => [
        {
          ...model,
          config,
          changeSeq: model.changeSeq + 1,
          lastChange: some(summarizeOp(op)),
          configTrail: [
            ...model.configTrail,
            landed(op),
          ],
        },
        ok(null),
      ],
    ),
  );

const onEvent = (
  model: Model,
  event: AgentEvent,
): readonly [Model, Cmd<Msg>] => {
  switch (event.kind) {
    case "WriterSaid":
      return [
        {
          ...model,
          transcript: [
            ...model.transcript,
            { who: "writer", text: event.text },
          ],
        },
        cmdNone(),
      ];
    case "AssistantSaid":
      return [
        {
          ...model,
          transcript: [
            ...model.transcript,
            {
              who: "assistant",
              text: event.text,
            },
          ],
        },
        cmdNone(),
      ];
    case "ConfigCalled": {
      const [next, outcome] = applyToModel(
        model,
        event.op,
      );
      return [
        next,
        toolReply(
          event.callId,
          pipe(
            outcome,
            matchResult(
              (e: ConfigError): SoftStr =>
                JSON.stringify({
                  error: e.message,
                }),
              (): SoftStr =>
                JSON.stringify({
                  ok: true,
                  note: "the configuration changed and the site re-rendered — confirm to the writer what changed",
                }),
            ),
          ),
        ),
      ];
    }
    case "SessionErrored":
      return [
        {
          ...model,
          session: {
            kind: "failed",
            reason: event.reason,
          },
        },
        stopSession,
      ];
  }
};

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "AssetsLoaded":
      return pipe(
        msg.result,
        matchResult(
          (
            e: Error,
          ): readonly [Model, Cmd<Msg>] => [
            {
              ...model,
              assets: {
                kind: "failed",
                reason: e.message,
              },
            },
            cmdNone(),
          ],
          (
            ready: Ready,
          ): readonly [Model, Cmd<Msg>] => [
            {
              ...model,
              assets: { kind: "ready", ready },
            },
            cmdNone(),
          ],
        ),
      );
    case "DraftEdited":
      return [
        { ...model, draft: msg.value },
        cmdNone(),
      ];
    case "CommandSubmitted":
      return model.draft.trim() === ""
        ? [model, cmdNone()]
        : pipe(
            parseConfigCommand(model.draft),
            matchResult(
              (
                e: CommandError,
              ): readonly [Model, Cmd<Msg>] => [
                {
                  ...model,
                  draft: "",
                  configTrail: [
                    ...model.configTrail,
                    refused(
                      model.draft.trim(),
                      e.message,
                    ),
                  ],
                },
                cmdNone(),
              ],
              (
                op: ConfigOp,
              ): readonly [Model, Cmd<Msg>] => [
                {
                  ...applyToModel(model, op)[0],
                  draft: "",
                },
                cmdNone(),
              ],
            ),
          );
    case "OpRequested":
      // A direct op from a UI control (e.g. a theme/layout
      // button) — the same applier the typed command and
      // voice tool call use.
      return [
        applyToModel(model, msg.op)[0],
        cmdNone(),
      ];
    case "StartRequested":
      return model.assets.kind !== "ready" ||
        model.session.kind === "starting" ||
        model.session.kind === "live"
        ? [model, cmdNone()]
        : [
            {
              ...model,
              session: { kind: "starting" },
            },
            startSession(
              model.config,
              model.assets.ready.pages,
            ),
          ];
    case "StopRequested":
      return model.session.kind === "live" ||
        model.session.kind === "starting"
        ? [model, stopSession]
        : [model, cmdNone()];
    case "SessionOpened":
      return [
        { ...model, session: { kind: "live" } },
        cmdNone(),
      ];
    case "SessionFailed":
      return [
        {
          ...model,
          session: {
            kind: "failed",
            reason: msg.reason,
          },
        },
        cmdNone(),
      ];
    case "SessionClosed":
      return model.session.kind === "failed"
        ? [model, cmdNone()]
        : [
            {
              ...model,
              session: { kind: "idle" },
            },
            cmdNone(),
          ];
    case "ToolReplied":
      return [model, cmdNone()];
    case "FromRealtime":
      return onEvent(model, msg.event);
  }
};

/* ------------------------------------------------ *
 * Assembly                                          *
 * ------------------------------------------------ */

export const app: Sandbox<Model, Msg> = {
  init: [init, loadAssets],
  update,
  view,
  subscriptions,
};
