/**
 * How a run of CJK characters becomes tokens.
 *
 * - `"none"` — the latin-only behavior: CJK is
 *   dropped (the honest zero baseline PoC 1 measured
 *   against — a Japanese doc yields no tokens).
 * - `"segmenter"` — the platform `Intl.Segmenter`
 *   word dictionary (compact, dictionary-quality,
 *   depends on the runtime's built-in data).
 * - `"bigram"` — a 2-character sliding window
 *   (language-agnostic, guaranteed recall, larger
 *   index).
 */
export type CjkStrategy =
  "none" | "segmenter" | "bigram";
