import {
  type Box,
  type SoftStr,
  box,
  pattern,
} from "plgg";

/**
 * The config-load failure is the framework's — plggpress
 * re-exports the framework's typed error so its public
 * surface (and every existing consumer import) is
 * unchanged by the rewire onto the framework.
 */
export {
  type ConfigLoadError,
  configLoadError,
  configLoadError$,
} from "plggpress/framework";

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
