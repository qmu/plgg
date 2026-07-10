import { type SoftStr } from "plgg";

/**
 * A declarative filter over a {@link Collection}'s rows.
 * Filtering is a case-insensitive substring test over
 * `Row.label` (the one semantics every list shares); the
 * live text lives in the scheduled model and is reflected
 * into the URL, so a filtered arrangement is a shareable
 * address. Richer predicates arrive with a consumer that
 * needs them — kept minimal so query state stays a plain
 * string.
 */
export type Query = Readonly<{
  placeholder: SoftStr;
}>;

/** Constructs a {@link Query}. */
export const query = (
  placeholder: SoftStr,
): Query => ({ placeholder });

/**
 * Whether a row label matches a query text — the shared
 * filter semantics. Empty text matches everything (an
 * empty filter is not a filter). Case-insensitive
 * substring, so it is total and never throws.
 */
export const matchesQuery = (
  text: SoftStr,
  label: SoftStr,
): boolean =>
  text === "" ||
  label
    .toLowerCase()
    .includes(text.toLowerCase());
