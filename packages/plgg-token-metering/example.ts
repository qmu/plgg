/**
 * A runnable tour of plgg-token-metering, in the two shapes a consumer meets:
 * counting with an estimator family (Claude — a count that carries a band), and
 * post-run pricing with the breakdown kept.
 *
 * The exact-BPE path is not shown end to end because it needs the caller to load
 * a ~3.6 MB published vocabulary, which this example will not download — see
 * README, Counting, and DEPENDENCY-LOG.md.
 *
 * Run: npx tsx example.ts
 */
import {
  pipe,
  match,
  matchResult,
  chainResult,
} from "plgg";
import {
  cardFor,
  pricesFor,
  modelId,
  estimatorCounter,
  countTokens,
  estimateCost,
  tokenUsage,
  countOf,
  tokenBounds,
  estimateTokens,
  estimateAccuracy,
  tokenCountValue,
  usdAmountValue,
  exactTokenCount$,
  estimatedTokenCount$,
  ExactTokenCount,
  EstimatedTokenCount,
  TokenEstimate,
  MeteringError,
  ModelCard,
  TokenCounter,
  CostBreakdown,
  ModelPrices,
} from "plgg-token-metering/index";

const report = (line: string): void => {
  console.log(line);
};

/**
 * Every failure in this package is a value, so the whole tour folds to a string
 * — nothing throws, and the error channel is just the other branch.
 */
const failed = (error: MeteringError): string =>
  `failed: ${error.__tag}`;

/**
 * The fold a caller cannot skip: an exact count and an estimate are different
 * variants, so reading "the number" means saying which one you have.
 */
const describe = (
  estimate: TokenEstimate,
): string =>
  match(estimate)(
    [
      exactTokenCount$(),
      (value: ExactTokenCount): string =>
        `exact BPE — ${tokenCountValue(value.content.tokens)} tokens (${tokenCountValue(value.content.contentTokens)} content + ${tokenCountValue(value.content.overheadTokens)} framing)`,
    ],
    [
      estimatedTokenCount$(),
      (value: EstimatedTokenCount): string =>
        `calibrated ESTIMATE — ${tokenCountValue(value.content.tokens)} tokens`,
    ],
  );

const describeCount = (
  estimate: TokenEstimate,
): string => {
  const bounds = tokenBounds(estimate);
  const accuracy = estimateAccuracy(estimate);
  return [
    `  ${describe(estimate)}`,
    `  point ${tokenCountValue(estimateTokens(estimate))}, plausible reported range [${tokenCountValue(bounds.lower)}, ${tokenCountValue(bounds.upper)}]`,
    `  measured band for this class: [${accuracy.band.minPct}%, ${accuracy.band.maxPct}%]`,
    `  meets the ±5% target? ${accuracy.withinTargetPct} — family holdout ${accuracy.meanAbsErrorPct}% mean / ${accuracy.maxAbsErrorPct}% max`,
    `  source: ${accuracy.source}`,
  ].join("\n");
};

// Counting: card -> counter -> count. Each step returns a Result, so the whole
// chain is one pipe and the error is folded once at the end.
report(
  "counting a Japanese prompt for claude-sonnet-5",
);
report(
  pipe(
    cardFor(modelId("claude-sonnet-5")),
    chainResult((card: ModelCard) =>
      estimatorCounter({ card }),
    ),
    chainResult((counter: TokenCounter) =>
      countTokens({
        text: "これは日本語のプロンプトです。トークン数を数えます。",
        textClass: "japanese",
      })(counter),
    ),
    matchResult(failed, describeCount),
  ),
);

const describeCost = (
  cost: CostBreakdown,
): string =>
  [
    `  input:  $${usdAmountValue(cost.input)}`,
    `  output: $${usdAmountValue(cost.output)}`,
    `  total:  $${usdAmountValue(cost.total)}`,
    `  rates read from: ${cost.prices.source} (${cost.prices.retrievedAt})`,
  ].join("\n");

// Pricing: the response's usage field is exact, so this is the amount actually
// billed — unlike the pre-run interval `projectCost` returns.
report(
  "\npricing 1,200 input + 350 output tokens on gpt-5.5",
);
report(
  pipe(
    pricesFor(modelId("gpt-5.5")),
    chainResult((prices: ModelPrices) =>
      estimateCost(
        tokenUsage({
          inputTokens: countOf(1_200),
          outputTokens: countOf(350),
        }),
      )(prices),
    ),
    matchResult(failed, describeCost),
  ),
);

// A model the run never measured has no card: a sibling's calibration is not
// transferable, so the registry refuses rather than guessing.
report(
  "\nasking for an unmeasured sibling model",
);
report(
  pipe(
    cardFor(modelId("claude-opus-4-8")),
    matchResult(
      (error: MeteringError): string =>
        `  refused, as designed: ${error.__tag}`,
      (card: ModelCard): string =>
        `  unexpectedly found a card for ${card.familyName}`,
    ),
  ),
);
