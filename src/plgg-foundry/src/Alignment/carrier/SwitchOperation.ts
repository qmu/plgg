import { isRawObj, hasProp } from "plgg";

export type SwitchOperation = Readonly<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  loadAddr: string;
  saveAddrTrue: string;
  saveAddrFalse: string;
}>;

export const isSwitchOperation = (
  op: unknown,
): op is SwitchOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
