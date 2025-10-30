import { Result, newOk, newErr } from "plgg";
import {
  Operation,
  IngressOperation,
  isInternalOperation,
  isIngressOperation,
  isEgressOperation,
} from "autoplgg/index";

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

export const findInternalOp = (
  alignment: Alignment,
  opcode: string,
): Result<Operation, Error> => {
  const operation = alignment.operations.find(
    (op) =>
      isInternalOperation(op) &&
      op.opcode === opcode,
  );
  if (!operation) {
    return newErr(
      new Error(
        `No operation found for opcode "${opcode}"`,
      ),
    );
  }
  return newOk(operation);
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
