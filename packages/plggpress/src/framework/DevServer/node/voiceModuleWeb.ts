import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type SoftStr,
  type Result,
  type Option,
  type InvalidError,
  type PromisedResult,
  ok,
  some,
  none,
  pipe,
  tryCatch,
  invalidError,
  matchOption,
  matchResult,
} from "plgg";
import {
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  textResponse,
  jsonResponse,
  statusOf,
  param,
} from "plggpress/framework";
import {
  type VoiceModuleError,
  resolveVoiceModule,
} from "plggpress/framework/DevServer/usecase/voiceModule";
import { VOICE_MODULE_PARAM } from "plggpress/framework/DevServer/model/VoiceProtocol";

// The DEV-ONLY browser-module route. plggpress ships the voice
// client as REAL TypeScript on disk
// (`framework/DevServer/browser/*.ts`) rather than a `<script>`
// string constant, so it is type-checked by the package's own
// `tsc --noEmit` and its pure half is unit-tested from Node.
// Serving it costs one call to Node's built-in type stripper —
// no bundler, no build step, no new dependency, and no
// generated artifact on disk. The browser modules are
// import-free apart from their own relative siblings, which is
// exactly why plain stripping (not bundling) suffices.
//
// Reached ONLY through the whitelist in the pure
// `resolveVoiceModule`; this file never joins a request string
// onto a path.

const BROWSER_DIR: SoftStr = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "browser",
);

const missing = (
  message: SoftStr,
): HttpResponse =>
  jsonResponse({ error: message }, statusOf(404));

/** The stripped ES-module text of one browser source file. */
const strippedSource = (
  file: SoftStr,
): Option<SoftStr> =>
  pipe(
    tryCatch(
      (name: SoftStr): SoftStr =>
        stripTypeScriptTypes(
          readFileSync(
            join(BROWSER_DIR, name),
            "utf8",
          ),
          { mode: "strip" },
        ),
      (cause): InvalidError =>
        invalidError({
          message: "browser module unreadable",
          cause,
        }),
    )(file),
    matchResult(
      (): Option<SoftStr> => none(),
      (code: SoftStr): Option<SoftStr> =>
        some(code),
    ),
  );

/**
 * `GET /__plggpress_voice/module/:name` — serve one
 * whitelisted dev browser module as an ES module. An unlisted
 * name (or an unreadable file) is a 404 with a named reason;
 * nothing else on the filesystem is reachable from here.
 *
 * `no-store`, because the point of the dev surface is that an
 * edit to the client is picked up on the next reload.
 */
export const voiceModuleWeb =
  (): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    Promise.resolve(
      pipe(
        param(VOICE_MODULE_PARAM)(c),
        matchOption(
          (): Result<HttpResponse, HttpError> =>
            ok(missing("no module was named")),
          (
            name: SoftStr,
          ): Result<HttpResponse, HttpError> =>
            pipe(
              resolveVoiceModule(name),
              matchResult(
                (
                  refusal: VoiceModuleError,
                ): Result<
                  HttpResponse,
                  HttpError
                > => ok(missing(refusal.message)),
                (
                  file: SoftStr,
                ): Result<
                  HttpResponse,
                  HttpError
                > =>
                  pipe(
                    strippedSource(file),
                    matchOption(
                      (): Result<
                        HttpResponse,
                        HttpError
                      > =>
                        ok(
                          missing(
                            `${file} could not be read`,
                          ),
                        ),
                      (
                        code: SoftStr,
                      ): Result<
                        HttpResponse,
                        HttpError
                      > =>
                        ok(
                          textResponse(
                            code,
                            statusOf(200),
                            {
                              "content-type":
                                "text/javascript; charset=utf-8",
                              "cache-control":
                                "no-store",
                            },
                          ),
                        ),
                    ),
                  ),
              ),
            ),
        ),
      ),
    );
