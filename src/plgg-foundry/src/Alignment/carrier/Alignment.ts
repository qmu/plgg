import {
  Result,
  Str,
  Obj,
  Vec,
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

/**
 * Sequence of operations that processes input to output, like a factory production line.
 * Contains analysis, rationale, refined user request, and ordered operations.
 */
export type Alignment = Obj<{
  userRequestAnalysis: Str;
  compositionRationale: Str;
  userRequest: Str;
  operations: Vec<Operation>;
}>;

/**
 * Validates and casts a value to Alignment type.
 */
export const asAlignment = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("userRequestAnalysis", asStr),
    forProp("compositionRationale", asStr),
    forProp("userRequest", asStr),
    forProp(
      "operations",
      asReadonlyArray(asOperation),
    ),
  );

/**
 * Finds the ingress operation (entry point) in alignment.
 * Every alignment must have exactly one ingress operation.
 */
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

/**
 * Finds an internal operation (process or switch) by opcode.
 * Used for control flow navigation between operations.
 */
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
            `No operation found for processorName "${opcode}"`,
          ),
        );
  };

/**
 * Finds the egress operation (exit point) in alignment.
 * Every alignment must have at least one egress operation.
 */
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
