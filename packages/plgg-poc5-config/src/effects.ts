/**
 * The IO edge of PoC 5 — every side effect the reducer
 * returns as a `Cmd` value, plus the data-channel `Sub`.
 * Kept OUT of the pure reducer (app.ts) so the domain stays
 * testable offline: the pages fetch, the Realtime mint +
 * open, and the tool round-trip all live here.
 * Coverage-exempt (a `Cmd` thunk's body only runs against a
 * live browser + server); the reducer that DECIDES which
 * effect to run is the tested part.
 */
import {
  type SoftStr,
  type Result,
  type InvalidError,
  ok,
  err,
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import {
  type Cmd,
  type Sub,
  cmdEffect,
  custom,
  subNone,
} from "plgg-view/client";
import {
  type Msg,
  type Model,
  type Ready,
} from "./app.ts";
import {
  type Config,
} from "./config.ts";
import {
  type Page,
  pagesFromPaths,
} from "./pages.ts";
import {
  type AgentEvent,
  instructionsOf,
  eventOf,
  CONFIG_TOOLS,
} from "./agent.ts";
import {
  type SessionGrant,
  asSessionGrant,
  asPagesIndex,
} from "./protocol.ts";
import {
  openRealtime,
  closeRealtime,
  sendToolOutput,
  subscribeRealtime,
} from "./vendors/realtime.ts";

const fetchJson = (
  path: SoftStr,
): Promise<unknown> =>
  fetch(path).then((res) =>
    res.ok
      ? res.json()
      : Promise.reject(
          new Error(`${path} → ${res.status}`),
        ),
  );

const configuredOf = (v: unknown): boolean =>
  typeof v === "object" &&
  v !== null &&
  Reflect.get(v, "configured") === true;

const errorTextOf = (
  status: number,
  json: unknown,
): SoftStr => {
  const message =
    typeof json === "object" && json !== null
      ? Reflect.get(json, "error")
      : undefined;
  return typeof message === "string"
    ? message
    : `request failed (${status})`;
};

const decodePages = (
  raw: unknown,
): Result<ReadonlyArray<Page>, Error> =>
  pipe(
    asPagesIndex(raw),
    matchResult(
      (e: InvalidError): Result<
        ReadonlyArray<Page>,
        Error
      > =>
        err(
          new Error(
            `the pages index has an unexpected shape: ${e.content.message}`,
          ),
        ),
      (
        index,
      ): Result<ReadonlyArray<Page>, Error> =>
        ok(pagesFromPaths(index.paths)),
    ),
  );

export const loadAssets: Cmd<Msg> = cmdEffect(
  () =>
    Promise.all([
      fetchJson("./index/pages.json"),
      fetch("./api/health")
        .then((res): Promise<unknown> =>
          res.ok
            ? res.json()
            : Promise.resolve({
                configured: false,
              }),
        )
        .catch((): unknown => ({
          configured: false,
        })),
    ]).then(
      ([pages, health]): Msg => ({
        kind: "AssetsLoaded",
        result: pipe(
          decodePages(pages),
          matchResult(
            (e: Error): Result<Ready, Error> =>
              err(e),
            (
              list: ReadonlyArray<Page>,
            ): Result<Ready, Error> =>
              ok({
                pages: list,
                configured: configuredOf(health),
              }),
          ),
        ),
      }),
      (cause): Msg => ({
        kind: "AssetsLoaded",
        result: err(
          cause instanceof Error
            ? cause
            : new Error(String(cause)),
        ),
      }),
    ),
);

/** Mint the ephemeral key, then open the session. */
const mintAndOpen = (
  instructions: SoftStr,
): Promise<Msg> =>
  fetch("./api/session", { method: "POST" })
    .then((res) =>
      res
        .json()
        .catch((): unknown => ({}))
        .then(
          (json: unknown): Promise<Msg> | Msg =>
            res.ok
              ? pipe(
                  asSessionGrant(json),
                  matchResult(
                    (
                      e: InvalidError,
                    ): Promise<Msg> | Msg => ({
                      kind: "SessionFailed",
                      reason: `the mint answered with an unexpected shape: ${e.content.message}`,
                    }),
                    (
                      grant: SessionGrant,
                    ): Promise<Msg> =>
                      openRealtime(grant.value, {
                        instructions,
                        tools: CONFIG_TOOLS,
                      }).then(
                        matchResult(
                          (
                            reason: SoftStr,
                          ): Msg => ({
                            kind: "SessionFailed",
                            reason,
                          }),
                          (): Msg => ({
                            kind: "SessionOpened",
                          }),
                        ),
                      ),
                  ),
                )
              : {
                  kind: "SessionFailed",
                  reason: errorTextOf(
                    res.status,
                    json,
                  ),
                },
        ),
    )
    .catch((cause): Msg => ({
      kind: "SessionFailed",
      reason:
        cause instanceof Error
          ? cause.message
          : String(cause),
    }));

/**
 * Start a session: build the instructions from the current
 * config + the pages' derived tags, then mint + open with
 * the five configuration tools.
 */
export const startSession = (
  config: Config,
  pages: ReadonlyArray<Page>,
): Cmd<Msg> =>
  cmdEffect(() =>
    mintAndOpen(
      instructionsOf(
        config,
        pages.flatMap((p) => p.tags),
      ),
    ),
  );

export const stopSession: Cmd<Msg> = cmdEffect(
  () => {
    closeRealtime();
    return Promise.resolve<Msg>({
      kind: "SessionClosed",
    });
  },
);

export const toolReply = (
  callId: SoftStr,
  output: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() => {
    sendToolOutput(callId, output);
    return Promise.resolve<Msg>({
      kind: "ToolReplied",
    });
  });

export const subscriptions = (
  model: Model,
): Sub<Msg> =>
  model.session.kind === "live" ||
  model.session.kind === "starting"
    ? custom("realtime", (dispatch) =>
        subscribeRealtime((raw) =>
          pipe(
            eventOf(raw),
            matchOption(
              (): void => undefined,
              (event: AgentEvent): void =>
                dispatch({
                  kind: "FromRealtime",
                  event,
                }),
            ),
          ),
        ),
      )
    : subNone();
