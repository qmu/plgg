import { type SoftStr } from "plgg";

// The wire contract of the dev server's VOICE surface — the
// dev-only seam that lets a writer talk to an assistant which
// is "on the same page" as the open document. Pure constants
// (no `node:*`, no network) so the shape is unit-testable and
// the effectful halves stay at their own edges.
//
// The ONE key-bearing route is `VOICE_SESSION_PATH`: the
// server mints a SHORT-LIVED Realtime client secret from its
// standing `OPENAI_API_KEY` and answers only that grant. The
// standing key is never echoed, never bundled, and never
// reaches a production `build` — a static site has no
// key-bearing seam at all, and these routes are mounted by
// the dev server alone.
//
// Absolute (not base-prefixed), like the reload channel and
// the patch bridge: the dev server mounts them at the process
// root regardless of the site's deploy base.

/**
 * `GET` — whether this dev surface can run the assistant at
 * all (`{ configured }`). The browser asks before drawing any
 * affordance, so a keyless dev run shows nothing rather than
 * a button that always fails.
 */
export const VOICE_HEALTH_PATH: SoftStr =
  "/__plggpress_voice/health";

/**
 * `POST` — mint one ephemeral Realtime grant. The ONLY
 * key-bearing route; an unconfigured surface answers an
 * honest 404 rather than pretending.
 */
export const VOICE_SESSION_PATH: SoftStr =
  "/__plggpress_voice/session";

/**
 * The OpenAI model the minted grant is scoped to. Named here
 * (not at the node edge) so the wire contract states it once.
 */
export const VOICE_MODEL: SoftStr =
  "gpt-realtime";

/**
 * The GA client-secret endpoint the mint posts to. The pre-GA
 * `/v1/realtime/sessions` path is retired (it answers 404 —
 * measured live 2026-07-12), so this constant is the only
 * supported one.
 */
export const VOICE_MINT_ENDPOINT: SoftStr =
  "https://api.openai.com/v1/realtime/client_secrets";

/**
 * What an unconfigured surface answers a mint request with —
 * an ACTIONABLE reason, since "no assistant" is a legitimate,
 * fully-supported way to run `plggpress dev`.
 */
export const VOICE_NOT_CONFIGURED: SoftStr =
  "the voice assistant is not configured — set OPENAI_API_KEY before `plggpress dev`";
