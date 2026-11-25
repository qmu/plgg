import {
  type SoftStr,
  type Option,
  pipe,
  tryCatch,
  matchOption,
  matchResult,
} from "plgg";
import { type Trail } from "plggmatic/Navigate/model/Trail";

/**
 * A trail's WIRE FORMAT: one query parameter, `x`, holding
 * the steps joined by `.`.
 *
 * `.` and not `/`: a trail rides in a query beside a path,
 * and a separator that is also the path's makes an address
 * hard to read and easy to cut in the wrong place. Both
 * products this format was lifted from already carried
 * their trail in `x`, and one already joined with `.`, so
 * its addresses read unchanged.
 *
 * Inside a step, a `.` and anything a URL would not carry
 * literally are percent-encoded, so a step may hold any
 * text. This IS a second percent round under the
 * transport's own, which {@link compositionQuery} refuses
 * on purpose; it is accepted here because the inherited
 * addresses are written this way, and a step is a short
 * machine-made token rather than a quoted passage.
 * {@link decodeTrail} therefore takes the value a URL
 * parser has ALREADY decoded once (`URLSearchParams.get`),
 * and {@link encodeTrail} gives the value to hand to
 * `URLSearchParams.set`.
 */
export const trailParam: SoftStr = "x";
export const stepSeparator: SoftStr = ".";

const encodeStep = (step: SoftStr): SoftStr =>
  encodeURIComponent(step).split(".").join("%2E");

/**
 * Percent-decoding that cannot throw: a step that is not
 * well-formed percent-encoding is kept exactly as written.
 * An address is typed and cut by hand, so it degrades, it
 * never errors. All-or-nothing per step, which is how the
 * addresses this format inherits have always been read.
 */
const decodeStep = (raw: SoftStr): SoftStr =>
  pipe(
    tryCatch((value: SoftStr) =>
      decodeURIComponent(value),
    )(raw),
    matchResult(
      (): SoftStr => raw,
      (value: SoftStr): SoftStr => value,
    ),
  );

/** The `x` value of a trail; empty for the root alone. */
export const encodeTrail = (
  trail: Trail,
): SoftStr =>
  trail.map(encodeStep).join(stepSeparator);

/**
 * The trail an `x` value names. Total: an absent or empty
 * value is the root alone, and empty steps (`a..b`, a
 * trailing `.`) contribute nothing.
 */
export const decodeTrail = (
  raw: Option<SoftStr>,
): Trail =>
  matchOption<SoftStr, Trail>(
    () => [],
    (value: SoftStr) =>
      value
        .split(stepSeparator)
        .filter((step: SoftStr) => step !== "")
        .map(decodeStep),
  )(raw);

/**
 * The trail as a query string, `?`-prefixed, or the empty
 * string for the root alone — a strip at its root adds
 * nothing to a link.
 */
export const trailQuery = (
  trail: Trail,
): SoftStr =>
  trail.length === 0
    ? ""
    : "?" +
      trailParam +
      "=" +
      encodeURIComponent(encodeTrail(trail));

/**
 * A product's typed step and its spelling. `print` writes
 * a step as the opaque string a {@link Trail} holds;
 * `parse` reads one back, `None` for a string that is not
 * a step of this product.
 */
export type StepCodec<S> = Readonly<{
  print: (step: S) => SoftStr;
  parse: (raw: SoftStr) => Option<S>;
}>;

/** Typed steps as a trail. */
export const printSteps =
  <S>(codec: StepCodec<S>) =>
  (steps: ReadonlyArray<S>): Trail =>
    steps.map(codec.print);

/**
 * A trail as typed steps, by the trail's own rule: the
 * first string that is not a step ends the reading, and
 * the steps before it stand. Skipping it instead would
 * join two columns that were never next to each other.
 */
export const parseSteps =
  <S>(codec: StepCodec<S>) =>
  (trail: Trail): ReadonlyArray<S> => {
    const read = (
      done: ReadonlyArray<S>,
      rest: Trail,
    ): ReadonlyArray<S> => {
      const [raw, ...tail] = rest;
      return raw === undefined
        ? done
        : matchOption<S, ReadonlyArray<S>>(
            () => done,
            (step: S) =>
              read([...done, step], tail),
          )(codec.parse(raw));
    };
    return read([], trail);
  };
