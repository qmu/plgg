/**
 * Pre-tokenization: the regex pass that splits text into word-ish pieces BEFORE
 * byte-pair merging.
 *
 * Published BPE tokenizers pair their merge table with a specific pattern, so
 * counting with the wrong pattern miscounts even with the right vocabulary —
 * the pattern is part of the instrument, not a detail. The patterns are kept as
 * data (regex source strings) because that is how providers publish them:
 * OpenAI alongside the encoding, Hugging Face inside `tokenizer.json`'s
 * `pre_tokenizer`.
 */

/**
 * The case-insensitive contraction group of o200k_base's published pattern,
 * written as explicit alternatives instead of the `(?i:'s|'t|…)` inline
 * modifier the upstream (Rust) source uses. The inline-modifier syntax only
 * reached V8 in Node 23; expanding it here keeps the counter runnable on Node
 * 22 LTS, which matters for a library that must not push a bleeding-edge
 * runtime floor onto every consumer.
 *
 * The expansion is exhaustively equivalent, NOT merely upper/lower case: `(?i:)`
 * under the `u` flag applies Unicode *simple case folding*, so `'s` also matches
 * `'ſ` (U+017F LATIN SMALL LETTER LONG S, which folds to `s`). Dropping `ſ`
 * would silently change tokenization, so it is listed. The other letters (t, r,
 * e, v, m, l, d) have no fold members beyond their ASCII pair. Alternation order
 * is immaterial: every alternative starts with a distinct letter.
 */
const O200K_CONTRACTIONS =
  "'[sSſ]|'[tT]|'[rR][eE]|'[vV][eE]|'[mM]|'[lL][lL]|'[dD]";

/**
 * o200k_base's published pattern (OpenAI's current text encodings).
 */
export const O200K_PRETOKEN_PATTERN = [
  `[^\\r\\n\\p{L}\\p{N}]?[\\p{Lu}\\p{Lt}\\p{Lm}\\p{Lo}\\p{M}]*[\\p{Ll}\\p{Lm}\\p{Lo}\\p{M}]+(?:${O200K_CONTRACTIONS})?`,
  `[^\\r\\n\\p{L}\\p{N}]?[\\p{Lu}\\p{Lt}\\p{Lm}\\p{Lo}\\p{M}]+[\\p{Ll}\\p{Lm}\\p{Lo}\\p{M}]*(?:${O200K_CONTRACTIONS})?`,
  "\\p{N}{1,3}",
  " ?[^\\s\\p{L}\\p{N}]+[\\r\\n/]*",
  "\\s*[\\r\\n]+",
  "\\s+(?!\\S)",
  "\\s+",
].join("|");

/**
 * GPT-2's pattern: the default for byte-level `tokenizer.json` files that carry
 * no explicit `Split` pre-tokenizer of their own.
 */
export const GPT2_PRETOKEN_PATTERN =
  "'s|'t|'re|'ve|'m|'ll|'d| ?\\p{L}+| ?\\p{N}+| ?[^\\s\\p{L}\\p{N}]+|\\s+(?!\\S)|\\s+";

/**
 * Splits `text` into consecutive pre-tokens with `pattern`.
 *
 * The published patterns tile their input (every character belongs to exactly
 * one match); any gap a foreign pattern leaves is preserved as its own piece, so
 * the count degrades to "one token per leftover character" instead of silently
 * dropping text. A counting harness must never count fewer characters than it
 * was given — undercounting is the failure that shows up as an underbilled
 * invoice, so it is engineered out here rather than caught downstream.
 */
export const splitPretokens = (
  text: string,
  pattern: string,
): ReadonlyArray<string> => {
  const regex = new RegExp(pattern, "gu");
  const pieces: string[] = [];
  // Imperative seam: matchAll gives match positions, and reconstructing the
  // gaps between them needs the running cursor. A reduce over matchAll would
  // carry the same cursor in an accumulator with no gain in clarity.
  let cursor = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > cursor) {
      pieces.push(
        text.slice(cursor, match.index),
      );
    }
    if (match[0] !== "") pieces.push(match[0]);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    pieces.push(text.slice(cursor));
  }
  return pieces;
};
