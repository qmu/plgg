import {
  Option,
  SoftStr,
  Dict,
  some,
  none,
  pipe,
  tryCatch,
  toOption,
  getOr,
  chainOption,
  matchOption,
  fromNullable,
} from "plgg";
import { Segment } from "plgg-router/Routing/model/Segment";
import { splitPath } from "plgg-router/Routing/usecase/compilePattern";

/**
 * Captured path parameters accumulated while matching.
 */
type Captured = Dict<string, SoftStr>;

/**
 * Decodes a single path part, falling back to the raw value on malformed
 * percent-encoding — `tryCatch` lifts the throwing `decodeURIComponent` into a
 * `Result`, which degrades to the raw part via `toOption`/`getOr`.
 */
const safeDecode = (part: SoftStr): SoftStr =>
  pipe(
    tryCatch((p: SoftStr) => decodeURIComponent(p))(
      part,
    ),
    toOption,
    getOr(part),
  );

/**
 * Matches one compiled segment against the path part at index `i`, extending
 * the captured parameters. A wildcard captures (and joins) all remaining parts.
 */
const matchOne =
  (
    seg: Segment,
    parts: ReadonlyArray<SoftStr>,
    i: number,
  ) =>
  (captured: Captured): Option<Captured> =>
    seg.__tag === "Wildcard"
      ? some({
          ...captured,
          [seg.content]: parts
            .slice(i)
            .map(safeDecode)
            .join("/"),
        })
      : seg.__tag === "Static"
        ? parts[i] === seg.content
          ? some(captured)
          : none()
        : pipe(
            fromNullable(parts[i]),
            matchOption<SoftStr, Option<Captured>>(
              () => none(),
              (part) =>
                some({
                  ...captured,
                  [seg.content]: safeDecode(part),
                }),
            ),
          );

/**
 * Matches a compiled pattern against a concrete pathname, returning the
 * captured parameters as a `Dict` on success.
 *
 * A wildcard consumes (and joins) all remaining path parts, so it is
 * effectively terminal; without one, the part count must match exactly.
 */
export const matchSegments = (
  segments: ReadonlyArray<Segment>,
  pathname: SoftStr,
): Option<Captured> =>
  pipe(splitPath(pathname), (parts) =>
    segments.some((s) => s.__tag === "Wildcard") ||
    parts.length === segments.length
      ? segments.reduce<Option<Captured>>(
          (acc, seg, i) =>
            pipe(acc, chainOption(matchOne(seg, parts, i))),
          some({}),
        )
      : none(),
  );
