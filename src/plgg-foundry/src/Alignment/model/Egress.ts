import {
  Obj,
  Dict,
  Result,
  InvalidError,
  isRawObj,
  hasProp,
  ok,
  err,
} from "plgg";

/**
 * Exit point operation that maps register addresses to output field names.
 * Must appear at least once in alignment.
 */
export type Egress = Obj<{
  type: "egress";
  result: Dict;
}>;

/**
 * Type guard checking if operation is egress type.
 */
export const isEgress = (
  op: unknown,
): op is Egress =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "egress";

/**
 * Validates and casts a value to Egress type.
 */
export const asEgress = (
  value: unknown,
): Result<Egress, InvalidError> => {
  if (isEgress(value)) {
    return ok(value);
  }
  return err(
    new InvalidError({
      message: "Value is not a valid Egress",
    }),
  );
};
