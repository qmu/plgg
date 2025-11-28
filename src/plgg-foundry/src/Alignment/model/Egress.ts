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
