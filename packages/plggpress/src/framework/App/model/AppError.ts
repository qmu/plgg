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
 * A failure while loading the consumer app's config
 * module: the file was missing, threw on import, or its
 * default export did not validate through the app-supplied
 * caster. `cause` carries the underlying {@link
 * InvalidError} when the failure was a validation miss.
 * Result-style, so config loading never throws.
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
