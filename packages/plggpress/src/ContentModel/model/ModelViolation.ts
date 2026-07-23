import {
  type SoftStr,
  type Box,
  box,
  pattern,
} from "plgg";

/**
 * One content-model violation — the file it is in, the
 * field (when a field-level mismatch; absent for a
 * whole-block syntax error), and the reason. Collected
 * (not first-failure) so an author sees every problem.
 */
export type ModelViolation = Readonly<{
  path: SoftStr;
  reason: SoftStr;
}>;

/**
 * The typed aggregate error the build raises when any
 * page under a bound directory fails its content model —
 * the model-check counterpart of `BrokenLinks`.
 */
export type ModelViolations = Box<
  "ModelViolations",
  ReadonlyArray<ModelViolation>
>;

/** Constructs a {@link ModelViolations}. */
export const modelViolations = (
  violations: ReadonlyArray<ModelViolation>,
): ModelViolations =>
  box("ModelViolations")(violations);

/** Matcher for folding a {@link ModelViolations}. */
export const modelViolations$ = () =>
  pattern("ModelViolations")();
