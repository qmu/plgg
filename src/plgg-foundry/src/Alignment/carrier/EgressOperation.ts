import {
  Obj,
  Dict,
  isRawObj,
  hasProp,
} from "plgg";

export type EgressOperation = Obj<{
  type: "egress";
  result: Dict;
}>;

export const isEgressOperation = (
  op: unknown,
): op is EgressOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "egress";
