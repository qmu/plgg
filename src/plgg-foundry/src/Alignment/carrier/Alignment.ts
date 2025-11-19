import {
  Result,
  Str,
  Obj,
  Vec,
  asStr,
  asObj,
  cast,
  forProp,
  asReadonlyArray,
  find,
  pipe,
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
): Result<IngressOperation, Error> =>
  pipe(
    alignment.operations,
    find({
      predicate: isIngressOperation,
      errMessage: "No ingress operation found",
    }),
  );

/**
 * Finds an internal operation (process or switch) by opcode.
 * Used for control flow navigation between operations.
 */
export const findInternalOp =
  (opcode: string) =>
  (
    alignment: Alignment,
  ): Result<InternalOperation, Error> =>
    pipe(
      alignment.operations,
      find<Operation, InternalOperation>({
        predicate: (o): o is InternalOperation =>
          isInternalOperation(o) &&
          o.opcode === opcode,
        errMessage: `No operation found for processorName "${opcode}"`,
      }),
    );

/**
 * Finds the egress operation (exit point) in alignment.
 * Every alignment must have at least one egress operation.
 */
export const findEgressOp = (
  alignment: Alignment,
): Result<Operation, Error> =>
  pipe(
    alignment.operations,
    find({
      predicate: isEgressOperation,
      errMessage: "No egress operation found",
    }),
  );
