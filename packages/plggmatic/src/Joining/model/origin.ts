import {
  type SoftStr,
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
} from "plgg";
/** The origin a word names, when it parses as an address. */
const originOf = (value: string): string =>
  URL.canParse(value)
    ? new URL(value).origin
    : "";
/** Whether an address is this machine's own, where a
 * site under development is served without TLS. */
const local = (value: string): boolean =>
  ["localhost", "127.0.0.1"].includes(
    new URL(value).hostname,
  );
/**
 * Boundary caster for a site joined by columns: EXACTLY
 * an origin — scheme and host, no path, no wildcard — and
 * over TLS, except on this machine. What is written here
 * decides whose pages are framed and who may frame this
 * site, so nothing looser is read.
 */
export const asOrigin = (
  value: unknown,
): Result<SoftStr, InvalidError> =>
  typeof value === "string" &&
  originOf(value) === value &&
  !value.includes("*") &&
  // only what a browser's policy reads as ONE host: a
  // comma or a semicolon in the name would end the entry
  // there and start another
  /^https?:\/\/[a-z0-9.-]+(:\d+)?$/.test(value) &&
  (value.startsWith("https://") ||
    (value.startsWith("http://") && local(value)))
    ? ok(value)
    : err(
        invalidError({
          message: `a joined site must be an exact origin such as 'https://docs.example.com' (https, no path), got ${typeof value === "object" || typeof value === "bigint" ? typeof value : JSON.stringify(value)}`,
        }),
      );
