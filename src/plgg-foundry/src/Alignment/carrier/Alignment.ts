import { Result, newOk, newErr } from "plgg";
import {
  Operation,
  IngressOperation,
  isInternalOperation,
  isOperation,
  isIngressOperation,
  isEgressOperation,
} from "plgg-foundry/index";

export type Alignment = {
  instruction: string;
  operations: ReadonlyArray<Operation>;
};

export const findIngressOp = (
  alignment: Alignment,
): Result<IngressOperation, Error> => {
  const operation = alignment.operations.find(
    (op) => isIngressOperation(op),
  );
  if (!operation) {
    return newErr(
      new Error(`No ingress operation found`),
    );
  }
  return newOk(operation);
};

export const findInternalOp =
  (opcode: string) =>
  (
    alignment: Alignment,
  ): Result<Operation, Error> => {
    const op = alignment.operations.find(
      (o) =>
        isInternalOperation(o) &&
        o.opcode === opcode,
    );
    return op && isOperation(op)
      ? newOk(op)
      : newErr(
          new Error(
            `No operation found for opcode "${opcode}"`,
          ),
        );
  };

export const findEgressOp = (
  alignment: Alignment,
): Result<Operation, Error> => {
  const operation = alignment.operations.find(
    (op) => isEgressOperation(op),
  );
  if (!operation) {
    return newErr(
      new Error(`No egress operation found`),
    );
  }
  return newOk(operation);
};
