import {
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
} from "plgg";
import {
  TokenCount,
  countOf,
} from "plgg-token-metering/domain/model/TokenCount";
import {
  ByTextClass,
  TextClass,
  TEXT_CLASSES,
} from "plgg-token-metering/domain/model/TextClass";
import { ErrorBand } from "plgg-token-metering/domain/model/Accuracy";

/**
 * The fitted parameters one family's counting uses, lifted verbatim from the
 * measuring run's data artifact.
 *
 * The counting model is affine and shared by both methods:
 *
 *   predicted = contentTokens + overheadTokens
 *
 * where `contentTokens` is the exact self-BPE count (exact families) or
 * `round(tokensPerChar[class] × chars)` (estimator families).
 *
 * `overheadTokens` is the provider's message-framing cost (chat template, role
 * headers), which no provider documents; it is FITTED from the calibration rows
 * and therefore assumes the single-user-message request shape the measurement
 * used. A different request shape (system prompt, multi-turn history, tool
 * definitions) carries a different framing cost this constant does not model.
 *
 * `tokensPerChar` is the predictor for estimator families and a descriptive
 * statistic for exact families (which is why exact cards carry it too).
 */
export type Calibration = Readonly<{
  overheadTokens: TokenCount;
  tokensPerChar: ByTextClass<number>;
  /** The measured signed holdout error band, per class. */
  bands: ByTextClass<ErrorBand>;
  /** Mean absolute holdout error over all classes, percent. */
  meanAbsErrorPct: number;
  /** Max absolute holdout error over all classes, percent. */
  maxAbsErrorPct: number;
  /** Whether every class met the ±5% target. */
  withinTargetPct: boolean;
}>;

const isBadRate = (rate: number): boolean =>
  !Number.isFinite(rate) || rate < 0;

/**
 * Constructs a {@link Calibration}. Rejects a negative or non-finite rate — a
 * model predicting fewer tokens for more text would be incoherent — and a
 * negative fitted overhead.
 */
export const calibration = ({
  overheadTokens,
  tokensPerChar,
  bands,
  meanAbsErrorPct,
  maxAbsErrorPct,
  withinTargetPct,
}: {
  overheadTokens: number;
  tokensPerChar: ByTextClass<number>;
  bands: ByTextClass<ErrorBand>;
  meanAbsErrorPct: number;
  maxAbsErrorPct: number;
  withinTargetPct: boolean;
}): Result<Calibration, InvalidError> =>
  TEXT_CLASSES.some((textClass) =>
    isBadRate(tokensPerChar[textClass]),
  )
    ? err(
        invalidError({
          message:
            "Calibration tokensPerChar rates must be non-negative finite numbers",
        }),
      )
    : !Number.isInteger(overheadTokens) ||
        overheadTokens < 0
      ? err(
          invalidError({
            message:
              "Calibration overheadTokens must be a non-negative integer",
          }),
        )
      : ok({
          overheadTokens: countOf(overheadTokens),
          tokensPerChar,
          bands,
          meanAbsErrorPct,
          maxAbsErrorPct,
          withinTargetPct,
        });

/**
 * Reads the tokens-per-character rate for one class.
 */
export const rateFor =
  (textClass: TextClass) =>
  (fitted: Calibration): number =>
    fitted.tokensPerChar[textClass];

/**
 * Reads the measured signed error band for one class.
 */
export const bandFor =
  (textClass: TextClass) =>
  (fitted: Calibration): ErrorBand =>
    fitted.bands[textClass];
