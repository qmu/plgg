import {
  describe,
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
  Assertion,
} from "plgg-test";
import { countContentTokens } from "plgg-token-metering/domain/usecase/bpe";
import {
  parseTiktokenVocabulary,
  parseTokenizerJson,
} from "plgg-token-metering/domain/usecase/parseVocabulary";
import {
  BpeVocabulary,
  isMergeListVocabulary,
  rankedBytesVocabulary,
  vocabularyPattern,
} from "plgg-token-metering/domain/model/BpeVocabulary";
import { MeteringError } from "plgg-token-metering/domain/model/MeteringError";
import {
  GPT2_PRETOKEN_PATTERN,
  O200K_PRETOKEN_PATTERN,
  splitPretokens,
} from "plgg-token-metering/domain/usecase/pretokenize";

/**
 * The BPE merge loop, against hand-built vocabularies small enough that the
 * expected tokenization can be derived by reading them.
 *
 * The real vocabularies are not bundled (see DEPENDENCY-LOG.md), so these
 * exercise the ALGORITHM: merges applied in priority order, the whole-token
 * fast path, and the fallback when no listed pair remains. That this
 * implementation reproduces the REAL o200k_base counts is a separate claim,
 * verified against the article's recorded counts in `accuracy.spec.ts` and out
 * of band against the real 3.6 MB vocabulary — see README, Accuracy.
 */

/** latin1 key for a byte sequence — the shape a ranked-bytes vocabulary uses. */
const bytesOf = (text: string): string =>
  Array.from(
    new TextEncoder().encode(text),
    (byte) => String.fromCharCode(byte),
  ).join("");

/**
 * A vocabulary over "ab" where "a"+"b" merges (rank 2) before "ab"+"ab" (rank
 * 3), so "abab" collapses to ONE token: a b a b -> ab ab -> abab.
 */
const abVocabulary: BpeVocabulary =
  rankedBytesVocabulary({
    ranks: new Map([
      [bytesOf("a"), 0],
      [bytesOf("b"), 1],
      [bytesOf("ab"), 2],
      [bytesOf("abab"), 3],
    ]),
    // A pattern that keeps the whole run as one pre-token, so the merge loop —
    // not the splitter — decides the count.
    pretokenPattern: "[a-z]+",
  });

/** The same alphabet WITHOUT "abab", so merging stops at two tokens. */
const abVocabularyNoPair: BpeVocabulary =
  rankedBytesVocabulary({
    ranks: new Map([
      [bytesOf("a"), 0],
      [bytesOf("b"), 1],
      [bytesOf("ab"), 2],
    ]),
    pretokenPattern: "[a-z]+",
  });

describe("countContentTokens", () => {
  test("merges to a single token when the whole run is a token", () =>
    check(
      countContentTokens(abVocabulary, "abab"),
      toBe(1),
    ));

  test("stops merging when no listed pair remains", () =>
    check(
      countContentTokens(
        abVocabularyNoPair,
        "abab",
      ),
      toBe(2),
    ));

  test("counts a single known token as one", () =>
    check(
      countContentTokens(abVocabulary, "ab"),
      toBe(1),
    ));

  test("counts a trailing unmergeable byte as its own token", () =>
    check(
      countContentTokens(
        abVocabularyNoPair,
        "aba",
      ),
      toBe(2),
    ));

  test("counts empty text as zero tokens", () =>
    check(
      countContentTokens(abVocabulary, ""),
      toBe(0),
    ));
});

describe("parseTiktokenVocabulary", () => {
  // "YQ==" is base64 for "a", "Yg==" for "b", "YWI=" for "ab".
  const fileText = "YQ== 0\nYg== 1\nYWI= 2\n";

  test("parses `<base64 bytes> <rank>` lines into a usable vocabulary", () =>
    check(
      parseTiktokenVocabulary(fileText, "[a-z]+"),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          countContentTokens(vocabulary, "ab"),
          toBe(1),
        ),
      ),
    ));

  test("rejects a file with no parsable lines", () =>
    check(
      parseTiktokenVocabulary("", "[a-z]+"),
      errThen((error: MeteringError) =>
        check(
          error.__tag,
          toBe("VocabularyParseError"),
        ),
      ),
    ));

  /**
   * A published vocabulary file ends with a newline and may carry blank lines.
   * A line without a rank is skipped rather than parsed into a NaN rank, which
   * would silently corrupt every merge decision that consulted it.
   */
  test("skips blank and malformed lines, keeping the well-formed ones", () =>
    check(
      parseTiktokenVocabulary(
        "\nYQ== 0\nmalformed-no-rank\n\nYg== 1\nYWI= 2\n",
        "[a-z]+",
      ),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          countContentTokens(vocabulary, "ab"),
          toBe(1),
        ),
      ),
    ));

  test("rejects a file of only malformed lines", () =>
    check(
      parseTiktokenVocabulary(
        "malformed\nalso-malformed\n",
        "[a-z]+",
      ),
      errThen((error: MeteringError) =>
        check(
          error.__tag,
          toBe("VocabularyParseError"),
        ),
      ),
    ));
});

