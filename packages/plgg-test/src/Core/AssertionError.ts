/**
 * The single error type thrown by the assertion boundary.
 *
 * BY DESIGN this is a `throw`-ing seam, not a `Result` one (Plan
 * Amendment 5): `expect`/`assert` must throw so that (a) a failing
 * matcher unwinds the test body immediately and (b) `assert` can be
 * typed `asserts cond` — a Result return cannot narrow a type. The
 * Option/Result/`match` house style governs the runner orchestration
 * (Core/Runner, Cli, Coverage), NOT the assertion API. Do not
 * "Result-ify" the matchers.
 *
 * It carries `expected`/`actual` (when known) so the reporter can show
 * a useful diff without re-deriving them.
 */
export class AssertionError extends Error {
  public readonly expected: string;

  public readonly actual: string;

  public constructor(args: {
    message: string;
    expected?: string;
    actual?: string;
  }) {
    super(args.message);
    this.name = "AssertionError";
    this.expected = args.expected ?? "";
    this.actual = args.actual ?? "";
  }
}

/**
 * Type guard for {@link AssertionError}, so the reporter can branch on
 * "expected failure shape" vs. an unexpected thrown value without a
 * cast.
 */
export const isAssertionError = (
  value: unknown,
): value is AssertionError =>
  value instanceof AssertionError;
