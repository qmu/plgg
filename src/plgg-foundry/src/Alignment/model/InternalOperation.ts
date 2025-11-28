import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg";
import {
  Process,
  Switch,
  isProcess,
  isSwitch,
} from "plgg-foundry/index";

/**
 * Union of operations that can be referenced by opcode (process and switch).
 * These operations form the middle of the alignment between ingress and egress.
 */
export type InternalOperation = Process | Switch;

/**
 * Type guard checking if operation is internal type (process or switch).
 */
export const isInternalOperation = (
  op: unknown,
): op is InternalOperation =>
  isProcess(op) || isSwitch(op);

/**
 * Validates and casts a value to InternalOperation type.
 */
export const asInternalOperation = (
  value: unknown,
): Result<InternalOperation, InvalidError> => {
  if (isInternalOperation(value)) {
    return ok(value);
  }
  return err(
    new InvalidError({
      message:
        "Value is not a valid InternalOperation",
    }),
  );
};
