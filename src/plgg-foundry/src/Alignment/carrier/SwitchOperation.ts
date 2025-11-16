import { isRawObj, hasProp } from "plgg";

export type SwitchOperation = Readonly<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  loadAddr: ReadonlyArray<string>;
  saveAddrTrue: ReadonlyArray<string>;
  saveAddrFalse: ReadonlyArray<string>;
}>;

export const isSwitchOperation = (
  op: unknown,
): op is SwitchOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
