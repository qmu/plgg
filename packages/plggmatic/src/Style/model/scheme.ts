/**
 * The two color schemes plggmatic ships. A closed union
 * (not a free string) so the scheme emitter and any
 * future scheme-aware code are exhaustive: adding a
 * third scheme is a compile error everywhere it must be
 * handled, never a silent gap.
 *
 * Light is the default; dark is opted into by a single
 * `dark` class on `<html>`, which reswitches every
 * `--pm-*` custom property (see the scheme CSS emitter).
 * The scheme is chosen by one class, not threaded
 * through the component tree — colors stay data.
 */
export type Scheme = "light" | "dark";

/**
 * Every {@link Scheme}, in emit order (light first, then
 * the `html.dark` override). Iterated by the scheme CSS
 * emitter and by the contrast spec so both cover the
 * whole union without hard-coding the members twice.
 */
export const schemes: ReadonlyArray<Scheme> = [
  "light",
  "dark",
];
