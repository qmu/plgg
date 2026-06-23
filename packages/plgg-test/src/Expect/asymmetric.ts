/**
 * Asymmetric matchers — values like `expect.stringContaining("x")`
 * that the corpus passes as arguments to `toHaveBeenCalledWith`.
 * Instead of structural equality, the surrounding deep-equal asks the
 * matcher whether a concrete value satisfies it.
 *
 * Only `stringContaining` is implemented — the single asymmetric
 * matcher the corpus uses (7 call sites).
 */
const TAG = "__plggTestAsymmetric";

export type Asymmetric = Readonly<{
  [TAG]: true;
  test: (actual: unknown) => boolean;
  describe: string;
}>;

export const isAsymmetric = (
  value: unknown,
): value is Asymmetric =>
  typeof value === "object" &&
  value !== null &&
  TAG in value &&
  value[TAG] === true;

export const stringContaining = (
  substring: string,
): Asymmetric => ({
  [TAG]: true,
  test: (actual) =>
    typeof actual === "string" &&
    actual.includes(substring),
  describe: `stringContaining(${JSON.stringify(substring)})`,
});
