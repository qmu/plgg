import { Dict, SoftStr, compare } from "plgg";

/**
 * The canonical inverse of {@link parseQuery}: a query {@link Dict} → a
 * `?key=val&key2=val2` string. Keys are sorted and keys/values are
 * percent-encoded, so the output is **deterministic** — the plgg-view URL
 * reflection seam string-diffs this to decide whether the address bar changed,
 * which only works if equal state always serializes identically. Empty-valued
 * entries are dropped and the leading `?` is present only when the result is
 * non-empty (so an empty dict serializes to `""`, not `"?"`).
 *
 * Round-trips with {@link parseQuery}: `parseQuery(serializeQuery(d))` deep-
 * equals `d` for any `Dict` of non-empty values.
 */
export const serializeQuery = (
  query: Dict<string, SoftStr>,
): SoftStr => {
  const pairs = Object.entries(query)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => compare(a, b))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    );
  return pairs.length === 0
    ? ""
    : `?${pairs.join("&")}`;
};
