import {
  Obj,
  Result,
  InvalidError,
  isRawObj,
  hasProp,
  ok,
  err,
} from "plgg";

/**
 * Entry point operation that assigns user input (prompt and files) to registers.
 * Must be first operation and appear exactly once in alignment.
 */
export type Ingress = Obj<{
  type: "ingress";
  next: string;
  promptAddr: string;
  file1Addr?: string;
  file2Addr?: string;
  file3Addr?: string;
  file4Addr?: string;
  file5Addr?: string;
}>;

/**
 * Type guard checking if operation is ingress type.
 */
export const isIngress = (
  op: unknown,
): op is Ingress =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "ingress";

/**
 * Validates and casts a value to Ingress type.
 */
export const asIngress = (
  value: unknown,
): Result<Ingress, InvalidError> => {
  if (isIngress(value)) {
    return ok(value);
  }
  return err(
    new InvalidError({
      message: "Value is not a valid Ingress",
    }),
  );
};
