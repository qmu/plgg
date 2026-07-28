import {
  type SoftStr,
  type Option,
  type Result,
  type Defect,
  type InvalidError,
  type PromisedResult,
  ok,
  isSome,
  pipe,
  tryCatch,
  invalidError,
  chainResult,
  matchOption,
  matchResult,
} from "plgg";
import {
  type EphemeralKey,
  type KeyMinter,
} from "plgg-kit";
import {
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  jsonResponse,
  statusOf,
} from "plggpress/framework";
import {
  type VoiceSessionRequest,
  VOICE_NOT_CONFIGURED,
  asVoiceSessionRequest,
} from "plggpress/framework/DevServer/model/VoiceProtocol";
import {
  type OpenDoc,
  type OpenDocReader,
} from "plggpress/framework/DevServer/usecase/voiceDoc";
import {
  voiceInstructionsOf,
  voiceToolsOf,
} from "plggpress/framework/DevServer/usecase/voiceInstructions";

// The DEV-ONLY voice routes, as PURE handlers over an
// INJECTED `Option<KeyMinter>`. Injection is what keeps this
// module honest and offline-testable: nothing here names
// `process.env`, `fetch`, or OpenAI — a spec hands over a
// stub minter and asserts every outcome without a live call.
//
// The security shape is the plgg-cms `agentWeb` contract,
// promoted: the browser only ever receives a SHORT-LIVED
// grant, and an unconfigured surface answers an honest 404
// rather than a route that pretends to exist.

// Every outcome — grant, refusal, upstream failure — is a
// normal HTTP response with a typed report body, never an
// `HttpError`: the browser is told what happened and why.
const done = (
  res: HttpResponse,
): PromisedResult<HttpResponse, HttpError> =>
  Promise.resolve(ok(res));

const refuse = (
  status: number,
  message: SoftStr,
): HttpResponse =>
  jsonResponse(
    { error: message },
    statusOf(status),
  );

/**
 * `GET /__plggpress_voice/health` — can this dev surface run
 * the assistant? Answered whether or not a key is set, so the
 * browser can decide to draw nothing at all instead of
 * offering an affordance that could only fail.
 */
export const voiceHealthHandler =
  (minter: Option<KeyMinter>): Handler =>
  (
    _c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    done(
      jsonResponse(
        { configured: isSome(minter) },
        statusOf(200),
      ),
    );

const parseJson = (
  raw: SoftStr,
): Result<unknown, InvalidError> =>
  tryCatch(
    (text: SoftStr): unknown => JSON.parse(text),
    (cause): InvalidError =>
      invalidError({
        message: "body is not JSON",
        cause,
      }),
  )(raw);

// Mint, then answer the grant TOGETHER with everything the
// browser needs to start a grounded session: the instructions
// (built here, from the resolved document) and the one file
// the assistant's edits may target.
const grantFor = (
  configured: KeyMinter,
  doc: Option<OpenDoc>,
  routes: ReadonlyArray<SoftStr>,
): PromisedResult<HttpResponse, HttpError> =>
  configured.mint().then(
    matchResult(
      (
        cause: Defect,
      ): Result<HttpResponse, HttpError> =>
        ok(
          refuse(
            502,
            `could not mint a realtime key: ${cause.content.message}`,
          ),
        ),
      (
        grant: EphemeralKey,
      ): Result<HttpResponse, HttpError> =>
        ok(
          jsonResponse(
            {
              value: grant.value,
              expiresAt: grant.expiresAt,
              instructions: voiceInstructionsOf(
                doc,
                routes,
              ),
              tools: voiceToolsOf(doc, routes),
              doc: pipe(
                doc,
                matchOption(
                  (): SoftStr => "",
                  (open: OpenDoc): SoftStr =>
                    open.path,
                ),
              ),
            },
            statusOf(200),
          ),
        ),
    ),
  );

/**
 * `POST /__plggpress_voice/session` — mint ONE short-lived
 * Realtime grant from the server-held standing key and answer
 * it together with the session's grounding: the instructions
 * quoting the document behind the route the browser is on, and
 * that document's content-root-relative path. The standing key
 * is never part of the response.
 *
 * Every outcome is named: no operator key ⇒ 404 with the
 * actionable reason; an unreadable body ⇒ 400; the upstream
 * mint failed ⇒ 502 carrying the `Defect`'s message; success ⇒
 * 200 with the grant and its grounding.
 *
 * A route with no document behind it still starts a session —
 * ungrounded, and the instructions say so — because refusing
 * would make the assistant unavailable on exactly the pages a
 * writer is most likely to be creating.
 */
export const voiceSessionHandler =
  (
    minter: Option<KeyMinter>,
    readDoc: OpenDocReader,
    routes: ReadonlyArray<SoftStr> = [],
  ): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    pipe(
      minter,
      matchOption(
        (): PromisedResult<
          HttpResponse,
          HttpError
        > =>
          done(refuse(404, VOICE_NOT_CONFIGURED)),
        (
          configured: KeyMinter,
        ): PromisedResult<
          HttpResponse,
          HttpError
        > =>
          pipe(
            parseJson(c.req.body),
            chainResult(asVoiceSessionRequest),
            matchResult(
              (
                e: InvalidError,
              ): PromisedResult<
                HttpResponse,
                HttpError
              > =>
                done(
                  refuse(
                    400,
                    `the session body must be {route}: ${e.content.message}`,
                  ),
                ),
              (
                request: VoiceSessionRequest,
              ): PromisedResult<
                HttpResponse,
                HttpError
              > =>
                readDoc(request.route).then(
                  (doc: Option<OpenDoc>) =>
                    grantFor(
                      configured,
                      doc,
                      routes,
                    ),
                ),
            ),
          ),
      ),
    );
