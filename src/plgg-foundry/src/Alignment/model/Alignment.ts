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
  ok,
} from "plgg";
import {
  Ingress,
  Egress,
  InternalOperation,
  isInternalOperation,
  asIngress,
  asEgress,
  asInternalOperation,
} from "plgg-foundry/index";

/**
 * Sequence of operations that processes input to output, like a factory production line.
 * Contains analysis, rationale, refined user request, and ordered operations.
 */
export type Alignment = Obj<{
  userRequestAnalysis: Str;
  compositionRationale: Str;
  userRequest: Str;
  ingress: Ingress;
  internalOperations: Vec<InternalOperation>;
  egress: Egress;
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
    forProp("ingress", asIngress),
    forProp(
      "internalOperations",
      asReadonlyArray(asInternalOperation),
    ),
    forProp("egress", asEgress),
  );

/**
 * Returns the ingress operation (entry point) from alignment.
 * Every alignment must have exactly one ingress operation.
 */
export const findIngressOp = (
  alignment: Alignment,
): Result<Ingress, Error> => ok(alignment.ingress);

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
      alignment.internalOperations,
      find<InternalOperation, InternalOperation>({
        predicate: (o): o is InternalOperation =>
          isInternalOperation(o) &&
          o.name === name,
        errMessage: `No operation found for name "${name}"`,
      }),
    );

/**
 * Returns the egress operation (exit point) from alignment.
 * Every alignment must have exactly one egress operation.
 */
export const findEgressOp = (
  alignment: Alignment,
): Result<Egress, Error> => ok(alignment.egress);
