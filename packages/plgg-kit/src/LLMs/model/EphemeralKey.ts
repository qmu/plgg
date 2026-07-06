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
 * Decode an OpenAI `realtime/sessions` response — shape
 * `{ client_secret: { value, expires_at } }` — into an
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
      forProp(
        "client_secret",
        (cs: unknown) =>
          cast(
            cs,
            asRawObj,
            forProp("value", asSoftStr),
            forProp("expires_at", asNum),
          ),
      ),
    ),
    mapResult(
      (r: {
        client_secret: {
          value: SoftStr;
          expires_at: Num;
        };
      }): EphemeralKey => ({
        value: r.client_secret.value,
        expiresAt: r.client_secret.expires_at,
      }),
    ),
  );
