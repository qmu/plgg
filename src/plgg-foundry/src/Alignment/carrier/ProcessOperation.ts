import {
  Obj,
  Vec,
  isRawObj,
  hasProp,
} from "plgg";

export type ProcessOperation = Obj<{
  type: "process";
  opcode: string;
  loadAddr: Vec<string>;
  saveAddr: Vec<string>;
  next: string;
}>;

export const isProcessOperation = (
  op: unknown,
): op is ProcessOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "process";
