import {
  type Result,
  type Num,
  type SoftStr,
  type InvalidError,
  pipe,
  cast,
  mapResult,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
} from "plgg";

/**
 * A short-lived client key for the OpenAI Realtime API (ticket
 * 25, D12). Minted server-side from the operator's standard key
 * and handed to the browser so the standing secret NEVER
 * touches the client. `value` is the ephemeral token;
 * `expiresAt` is its unix expiry.
 */
export type EphemeralKey = Readonly<{
  value: SoftStr;
  expiresAt: Num;
}>;

/**
 * Decode a GA `realtime/client_secrets` response — shape
 * `{ value, expires_at, session: {…} }`, the key fields at the
 * TOP level (the pre-GA `client_secret` wrapper is gone; PoC 3
 * measured the retirement live, 2026-07-12) — into an
 * {@link EphemeralKey}, FAIL-CLOSED: a response missing either
 * field is a typed `Err`, never a partial key, so a malformed
 * upstream reply can't hand the browser a broken token.
 */
export const asEphemeralKey = (
  v: unknown,
): Result<EphemeralKey, InvalidError> =>
  pipe(
    cast(
      v,
      asRawObj,
      forProp("value", asSoftStr),
      forProp("expires_at", asNum),
    ),
    mapResult(
      (r: {
        value: SoftStr;
        expires_at: Num;
      }): EphemeralKey => ({
        value: r.value,
        expiresAt: r.expires_at,
      }),
    ),
  );
