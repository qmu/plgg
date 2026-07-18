import { defineVariant } from "plgg";

/**
 * A published BPE vocabulary, as DATA.
 *
 * The vocabulary is an input to this package, never a part of it. Two reasons,
 * both from the vendor-neutrality dependency judgment in DEPENDENCY-LOG.md:
 *
 * 1. Size. o200k_base is ~3.6 MB and Qwen2.5's `tokenizer.json` is larger;
 *    bundling either into a library that a browser app may import is a cost
 *    every consumer pays whether or not it counts OpenAI tokens.
 * 2. Freshness. A vocabulary is the provider's artifact and changes on the
 *    provider's schedule. Committed here, it would go stale silently; supplied
 *    by the caller, it is fetched and cached on the caller's own terms.
 *
 * The consequence is honest and stated in the README: `countTokens` for an
 * exact family needs a vocabulary the caller loaded. This package implements
 * the BPE inference and the parsers for the two published formats; it does not
 * do I/O, which is also why it has no `vendors/` layer and no `node:` import.
 */
const RankedBytes = defineVariant(
  "RankedBytesVocabulary",
)<{
  /**
   * Byte sequence (latin1-keyed, one string char per byte) → merge rank. The
   * format OpenAI publishes its encodings in (`.tiktoken` files).
   */
  ranks: ReadonlyMap<string, number>;
  pretokenPattern: string;
}>();

export type RankedBytesVocabulary = ReturnType<
  typeof RankedBytes.make
>;

/**
 * Constructs a {@link RankedBytesVocabulary} (OpenAI `.tiktoken` shape).
 */
export const rankedBytesVocabulary = (content: {
  ranks: ReadonlyMap<string, number>;
  pretokenPattern: string;
}): RankedBytesVocabulary =>
  RankedBytes.make(content);

/**
 * The Hugging Face `tokenizer.json` shape: tokens are strings over the GPT-2
 * byte-to-unicode alphabet and the merge table is an ordered pair list, so
 * priority is list position rather than a rank on the concatenation.
 */
const MergeList = defineVariant(
  "MergeListVocabulary",
)<{
  /** "left right" (space-joined pair) → merge priority (list position). */
  merges: ReadonlyMap<string, number>;
  pretokenPattern: string;
  /** Apply Unicode NFC before splitting, when the tokenizer file declares it. */
  normalizeNfc: boolean;
}>();

export type MergeListVocabulary = ReturnType<
  typeof MergeList.make
>;

/**
 * Constructs a {@link MergeListVocabulary} (Hugging Face `tokenizer.json`).
 */
export const mergeListVocabulary = (content: {
  merges: ReadonlyMap<string, number>;
  pretokenPattern: string;
  normalizeNfc: boolean;
}): MergeListVocabulary =>
  MergeList.make(content);

/**
 * A vocabulary in either published format.
 */
export type BpeVocabulary =
  RankedBytesVocabulary | MergeListVocabulary;

/**
 * Pattern matcher for the {@link RankedBytesVocabulary} variant.
 */
export const rankedBytesVocabulary$ =
  RankedBytes.pattern;

/**
 * Pattern matcher for the {@link MergeListVocabulary} variant.
 */
export const mergeListVocabulary$ =
  MergeList.pattern;

/**
 * Type guard for the {@link RankedBytesVocabulary} variant.
 */
export const isRankedBytesVocabulary = (
  vocabulary: BpeVocabulary,
): vocabulary is RankedBytesVocabulary =>
  RankedBytes.is(vocabulary);

/**
 * Type guard for the {@link MergeListVocabulary} variant.
 */
export const isMergeListVocabulary = (
  vocabulary: BpeVocabulary,
): vocabulary is MergeListVocabulary =>
  MergeList.is(vocabulary);

/**
 * The pre-tokenization pattern a vocabulary carries, whichever format it is in.
 */
export const vocabularyPattern = (
  vocabulary: BpeVocabulary,
): string => vocabulary.content.pretokenPattern;
