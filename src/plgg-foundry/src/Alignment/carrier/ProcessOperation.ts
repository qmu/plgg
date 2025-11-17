import { Obj, isRawObj, hasProp } from "plgg";
import { IO } from "plgg-foundry/index";

export type ProcessOperation = Obj<{
  type: "process";
  opcode: string;
  loadAddr: IO;
  saveAddr: IO;
  next: string;
}>;

export const isProcessOperation = (
  op: unknown,
): op is ProcessOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "process";
