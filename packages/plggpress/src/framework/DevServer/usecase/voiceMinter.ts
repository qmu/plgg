import {
  type SoftStr,
  type Option,
  none,
  some,
  pipe,
  fromNullable,
  chainOption,
} from "plgg";
import {
  type KeyMinter,
  minterFromConfig,
} from "plgg-kit";
import {
  VOICE_MODEL,
  VOICE_MINT_ENDPOINT,
} from "plggpress/framework/DevServer/model/VoiceProtocol";

// The single gate that decides whether `plggpress dev` can
// offer a voice assistant at all: does the OPERATOR hold a
// standing OpenAI key? Absent ⇒ `None` ⇒ no mint route, no
// client, no panel — dev runs exactly as it did before the
// assistant existed.
//
// The environment is INJECTED rather than read from
// `process.env` here, so the gate is an ordinary total
// function the specs exercise both ways. The node edge (the
// dev server) is the only place that names the real process
// environment.
//
// The minter itself is plgg-kit's `minterFromConfig` — the
// same GA `client_secrets` seam plgg-cms's agent surface and
// PoC 3 both run on. There is no second minter in this
// repository, and there must not be one.

/** The environment variable holding the operator's standing key. */
export const VOICE_KEY_VAR: SoftStr =
  "OPENAI_API_KEY";

/**
 * The shape of an environment this gate can read — Node's
 * `process.env` satisfies it, and a spec can hand over a
 * plain object instead.
 */
export type VoiceEnv = Readonly<
  Record<string, SoftStr | undefined>
>;

/**
 * The standing key IF the operator set a non-blank one. A
 * variable present but empty (`OPENAI_API_KEY=`) is the same
 * as absent: an operator who blanked it meant to turn the
 * assistant off, not to hand the mint an empty bearer token.
 */
export const voiceApiKeyOf = (
  env: VoiceEnv,
): Option<SoftStr> =>
  pipe(
    fromNullable(env[VOICE_KEY_VAR]),
    chainOption(
      (key: SoftStr): Option<SoftStr> =>
        key.trim() === "" ? none() : some(key),
    ),
  );

/**
 * The `Option<KeyMinter>` the dev surface runs its voice
 * routes on. `None` keeps the whole assistant dark; `Some`
 * mints short-lived grants against the GA client-secret
 * endpoint, so the standing key never leaves this process.
 */
export const voiceMinterFrom = (
  env: VoiceEnv,
): Option<KeyMinter> =>
  minterFromConfig({
    apiKey: voiceApiKeyOf(env),
    model: VOICE_MODEL,
    endpoint: VOICE_MINT_ENDPOINT,
  });
