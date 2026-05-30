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
  Operation,
  isOperation,
  asIngress,
  asEgress,
  asOperation,
} from "plgg-foundry/index";

/**
 * Sequence of operations that processes input to output, like a factory production line.
 * Contains analysis, rationale, refined user request, and ordered operations.
 */
export type Alignment = Obj<{
  analysis: Str;
  ingress: Ingress;
  operations: Vec<Operation>;
  egress: Egress;
}>;

/**
 * Validates and casts a value to Alignment type.
 */
export const asAlignment = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("analysis", asStr),
    forProp("ingress", asIngress),
    forProp(
      "operations",
      asReadonlyArray(asOperation),
    ),
    forProp("egress", asEgress),
  );

/**
 * Returns the ingress operation (entry point) from alignment.
 * Every alignment must have exactly one ingress operation.
 */
export const findIngress = (
  alignment: Alignment,
): Result<Ingress, Error> =>
  ok(alignment.ingress);

/**
 * Finds an operation (process or switch) by name.
 * Used for control flow navigation between operations.
 */
export const findOperations =
  (name: string) =>
  (
    alignment: Alignment,
  ): Result<Operation, Error> =>
    pipe(
      alignment.operations,
      find<Operation, Operation>({
        predicate: (o): o is Operation =>
          isOperation(o) && o.name === name,
        errMessage: `No operation found for name "${name}"`,
      }),
    );

/**
 * Returns the egress operation (exit point) from alignment.
 * Every alignment must have exactly one egress operation.
 */
export const findEgress = (
  alignment: Alignment,
): Result<Egress, Error> => ok(alignment.egress);
