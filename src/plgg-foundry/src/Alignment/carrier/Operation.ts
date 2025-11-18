import {
  Result,
  InvalidError,
  newOk,
  newErr,
} from "plgg";
import {
  EgressOperation,
  IngressOperation,
  InternalOperation,
  isInternalOperation,
  isIngressOperation,
  isEgressOperation,
} from "plgg-foundry/index";

/**
 * Union of all operation types in an alignment.
 * Operations are executed sequentially following control flow.
 */
export type Operation =
  | EgressOperation
  | IngressOperation
  | InternalOperation;

/**
 * Type guard checking if value is any valid operation type.
 */
export const isOperation = (
  op: unknown,
): op is Operation =>
  isIngressOperation(op) ||
  isEgressOperation(op) ||
  isInternalOperation(op);

/**
 * Validates and casts a value to Operation type.
 */
export const asOperation = (
  value: unknown,
): Result<Operation, InvalidError> => {
  if (isOperation(value)) {
    return newOk(value);
  }
  return newErr(
    new InvalidError({
      message: "Value is not a valid Operation",
    }),
  );
};
