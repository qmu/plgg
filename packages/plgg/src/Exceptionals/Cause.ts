import {
  SoftStr,
  Option,
  none,
  some,
  fromNullable,
} from "plgg/index";

/**
 * A serializable snapshot of a thrown value. A live `Error` cannot be stored on
 * a tagged-data error: its `name`/`message`/`stack` are non-enumerable, so it
 * collapses to `{}` through `JSON.stringify` — destroying the origin detail the
 * cause exists to carry across a wire/process boundary. A `Cause` is plain data
 * (all `SoftStr`), so it survives serialization intact.
 */
export type Cause = Readonly<{
  name: SoftStr;
  message: SoftStr;
  stack: Option<SoftStr>;
}>;

/**
 * Snapshots an unknown thrown value into a serializable {@link Cause}.
 */
export const toCause = (value: unknown): Cause =>
  value instanceof Error
    ? {
        name: value.name,
        message: value.message,
        stack: fromNullable(value.stack),
      }
    : {
        name: "NonError",
        message: String(value),
        stack: none(),
      };

/**
 * Lifts an optional thrown value into an `Option<Cause>` — `none` when absent.
 */
export const toCauseOption = (
  value: unknown,
): Option<Cause> =>
  value === undefined || value === null
    ? none()
    : some(toCause(value));
