import {
  Obj,
  Vec,
  isRawObj,
  hasProp,
} from "plgg";

export type SwitchOperation = Obj<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  loadAddr: Vec<string>;
  saveAddrTrue: Vec<string>;
  saveAddrFalse: Vec<string>;
}>;

export const isSwitchOperation = (
  op: unknown,
): op is SwitchOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
