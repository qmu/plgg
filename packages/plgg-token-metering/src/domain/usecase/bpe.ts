import { match } from "plgg";
import {
  BpeVocabulary,
  MergeListVocabulary,
  RankedBytesVocabulary,
  mergeListVocabulary$,
  rankedBytesVocabulary$,
} from "plgg-token-metering/domain/model/BpeVocabulary";
import { splitPretokens } from "plgg-token-metering/domain/usecase/pretokenize";

/**
 * A self-implemented byte-pair-encoding token counter — no tokenizer library at
 * runtime.
 *
 * Two published vocabulary formats are supported, because the two exact-count
 * families publish differently:
 *
 * - `ranked-bytes` (OpenAI's `.tiktoken` files): every token is a byte sequence
 *   with a rank; merging replays "merge the adjacent pair whose concatenation
 *   has the lowest rank" until no concatenation is a token.
 * - `merge-list` (Hugging Face `tokenizer.json`): tokens are strings over the
 *   GPT-2 byte-to-unicode alphabet and the merge table is an ordered pair list;
 *   merging replays "apply the earliest-listed adjacent pair" until no listed
 *   pair remains.
 *
 * Both loops are the reference BPE inference algorithm. Only the number of
 * parts is needed, so token ids are never materialized.
 */

/** UTF-8 bytes of `text` as latin1 symbols, one string char per byte. */
const utf8Symbols = (text: string): string[] =>
  Array.from(
    new TextEncoder().encode(text),
    (byte) => String.fromCharCode(byte),
  );

/**
 * GPT-2's byte-to-unicode table: printable latin bytes map to themselves, every
 * other byte to a private printable codepoint starting at U+0100. This is the
 * alphabet `tokenizer.json` vocabularies are written in.
 */
const byteToUnicode =
  (): ReadonlyArray<string> => {
    const direct: number[] = [];
    // Imperative seam: building a 256-entry byte table from three published
    // ranges plus a running overflow counter.
    for (
      let byte = 0x21;
      byte <= 0x7e;
      byte += 1
    ) {
      direct.push(byte);
    }
    for (
      let byte = 0xa1;
      byte <= 0xac;
      byte += 1
    ) {
      direct.push(byte);
    }
    for (
      let byte = 0xae;
      byte <= 0xff;
      byte += 1
    ) {
      direct.push(byte);
    }
    const table: string[] = [];
    let next = 0;
    for (let byte = 0; byte < 256; byte += 1) {
      if (direct.includes(byte)) {
        table.push(String.fromCharCode(byte));
      } else {
        table.push(
          String.fromCharCode(256 + next),
        );
        next += 1;
      }
    }
    return table;
  };

const BYTE_TO_UNICODE = byteToUnicode();

const byteLevelSymbols = (
  text: string,
): string[] =>
  Array.from(
    new TextEncoder().encode(text),
    (byte) => BYTE_TO_UNICODE[byte] ?? "",
  );

/**
 * Replays merges over `parts`, always taking the lowest-priority-value merge
 * first; `priorityOf` returns undefined when a pair can no longer merge.
 *
 * Imperative seam: BPE inference is defined as repeated in-place mutation of a
 * symbol sequence, and the loop terminates because every pass shortens `parts`
 * by one.
 */
const mergeParts = (
  parts: string[],
  priorityOf: (
    left: string,
    right: string,
  ) => number | undefined,
): number => {
  while (parts.length > 1) {
    let bestIndex = -1;
    let bestPriority = Number.POSITIVE_INFINITY;
    for (
      let index = 0;
      index < parts.length - 1;
      index += 1
    ) {
      const priority = priorityOf(
        parts[index] ?? "",
        parts[index + 1] ?? "",
      );
      if (
        priority !== undefined &&
        priority < bestPriority
      ) {
        bestPriority = priority;
        bestIndex = index;
      }
    }
    if (bestIndex === -1) break;
    parts.splice(
      bestIndex,
      2,
      (parts[bestIndex] ?? "") +
        (parts[bestIndex + 1] ?? ""),
    );
  }
  return parts.length;
};

const countRankedBytes = (
  vocabulary: RankedBytesVocabulary,
  pretoken: string,
): number => {
  const symbols = utf8Symbols(pretoken);
  // A pre-token that IS a token needs no merging (the common fast path, and
  // also the correct answer when merging could not reach it).
  return vocabulary.content.ranks.has(
    symbols.join(""),
  )
    ? 1
    : mergeParts(symbols, (left, right) =>
        vocabulary.content.ranks.get(
          left + right,
        ),
      );
};

const countMergeList = (
  vocabulary: MergeListVocabulary,
  pretoken: string,
): number =>
  mergeParts(
    byteLevelSymbols(pretoken),
    (left, right) =>
      vocabulary.content.merges.get(
        `${left} ${right}`,
      ),
  );

const preparedText = (
  vocabulary: BpeVocabulary,
  text: string,
): string =>
  match(vocabulary)(
    [
      mergeListVocabulary$(),
      (value: MergeListVocabulary): string =>
        value.content.normalizeNfc
          ? text.normalize("NFC")
          : text,
    ],
    [
      rankedBytesVocabulary$(),
      (): string => text,
    ],
  );

const patternOf = (
  vocabulary: BpeVocabulary,
): string =>
  match(vocabulary)(
    [
      mergeListVocabulary$(),
      (value: MergeListVocabulary): string =>
        value.content.pretokenPattern,
    ],
    [
      rankedBytesVocabulary$(),
      (value: RankedBytesVocabulary): string =>
        value.content.pretokenPattern,
    ],
  );

const countPretoken = (
  vocabulary: BpeVocabulary,
  pretoken: string,
): number =>
  match(vocabulary)(
    [
      mergeListVocabulary$(),
      (value: MergeListVocabulary): number =>
        countMergeList(value, pretoken),
    ],
    [
      rankedBytesVocabulary$(),
      (value: RankedBytesVocabulary): number =>
        countRankedBytes(value, pretoken),
    ],
  );

/**
 * Counts the content tokens of `text` under a published vocabulary.
 *
 * Content only: this is the text's own token count, WITHOUT the provider's
 * message-framing overhead, which no provider documents and which the
 * calibration carries as a fitted constant. Special tokens never appear
 * (plain content is counted), so none are handled.
 *
 * Verified against the real o200k_base vocabulary: reproduces all 30 recorded
 * content counts of the `tm-v1` manifest exactly. See README, Accuracy.
 */
export const countContentTokens = (
  vocabulary: BpeVocabulary,
  text: string,
): number =>
  splitPretokens(
    preparedText(vocabulary, text),
    patternOf(vocabulary),
  ).reduce(
    (total, pretoken) =>
      total + countPretoken(vocabulary, pretoken),
    0,
  );