describe("parseTokenizerJson", () => {
  test("reads the merge list and the file's own Split pattern", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
        pre_tokenizer: {
          type: "Split",
          pattern: { Regex: "[a-z]+" },
        },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          countContentTokens(vocabulary, "ab"),
          toBe(1),
        ),
      ),
    ));

  test("falls back to the GPT-2 pattern when the file declares none", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          vocabularyPattern(vocabulary),
          toBe(GPT2_PRETOKEN_PATTERN),
        ),
      ),
    ));

  test("rejects a file with no model.merges", () =>
    check(
      parseTokenizerJson({ model: {} }),
      errThen((error: MeteringError) =>
        check(
          error.__tag,
          toBe("VocabularyParseError"),
        ),
      ),
    ));

  /**
   * A tokenizer.json may declare a Unicode normalizer, directly or nested in a
   * Sequence. Counting without applying it miscounts text whose composed and
   * decomposed forms differ — so the flag is read from the file, not assumed.
   */
  test("reads a directly declared NFC normalizer", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
        normalizer: { type: "NFC" },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          isMergeListVocabulary(vocabulary) &&
            vocabulary.content.normalizeNfc,
          toBe(true),
        ),
      ),
    ));

  test("finds an NFC normalizer nested in a Sequence", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
        normalizer: {
          type: "Sequence",
          normalizers: [
            { type: "Strip" },
            { type: "NFC" },
          ],
        },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          isMergeListVocabulary(vocabulary) &&
            vocabulary.content.normalizeNfc,
          toBe(true),
        ),
      ),
    ));

  test("normalizes composed and decomposed text to the same count under NFC", () =>
    check(
      parseTokenizerJson({
        model: { merges: [] },
        normalizer: { type: "NFC" },
        pre_tokenizer: {
          type: "Split",
          pattern: { Regex: "." },
        },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          countContentTokens(
            vocabulary,
            "\u00e9",
          ),
          toBe(
            countContentTokens(
              vocabulary,
              "e\u0301",
            ),
          ),
        ),
      ),
    ));

  test("declares no normalizer when the file declares none", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          isMergeListVocabulary(vocabulary) &&
            vocabulary.content.normalizeNfc,
          toBe(false),
        ),
      ),
    ));

  test("finds a Split pattern nested in a Sequence pre-tokenizer", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
        pre_tokenizer: {
          type: "Sequence",
          pretokenizers: [
            { type: "ByteLevel" },
            {
              type: "Split",
              pattern: { Regex: "[a-z]+" },
            },
          ],
        },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          vocabularyPattern(vocabulary),
          toBe("[a-z]+"),
        ),
      ),
    ));

  /**
   * Hugging Face publishes `merges` either as ["a", "b"] pairs or as the
   * space-joined string "a b", depending on the tokenizer file's version. Both
   * are the same merge, so both must parse to the same count.
   */
  test("reads merges published as space-joined strings", () =>
    check(
      parseTokenizerJson({
        model: { merges: ["a b"] },
        pre_tokenizer: {
          type: "Split",
          pattern: { Regex: "[a-z]+" },
        },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          countContentTokens(vocabulary, "ab"),
          toBe(1),
        ),
      ),
    ));

  test("falls back when a Sequence pre-tokenizer declares no Split", () =>
    check(
      parseTokenizerJson({
        model: { merges: [["a", "b"]] },
        pre_tokenizer: {
          type: "Sequence",
          pretokenizers: [{ type: "ByteLevel" }],
        },
      }),
      okThen((vocabulary: BpeVocabulary) =>
        check(
          vocabularyPattern(vocabulary),
          toBe(GPT2_PRETOKEN_PATTERN),
        ),
      ),
    ));

  test("rejects a non-object payload", () =>
    check(
      parseTokenizerJson("not a tokenizer file"),
      errThen((error: MeteringError) =>
        check(
          error.__tag,
          toBe("VocabularyParseError"),
        ),
      ),
    ));
});

describe("splitPretokens", () => {
  test("tiles the input: every character belongs to exactly one piece", () =>
    all(
      [
        "Hello, world!",
        "日本語のテキスト",
        "const x = 1;\n",
      ].map((text): Assertion =>
        check(
          splitPretokens(
            text,
            O200K_PRETOKEN_PATTERN,
          ).join(""),
          toBe(text),
        ),
      ),
    ));

  /**
   * The undercount guard: a pattern that does not tile its input must not drop
   * the characters it skipped. Undercounting is the failure that shows up as an
   * underbilled invoice.
   */
  test("preserves text a foreign pattern would leave in a gap", () =>
    check(
      splitPretokens("a1b", "[a-z]").join(""),
      toBe("a1b"),
    ));

  test("preserves a trailing gap the pattern does not reach", () =>
    check(
      splitPretokens("ab1", "[a-z]").join(""),
      toBe("ab1"),
    ));

  /**
   * A pattern that can match the empty string (here `x*`) yields zero-length
   * matches at every position. They must not become zero-length pieces, or the
   * count would inflate with tokens that carry no text.
   */
  test("drops zero-length matches without dropping text", () =>
    check(
      splitPretokens("ab", "x*").join(""),
      toBe("ab"),
    ));

  test("the GPT-2 pattern also tiles its input", () =>
    check(
      splitPretokens(
        "a quick test\n",
        GPT2_PRETOKEN_PATTERN,
      ).join(""),
      toBe("a quick test\n"),
    ));
});
