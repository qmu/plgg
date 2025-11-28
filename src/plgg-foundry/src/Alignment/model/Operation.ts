import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg";
import {
  Egress,
  Ingress,
  InternalOperation,
  isInternalOperation,
  isIngress,
  isEgress,
} from "plgg-foundry/index";

/**
 * Union of all operation types in an alignment.
 * Operations are executed sequentially following control flow.
 */
export type Operation =
  | Egress
  | Ingress
  | InternalOperation;

/**
 * Type guard checking if value is any valid operation type.
 */
export const isOperation = (
  op: unknown,
): op is Operation =>
  isIngress(op) ||
  isEgress(op) ||
  isInternalOperation(op);

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
