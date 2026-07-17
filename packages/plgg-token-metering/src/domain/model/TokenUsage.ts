import {
  TokenCount,
  zeroTokens,
} from "plgg-token-metering/domain/model/TokenCount";

/**
 * The token buckets one request billed, mirroring the provider's `usage` field.
 *
 * Four buckets rather than one number, because cached and tool-bearing requests
 * bill the SAME token counts at DIFFERENT rates: a prompt-cache write bills
 * above the base input rate and a cache read at a small fraction of it. A meter
 * that collapses these to a single "input tokens" loses the information needed
 * to price them, so the breakdown is preserved from the provider's response all
 * the way through to `CostBreakdown`.
 *
 * Tool definitions are NOT a bucket: providers serialize them into the prompt
 * and bill them as ordinary input tokens, so they belong in `inputTokens`. (The
 * article's single probe measured 483 tokens for one tool definition on the
 * Anthropic count endpoint. That is one reading of one unspecified tool
 * definition, not a general constant, so this package does not carry it — a
 * tool definition is text, and text is counted.)
 *
 * This is a POST-RUN record: it describes a request the provider already
 * billed. Pre-run, output tokens do not exist yet — see `projectCost`.
 */
export type TokenUsage = Readonly<{
  /** Uncached input tokens, billed at the base input rate. */
  inputTokens: TokenCount;
  /** Tokens generated, billed at the output rate. */
  outputTokens: TokenCount;
  /** Tokens written into the prompt cache. */
  cacheWriteTokens: TokenCount;
  /** Tokens served from the prompt cache. */
  cacheReadTokens: TokenCount;
}>;

/**
 * Constructs a {@link TokenUsage}. Every bucket defaults to zero: a request
 * that used no cache reports no cache tokens, and a zero bucket needs no rate.
 */
export const tokenUsage = ({
  inputTokens = zeroTokens,
  outputTokens = zeroTokens,
  cacheWriteTokens = zeroTokens,
  cacheReadTokens = zeroTokens,
}: {
  inputTokens?: TokenCount;
  outputTokens?: TokenCount;
  cacheWriteTokens?: TokenCount;
  cacheReadTokens?: TokenCount;
}): TokenUsage => ({
  inputTokens,
  outputTokens,
  cacheWriteTokens,
  cacheReadTokens,
});
