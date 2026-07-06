import {
  type Result,
  type Option,
  type SoftStr,
  type PromisedResult,
  type Defect,
  ok,
  err,
  some,
  none,
  matchOption,
  matchResult,
  defect,
} from "plgg";
import {
  type EphemeralKey,
  asEphemeralKey,
} from "plgg-kit/LLMs/model/EphemeralKey";

/**
 * The ephemeral-key provider seam (ticket 25, D12) — injected,
 * so the mint route never names a network client. Held as
 * `Option<KeyMinter>`: `None` = no operator key, and the whole
 * voice UI stays hidden (the server half of the no-key gate).
 */
export type KeyMinter = Readonly<{
  mint: () => PromisedResult<
    EphemeralKey,
    Defect
  >;
}>;

/**
 * Config for the realtime mint. `apiKey` is the ONLY gate:
 * absent → no {@link KeyMinter} → no voice agent. `model`/
 * `endpoint` name the OpenAI realtime sessions API.
 */
export type MinterConfig = Readonly<{
  apiKey: Option<SoftStr>;
  model: SoftStr;
  endpoint: SoftStr;
}>;

/**
 * The REAL network {@link KeyMinter} — a `fetch` to OpenAI's
 * `realtime/sessions` with the STANDING key, returning a
 * short-lived client key. Node-only seam, coverage-excluded;
 * every failure (transport, non-2xx, malformed body) becomes a
 * `Defect` so the mint route answers cleanly rather than
 * throwing, and the standing secret never leaves the server.
 */
export const realtimeKeyMinter = (
  apiKey: SoftStr,
  model: SoftStr,
  endpoint: SoftStr,
): KeyMinter => ({
  mint: async () => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) {
        return err(
          defect(
            `realtime session HTTP ${res.status}`,
          ),
        );
      }
      return matchResult<
        EphemeralKey,
        { content: { message: string } },
        Result<EphemeralKey, Defect>
      >(
        () =>
          err(
            defect(
              "malformed realtime session response",
            ),
          ),
        (key: EphemeralKey) => ok(key),
      )(asEphemeralKey(await res.json()));
    } catch (cause) {
      return err(
        defect(
          "realtime session request failed",
          cause,
        ),
      );
    }
  },
});

/**
 * Build the `Option<KeyMinter>` the mint route runs on. `Some`
 * only when an `apiKey` is configured — the single gate that
 * keeps the voice agent (and its whole UI) dark for an operator
 * with no key.
 */
export const minterFromConfig = (
  config: MinterConfig,
): Option<KeyMinter> =>
  matchOption<SoftStr, Option<KeyMinter>>(
    () => none(),
    (key: SoftStr) =>
      some(
        realtimeKeyMinter(
          key,
          config.model,
          config.endpoint,
        ),
      ),
  )(config.apiKey);
