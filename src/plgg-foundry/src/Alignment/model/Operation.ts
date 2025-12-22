import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg";
import {
  Assign,
  Process,
  Switch,
  isAssign,
  isProcess,
  isSwitch,
} from "plgg-foundry/index";

/**
 * Union of operations that can be referenced by name.
 * These operations form the middle of the alignment between ingress and egress.
 */
export type Operation = Assign | Process | Switch;

/**
 * Type guard checking if operation is assign, process, or switch.
 */
export const isOperation = (
  op: unknown,
): op is Operation =>
  isAssign(op) || isProcess(op) || isSwitch(op);

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
