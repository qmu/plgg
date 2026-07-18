import {
  Result,
  ok,
  err,
  invalidError,
} from "plgg";
import {
  TokenCount,
  countOf,
} from "plgg-token-metering/domain/model/TokenCount";
import { MeteringError } from "plgg-token-metering/domain/model/MeteringError";

/**
 * The pixel dimensions of an image input.
 */
export type ImageSize = Readonly<{
  width: number;
  height: number;
}>;

/**
 * Anthropic's published image-token conversion: `width × height / 750`.
 *
 * Formula-based, not BPE — image inputs do not go through a tokenizer, so this
 * is a separate conversion behind the same package boundary.
 *
 * EVIDENCE. The article's probe counted a 300×300 PNG on Anthropic's
 * count_tokens endpoint at 124 tokens. This formula gives 300 × 300 / 750 =
 * 120 content tokens, and Claude's fitted message overhead is 4, so 120 + 4 =
 * 124 — the probe agrees with the published formula exactly. That is ONE point
 * of agreement, not a calibration: this function returns the CONTENT tokens
 * (120), and the caller adds the same framing overhead a text request pays.
 *
 * LIMITS, stated rather than hidden:
 *
 * - Anthropic documents that large images are automatically downscaled before
 *   conversion, which caps the count. The article does not record the
 *   threshold, so this function does NOT model it: above that (unknown) size
 *   the true count is LOWER than this returns. Over-reporting is the safe
 *   direction for a budget check and the wrong direction for an invoice.
 * - The rounding rule at non-integer results is unvalidated — the single probe
 *   point divides exactly. `Math.ceil` is used because a partial tile is
 *   charged, not discarded; if a future run measures a fractional case, this is
 *   the line to correct.
 *
 * Source: docs/research-reports/token-metering-comparison, §5 edge case 4 and
 * §7 edge-case probes.
 */
export const anthropicImageContentTokens = ({
  width,
  height,
}: ImageSize): Result<
  TokenCount,
  MeteringError
> =>
  !Number.isFinite(width) ||
  !Number.isFinite(height) ||
  width <= 0 ||
  height <= 0
    ? err(
        invalidError({
          message:
            "ImageSize width and height must be positive finite numbers",
        }),
      )
    : ok(
        countOf(
          Math.ceil((width * height) / 750),
        ),
      );

/**
 * Google Gemini and OpenAI image conversions are deliberately NOT implemented.
 *
 * This constant exists to make the omission greppable from code rather than
 * only from the README, because "the function is missing" reads as an oversight
 * and this is a decision.
 *
 * - GOOGLE: the documented rule is a flat 258 tokens per image up to 384px. The
 *   article's probe of a 300×300 PNG — inside that range, so the rule predicts
 *   258 — returned 1089 on Gemini's own countTokens endpoint, a 4.2× disagreement
 *   the article records without resolving. Shipping the documented formula would
 *   return a number the provider's own endpoint contradicts; shipping 1089 would
 *   extrapolate a formula from a single point. Neither is a measurement, so
 *   neither ships.
 * - OPENAI: documented as a base-plus-tiles schedule per model family. The
 *   article states that it exists but records none of its constants, so there is
 *   nothing here to implement from.
 *
 * The honest path for both: read the token count from the provider's response
 * usage field after the call (post-run accounting is exact), or add a probe to
 * the research topic's next run and implement from the result.
 */
export const UNIMPLEMENTED_IMAGE_CONVERSIONS: ReadonlyArray<string> =
  ["google-gemini", "openai-gpt"];
