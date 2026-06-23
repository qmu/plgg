/**
 * Parsed CLI invocation. `roots` default to `["src"]` when none given.
 */
export type Args = Readonly<{
  roots: ReadonlyArray<string>;
  watch: boolean;
  coverage: boolean;
}>;

/**
 * Parses `[roots...] [--watch] [--coverage]`. Pure, so it has its own
 * spec.
 */
export const parseArgs = (
  argv: ReadonlyArray<string>,
): Args => {
  const flags = argv.filter((a) =>
    a.startsWith("--"),
  );
  const roots = argv.filter(
    (a) => !a.startsWith("--"),
  );
  return {
    roots: roots.length > 0 ? roots : ["src"],
    watch: flags.includes("--watch"),
    coverage: flags.includes("--coverage"),
  };
};
