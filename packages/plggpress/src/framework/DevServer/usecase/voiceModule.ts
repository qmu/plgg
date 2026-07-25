import {
  type SoftStr,
  type Result,
  ok,
  err,
} from "plgg";
import { VOICE_MODULES } from "plggpress/framework/DevServer/model/VoiceProtocol";

// The authorization for the dev-only browser-module route: a
// WHITELIST, kept pure and total so the spec can prove it
// refuses everything it should. The node edge reads the file
// only after this function has named it, so no request path
// ever reaches the filesystem — a traversal segment, an
// extension, an unlisted sibling, and an empty name are all
// refused here, before any I/O exists.

/** Why a requested browser module was refused. */
export type VoiceModuleError = Readonly<{
  kind: "Unknown";
  message: SoftStr;
}>;

/**
 * The source file name a whitelisted module maps to, or a
 * typed refusal. The mapping is deliberately identity plus a
 * `.ts` suffix — a served module's URL name IS its file stem,
 * so the client's relative `./voiceProtocol` import resolves
 * against the same base with no rewrite table to drift.
 */
export const resolveVoiceModule = (
  requested: SoftStr,
): Result<SoftStr, VoiceModuleError> =>
  VOICE_MODULES.includes(requested)
    ? ok(`${requested}.ts`)
    : err({
        kind: "Unknown",
        message: `"${requested}" is not a dev voice module`,
      });
