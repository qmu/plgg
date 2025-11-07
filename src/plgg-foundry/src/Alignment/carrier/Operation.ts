import {
  EgressOperation,
  IngressOperation,
  InternalOperation,
  isInternalOperation,
  isIngressOperation,
  isEgressOperation,
} from "plgg-foundry/index";
import { Result, InvalidError, newOk, newErr } from "plgg";

export type Operation =
  | EgressOperation
  | IngressOperation
  | InternalOperation;

export const isOperation = (
  op: unknown,
): op is Operation =>
  isIngressOperation(op) ||
  isEgressOperation(op) ||
  isInternalOperation(op);

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
