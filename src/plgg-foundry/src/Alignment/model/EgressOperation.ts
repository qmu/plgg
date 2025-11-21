import {
  Obj,
  Dict,
  isRawObj,
  hasProp,
} from "plgg";

/**
 * Exit point operation that maps register addresses to output field names.
 * Must appear at least once in alignment.
 */
export type EgressOperation = Obj<{
  type: "egress";
  result: Dict;
}>;

/**
 * Type guard checking if operation is egress type.
 */
export const isEgressOperation = (
  op: unknown,
): op is EgressOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "egress";
