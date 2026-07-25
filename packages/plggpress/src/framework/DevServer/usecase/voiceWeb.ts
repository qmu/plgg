import {
  type SoftStr,
  type Option,
  type Result,
  type Defect,
  type PromisedResult,
  ok,
  isSome,
  pipe,
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
import { VOICE_NOT_CONFIGURED } from "plggpress/framework/DevServer/model/VoiceProtocol";

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

/**
 * `POST /__plggpress_voice/session` — mint ONE short-lived
 * Realtime grant from the server-held standing key and answer
 * `{ value, expiresAt }`. The standing key is never part of
 * the response.
 *
 * Three outcomes, each named: no operator key ⇒ 404 with the
 * actionable reason; the upstream mint failed ⇒ 502 carrying
 * the `Defect`'s message; success ⇒ 200 with the grant alone.
 */
export const voiceSessionHandler =
  (minter: Option<KeyMinter>): Handler =>
  (
    _c: Context,
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
          configured.mint().then(
            matchResult(
              (
                cause: Defect,
              ): Result<
                HttpResponse,
                HttpError
              > =>
                ok(
                  refuse(
                    502,
                    `could not mint a realtime key: ${cause.content.message}`,
                  ),
                ),
              (
                grant: EphemeralKey,
              ): Result<
                HttpResponse,
                HttpError
              > =>
                ok(
                  jsonResponse(
                    {
                      value: grant.value,
                      expiresAt: grant.expiresAt,
                    },
                    statusOf(200),
                  ),
                ),
            ),
          ),
      ),
    );
