/**
 * The one tokenizer both the index build and query time
 * share — the two sides MUST agree or recall silently
 * collapses, so it lives in exactly one module. From
 * scratch by design (vendor-neutrality: implement by
 * default); ASCII-folded lowercase alphanumeric runs,
 * single-character tokens dropped as noise.
 */
import {
  type SoftStr,
  pipe,
  fromNullable,
  getOr,
} from "plgg";

export const tokenize = (
  input: SoftStr,
): ReadonlyArray<SoftStr> =>
  pipe(
    fromNullable(
      input.toLowerCase().match(/[a-z0-9]+/g),
    ),
    getOr<ReadonlyArray<SoftStr>>([]),
  ).filter((token) => token.length >= 2);
