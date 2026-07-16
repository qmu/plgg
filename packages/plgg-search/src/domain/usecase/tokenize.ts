/**
 * The one tokenizer both the index build and query
 * time share — the two sides MUST agree or recall
 * silently collapses, so it lives in exactly one
 * module. From scratch by design (vendor-neutrality:
 * implement by default). Latin runs are ASCII-folded
 * lowercase alphanumeric spans, single-character
 * tokens dropped as noise. CJK runs are spaceless by
 * nature, so the latin rule alone indexes Japanese to
 * NOTHING — the `strategy` selects how those runs are
 * segmented so a CJK corpus is searchable at all.
 */
import {
  SoftStr,
  pipe,
  fromNullable,
  getOr,
} from "plgg";
import { CjkStrategy } from "plgg-search/domain/model/CjkStrategy";

// One contiguous run of CJK: Hiragana, Katakana, the
// CJK extension-A block, and CJK Unified Ideographs.
// Anything else is handled by the latin rule or is
// inter-token noise.
const CJK_RUN = /[぀-ヿ㐀-䶿一-鿿]+/g;

const latinTokens = (
  input: SoftStr,
): ReadonlyArray<SoftStr> =>
  pipe(
    fromNullable(
      input.toLowerCase().match(/[a-z0-9]+/g),
    ),
    getOr<ReadonlyArray<SoftStr>>([]),
  ).filter((token) => token.length >= 2);

// Dictionary word segmentation, keeping only
// word-like segments (drops the punctuation/space
// segments the segmenter emits between words).
const segmenterTokens = (
  run: SoftStr,
): ReadonlyArray<SoftStr> =>
  [
    ...new Intl.Segmenter("ja", {
      granularity: "word",
    }).segment(run),
  ]
    .filter((seg) => seg.isWordLike === true)
    .map((seg) => seg.segment);

// Overlapping 2-grams; a run of one or two
// characters is its own single token.
const bigramTokens = (
  run: SoftStr,
): ReadonlyArray<SoftStr> =>
  run.length <= 2
    ? [run]
    : Array.from(
        { length: run.length - 1 },
        (_unused, i) => run.slice(i, i + 2),
      );

const cjkTokens = (
  input: SoftStr,
  strategy: CjkStrategy,
): ReadonlyArray<SoftStr> =>
  strategy === "none"
    ? []
    : pipe(
        fromNullable(input.match(CJK_RUN)),
        getOr<ReadonlyArray<SoftStr>>([]),
      ).flatMap(
        strategy === "segmenter"
          ? segmenterTokens
          : bigramTokens,
      );

/**
 * Tokenize `input` into the bag of terms it is
 * indexed and queried under. Latin runs always
 * tokenize the same way; `strategy` selects how CJK
 * runs do. The default `"none"` preserves the
 * latin-only behavior.
 */
export const tokenize = (
  input: SoftStr,
  strategy: CjkStrategy = "none",
): ReadonlyArray<SoftStr> => [
  ...latinTokens(input),
  ...cjkTokens(input, strategy),
];
