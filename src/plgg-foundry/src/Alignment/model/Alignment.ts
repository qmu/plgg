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
  Ingress,
  InternalOperation,
  isInternalOperation,
  isIngress,
  isEgress,
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
): Result<Ingress, Error> =>
  pipe(
    alignment.operations,
    find({
      predicate: isIngress,
      errMessage: "No ingress operation found",
    }),
  );

/**
 * Finds an internal operation (process or switch) by name.
 * Used for control flow navigation between operations.
 */
export const findInternalOp =
  (name: string) =>
  (
    alignment: Alignment,
  ): Result<InternalOperation, Error> =>
    pipe(
      alignment.operations,
      find<Operation, InternalOperation>({
        predicate: (o): o is InternalOperation =>
          isInternalOperation(o) &&
          o.name === name,
        errMessage: `No operation found for name "${name}"`,
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
      predicate: isEgress,
      errMessage: "No egress operation found",
    }),
  );
