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
export type Operation = Process | Switch;

/**
 * Type guard checking if operation is process or switch.
 */
export const isOperation = (
  op: unknown,
): op is Operation =>
  isProcess(op) || isSwitch(op);

/**
 * Validates and casts a value to Operation type.
 */
export const asOperation = (
  value: unknown,
): Result<Operation, InvalidError> => {
  if (isOperation(value)) {
    return ok(value);
  }
  return err(
    new InvalidError({
      message: "Value is not a valid Operation",
    }),
  );
};
