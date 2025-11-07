import { isRawObj, hasProp } from "plgg";

export type EgressOperation = Readonly<{
  type: "egress";
  result: Record<string, unknown>;
}>;

export const isEgressOperation = (
  op: unknown,
): op is EgressOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "egress";
