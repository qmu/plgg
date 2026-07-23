/**
 * PoC 6 — non-tree file classification. One Elm-Architecture
 * program on the fleet's proven Realtime scaffold, aimed at
 * the CLASSIFICATION question: three navigation variants,
 * each driven by the same deterministic query, rendered
 * side by side over one corpus so they can be compared.
 *
 * The reducer is the PURE domain layer — model + `update`,
 * total over plain data, tested offline by app.spec.ts.
 * Every side effect (fetch, WebRTC) is returned as a `Cmd`
 * value built by effects.ts; nothing here does IO. Each
 * variant holds its OWN last query (`queries.*`) so all
 * three panes render at once; a typed command or a voice
 * tool call routes to the matching slot through the one
 * pure `runQuery`.
 */
import {
  type SoftStr,
  type Result,
  type Option,
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
import { type Page } from "./classify.ts";
import {
  type VariantQuery,
  runQuery,
} from "./variants.ts";
import {
  type Line,
  type QueryTrail,
  type AgentEvent,
  summarizeQuery,
} from "./agent.ts";
import {
  type CommandError,
  parseQueryCommand,
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

/** The last query run in each variant's pane. */
export type Queries = Readonly<{
  tagFacets: Option<VariantQuery>;
  linkGraph: Option<VariantQuery>;
  multiFilter: Option<VariantQuery>;
}>;

export type Model = Readonly<{
  assets: AssetsPhase;
  queries: Queries;
  session: SessionPhase;
  transcript: ReadonlyArray<Line>;
  queryTrail: ReadonlyArray<QueryTrail>;
  draft: SoftStr;
  /** Bumped per query so panes can flash. */
  changeSeq: number;
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
  | Readonly<{ kind: "QuerySubmitted" }>
  | Readonly<{
      kind: "QueryRequested";
      query: VariantQuery;
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
  queries: {
    tagFacets: none(),
    linkGraph: none(),
    multiFilter: none(),
  },
  session: { kind: "idle" },
  transcript: [],
  queryTrail: [],
  draft: "",
  changeSeq: 0,
};

const pagesOf = (
  model: Model,
): ReadonlyArray<Page> =>
  model.assets.kind === "ready"
    ? model.assets.ready.pages
    : [];

/** Route a query into its variant's slot. */
const routeSlot = (
  queries: Queries,
  vq: VariantQuery,
): Queries => {
  switch (vq.kind) {
    case "tag-facets":
      return { ...queries, tagFacets: some(vq) };
    case "link-graph":
      return { ...queries, linkGraph: some(vq) };
    case "multi-filter":
      return {
        ...queries,
        multiFilter: some(vq),
      };
  }
};

const ranTrail = (
  vq: VariantQuery,
  count: number,
): QueryTrail => ({
  summary: summarizeQuery(vq),
  outcome: { kind: "ran", count },
});

const refusedTrail = (
  summary: SoftStr,
  reason: SoftStr,
): QueryTrail => ({
  summary,
  outcome: { kind: "refused", reason },
});

/**
 * Run a query: route it to its pane, record the trail with
 * the result count. Shared by the typed-command path and
 * the voice tool-call path so both funnel through the one
 * `runQuery`. Returns the new model and the count (the
 * caller decides the Cmd — a tool call must answer).
 */
const applyQuery = (
  model: Model,
  vq: VariantQuery,
): readonly [Model, number] => {
  const count = runQuery(pagesOf(model), vq).length;
  return [
    {
      ...model,
      queries: routeSlot(model.queries, vq),
      changeSeq: model.changeSeq + 1,
      queryTrail: [
        ...model.queryTrail,
        ranTrail(vq, count),
      ],
    },
    count,
  ];
};

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
    case "QueryCalled": {
      const [next, count] = applyQuery(
        model,
        event.query,
      );
      return [
        next,
        toolReply(
          event.callId,
          JSON.stringify({
            ok: true,
            matched: count,
            note: "the matching pages are shown in that variant's pane — tell the reader how many and name a few",
          }),
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
    case "QuerySubmitted":
      return model.draft.trim() === ""
        ? [model, cmdNone()]
        : pipe(
            parseQueryCommand(model.draft),
            matchResult(
              (
                e: CommandError,
              ): readonly [Model, Cmd<Msg>] => [
                {
                  ...model,
                  draft: "",
                  queryTrail: [
                    ...model.queryTrail,
                    refusedTrail(
                      model.draft.trim(),
                      e.message,
                    ),
                  ],
                },
                cmdNone(),
              ],
              (
                vq: VariantQuery,
              ): readonly [Model, Cmd<Msg>] => [
                {
                  ...applyQuery(model, vq)[0],
                  draft: "",
                },
                cmdNone(),
              ],
            ),
          );
    case "QueryRequested":
      return [
        applyQuery(model, msg.query)[0],
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
            startSession(model.assets.ready.pages),
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

export const app: Sandbox<Model, Msg> = {
  init: [init, loadAssets],
  update,
  view,
  subscriptions,
};
