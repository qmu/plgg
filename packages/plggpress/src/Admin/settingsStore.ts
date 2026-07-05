import {
  type SoftStr,
  type Box,
  type Option,
  type PromisedResult,
  type Defect,
  box,
  some,
  none,
  isSome,
  ok,
  proc,
} from "plgg";

/**
 * What the API/UI may reveal about the operator LLM key —
 * NEVER the plaintext, only whether one is set. Masking lives
 * in the type: there is no variant that carries the secret.
 */
export type LlmKeyStatus = "configured" | "absent";

export type SettingsError = Box<
  "SettingsError",
  { message: SoftStr }
>;

export const settingsError = (
  message: SoftStr,
): SettingsError =>
  box("SettingsError")({ message });

/**
 * The runtime settings seam. The operator LLM API key is
 * WRITE-ONLY: `setLlmKey` validates then stores it, and the
 * ONLY read is `llmKeyStatus` → `configured | absent`. There
 * is no getter for the plaintext — it cannot appear in a URL,
 * a log, or a client response because nothing returns it.
 * Kept off `SiteConfig` and the content index (operator/runtime
 * state, not corpus). Encryption/rotation is deferred to
 * ticket 28, which wraps a store built to this same shape.
 */
export type SettingsStore = Readonly<{
  setLlmKey: (
    key: SoftStr,
  ) => PromisedResult<
    null,
    SettingsError | Defect
  >;
  llmKeyStatus: () => LlmKeyStatus;
}>;

/**
 * An in-process settings store. `validate` is the injected
 * key-check seam (the plgg-kit key resolution wires in here) —
 * the key is stored ONLY after it validates, so an invalid key
 * never lands and the status never lies. The stored value is
 * closure-private; the returned object exposes no path to read
 * it back.
 */
export const memorySettingsStore = (
  validate: (
    key: SoftStr,
  ) => PromisedResult<null, SettingsError>,
): SettingsStore => {
  let stored: Option<SoftStr> = none();
  return {
    setLlmKey: (key: SoftStr) =>
      proc(validate(key), () => {
        stored = some(key);
        return ok(null);
      }),
    llmKeyStatus: () =>
      isSome(stored) ? "configured" : "absent",
  };
};
