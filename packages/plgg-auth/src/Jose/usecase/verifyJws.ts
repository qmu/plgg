import {
  Bin,
  SoftStr,
  Str,
  Result,
  err,
  isErr,
  pipe,
  chainResult,
  matchResult,
  mapErr,
  matchOption,
} from "plgg";
import {
  utf8String,
  utf8Bytes,
  decodeBase64Url,
  toBufferSource,
} from "plgg-auth/Jose/model/Base64Url";
import {
  RsaPublicJwk,
  rs256Params,
} from "plgg-auth/Jose/model/Jwk";
import {
  Jwks,
  findJwk,
} from "plgg-auth/Jose/model/Jwks";
import {
  CompactJws,
  JwsParts,
  parseCompactJws,
  jwsHeaderOfParts,
  decodeJwsHeader,
} from "plgg-auth/Jose/model/CompactJws";
import {
  JoseError,
  algMismatch,
  unknownKid,
  verifyFailure,
  joseErrorFromInvalid,
  liftJose,
} from "plgg-auth/Jose/model/JoseError";
import { signingInput } from "plgg-auth/Jose/usecase/signJws";
import { importVerifyKey } from "plgg-auth/Jose/usecase/importRsaKey";

const decodePayload = (
  parts: JwsParts,
): Result<SoftStr, JoseError> =>
  pipe(
    decodeBase64Url(parts.payload),
    mapErr(joseErrorFromInvalid("DecodeFailure")),
    chainResult((bytes: Bin) =>
      pipe(
        utf8String(bytes),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
  );

/**
 * Verifies a compact JWS against one explicit
 * public key and returns the payload as a UTF-8
 * string. Rejects any `alg` other than RS256
 * before touching the key — `none` and downgrade
 * headers never reach the crypto. Async-shell
 * style: the staged `await`s short-circuit on
 * `Err` through `matchResult`/`chainResult`.
 */
export const verifyJwsWith =
  (key: RsaPublicJwk) =>
  async (
    jws: CompactJws,
  ): Promise<Result<SoftStr, JoseError>> => {
    const parts = parseCompactJws(jws);
    if (isErr(parts)) {
      return parts;
    }
    const header = jwsHeaderOfParts(
      parts.content,
    );
    if (isErr(header)) {
      return header;
    }
    const alg = header.content.alg.content;
    if (alg !== "RS256") {
      return err(
        algMismatch(
          `unsupported JWS alg "${alg}" (this library verifies RS256 only)`,
        ),
      );
    }
    const signature = pipe(
      decodeBase64Url(parts.content.signature),
      mapErr(
        joseErrorFromInvalid("DecodeFailure"),
      ),
    );
    if (isErr(signature)) {
      return signature;
    }
    return pipe(
      await importVerifyKey(key),
      matchResult(
        (
          e: JoseError,
        ): Promise<Result<SoftStr, JoseError>> =>
          Promise.resolve(err(e)),
        (cryptoKey: CryptoKey) =>
          liftJose<boolean>("VerifyFailure")(() =>
            crypto.subtle.verify(
              rs256Params.name,
              cryptoKey,
              toBufferSource(signature.content),
              toBufferSource(
                utf8Bytes(
                  signingInput(
                    parts.content.header,
                    parts.content.payload,
                  ),
                ),
              ),
            ),
          ).then(
            chainResult((valid: boolean) =>
              valid
                ? decodePayload(parts.content)
                : err(
                    verifyFailure(
                      "JWS signature does not verify over the signing input",
                    ),
                  ),
            ),
          ),
      ),
    );
  };

/**
 * Verifies a compact JWS by resolving its header
 * `kid` in a {@link Jwks} — the JWKS-document
 * verification path. A missing or unmatched
 * `kid` is an `UnknownKid` failure, never a
 * fallback to "try every key".
 */
export const verifyJws =
  (set: Jwks) =>
  async (
    jws: CompactJws,
  ): Promise<Result<SoftStr, JoseError>> =>
    pipe(
      decodeJwsHeader(jws),
      matchResult(
        (
          e: JoseError,
        ): Promise<Result<SoftStr, JoseError>> =>
          Promise.resolve(err(e)),
        (header) =>
          matchOption(
            (): Promise<
              Result<SoftStr, JoseError>
            > =>
              Promise.resolve(
                err(
                  unknownKid(
                    "JWS header carries no kid to resolve against the JWKS",
                  ),
                ),
              ),
            (kid: Str) =>
              matchOption(
                (): Promise<
                  Result<SoftStr, JoseError>
                > =>
                  Promise.resolve(
                    err(
                      unknownKid(
                        `no JWK in the set matches kid "${kid.content}"`,
                      ),
                    ),
                  ),
                (key: RsaPublicJwk) =>
                  verifyJwsWith(key)(jws),
              )(findJwk(kid.content)(set)),
          )(header.kid),
      ),
    );
