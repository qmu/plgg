import {
  Result,
  Str,
  newOk,
  newErr,
  asStr,
  asObj,
  cast,
  forProp,
  asReadonlyArray,
} from "plgg";
import {
  Operation,
  IngressOperation,
  InternalOperation,
  isInternalOperation,
  isIngressOperation,
  isEgressOperation,
  asOperation,
} from "plgg-foundry/index";

export type Alignment = Readonly<{
  instruction: Str;
  operations: ReadonlyArray<Operation>;
}>;

export const asAlignment = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("instruction", asStr),
    forProp(
      "operations",
      asReadonlyArray(asOperation),
    ),
  );

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
  ): Result<InternalOperation, Error> => {
    const op = alignment.operations.find(
      (o) =>
        isInternalOperation(o) &&
        o.opcode === opcode,
    );
    return op && isInternalOperation(op)
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
