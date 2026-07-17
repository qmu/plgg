import {
  Result,
  ok,
  err,
  isObj,
  hasProp,
  isSoftStr,
} from "plgg";
import {
  BpeVocabulary,
  mergeListVocabulary,
  rankedBytesVocabulary,
} from "plgg-token-metering/domain/model/BpeVocabulary";
import {
  MeteringError,
  vocabularyParseError,
} from "plgg-token-metering/domain/model/MeteringError";
import { GPT2_PRETOKEN_PATTERN } from "plgg-token-metering/domain/usecase/pretokenize";

/**
 * Parses an OpenAI `.tiktoken` vocabulary file: one `<base64 bytes> <rank>` per
 * line.
 *
 * Pure — the caller fetches and caches the file text. That split is deliberate:
 * this package does no I/O, so it needs no `node:` import, no `fetch`, and no
 * `vendors/` layer, and it runs unchanged in a browser, a Worker, or Node.
 *
 * `atob` decodes the base64 to a latin1-keyed string (one char per byte), which
 * is the key shape `countContentTokens` compares against. It is a platform
 * global on every runtime this package targets, not a dependency.
 */
export const parseTiktokenVocabulary = (
  fileText: string,
  pretokenPattern: string,
): Result<BpeVocabulary, MeteringError> => {
  const ranks = new Map<string, number>();
  // Imperative seam: a ~200k-line parse. A reduce would allocate a Map per
  // line; the accumulator is the point.
  for (const line of fileText.split("\n")) {
    if (line.trim() === "") continue;
    const [encoded, rank] = line.split(" ");
    if (
      encoded === undefined ||
      rank === undefined
    ) {
      continue;
    }
    ranks.set(atob(encoded), Number(rank));
  }
  return ranks.size === 0
    ? err(
        vocabularyParseError({
          message:
            "No `<base64 bytes> <rank>` lines found — not a .tiktoken vocabulary",
        }),
      )
    : ok(
        rankedBytesVocabulary({
          ranks,
          pretokenPattern,
        }),
      );
};

const mentionsNfc = (
  normalizer: unknown,
): boolean =>
  isObj(normalizer) &&
  (readProp(normalizer, "type") === "NFC" ||
    nestedNormalizers(normalizer).some((entry) =>
      mentionsNfc(entry),
    ));

const readProp = (
  value: object,
  key: string,
): unknown =>
  hasProp(value, key) ? value[key] : undefined;

const nestedNormalizers = (
  value: object,
): ReadonlyArray<unknown> => {
  const nested = readProp(value, "normalizers");
  return Array.isArray(nested) ? nested : [];
};

const splitPatternOf = (
  preTokenizer: unknown,
): string | undefined => {
  if (!isObj(preTokenizer)) return undefined;
  if (
    readProp(preTokenizer, "type") === "Split"
  ) {
    const pattern = readProp(
      preTokenizer,
      "pattern",
    );
    const regex = isObj(pattern)
      ? readProp(pattern, "Regex")
      : undefined;
    return isSoftStr(regex) ? regex : undefined;
  }
  const nested = readProp(
    preTokenizer,
    "pretokenizers",
  );
  // Imperative seam: first-match search that must stop early.
  for (const entry of Array.isArray(nested)
    ? nested
    : []) {
    const found = splitPatternOf(entry);
    if (found !== undefined) return found;
  }
  return undefined;
};

const mergeEntry = (entry: unknown): string =>
  Array.isArray(entry)
    ? entry.join(" ")
    : String(entry);

/**
 * Parses a Hugging Face `tokenizer.json` into a merge-list vocabulary.
 *
 * The merge table and the pre-tokenizer's own `Split` regex come from the file
 * itself (falling back to the GPT-2 pattern that byte-level tokenizers imply),
 * so the counter follows the model's published rules rather than this package's
 * assumptions about them.
 *
 * `parsed` is the already-decoded JSON: parsing bytes into JSON is the caller's
 * (and the platform's) job, not this package's.
 */
export const parseTokenizerJson = (
  parsed: unknown,
  fallbackPattern: string = GPT2_PRETOKEN_PATTERN,
): Result<BpeVocabulary, MeteringError> => {
  const model = isObj(parsed)
    ? readProp(parsed, "model")
    : undefined;
  const rawMerges = isObj(model)
    ? readProp(model, "merges")
    : undefined;
  if (!Array.isArray(rawMerges)) {
    return err(
      vocabularyParseError({
        message:
          "tokenizer.json has no model.merges list",
      }),
    );
  }
  const merges = new Map<string, number>();
  rawMerges.forEach((entry, index) => {
    merges.set(mergeEntry(entry), index);
  });
  return ok(
    mergeListVocabulary({
      merges,
      pretokenPattern:
        splitPatternOf(
          isObj(parsed)
            ? readProp(parsed, "pre_tokenizer")
            : undefined,
        ) ?? fallbackPattern,
      normalizeNfc: mentionsNfc(
        isObj(parsed)
          ? readProp(parsed, "normalizer")
          : undefined,
      ),
    }),
  );
};
