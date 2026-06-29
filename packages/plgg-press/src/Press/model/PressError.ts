import {
  type Box,
  type SoftStr,
  type Option,
  type InvalidError,
  box,
  pattern,
  fromNullable,
} from "plgg";

/**
 * A pipeline stage whose body is not yet implemented —
 * the typed `Err` the `build`/`dev` stubs return until
 * the later pipeline tickets fill them in. Pure tagged
 * data, never a thrown sentinel.
 */
export type NotImplementedError = Box<
  "NotImplementedError",
  { message: SoftStr }
>;

/**
 * Constructs a {@link NotImplementedError}.
 */
export const notImplementedError = (
  message: SoftStr,
): NotImplementedError =>
  box("NotImplementedError")({ message });

/**
 * Pattern matcher for folding a
 * {@link NotImplementedError} with `match` by tag.
 */
export const notImplementedError$ = () =>
  pattern("NotImplementedError")();

/**
 * A failure while loading the consumer's `site.config`:
 * the file was missing, threw on import, or its default
 * export did not validate as a {@link SiteConfig}.
 * `cause` carries the underlying {@link InvalidError}
 * when the failure was a validation miss. Result-style,
 * so config loading never throws.
 */
export type ConfigLoadError = Box<
  "ConfigLoadError",
  {
    message: SoftStr;
    cause: Option<InvalidError>;
  }
>;

/**
 * Constructs a {@link ConfigLoadError}. `cause` is the
 * validation error when present.
 */
export const configLoadError = ({
  message,
  cause,
}: {
  message: SoftStr;
  cause?: InvalidError;
}): ConfigLoadError =>
  box("ConfigLoadError")({
    message,
    cause: fromNullable(cause),
  });

/**
 * Pattern matcher for folding a {@link ConfigLoadError}
 * with `match` by tag.
 */
export const configLoadError$ = () =>
  pattern("ConfigLoadError")();
