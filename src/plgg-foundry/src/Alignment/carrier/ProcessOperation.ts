import { Obj, isRawObj, hasProp } from "plgg";
import { NameTable } from "plgg-foundry/index";

export type ProcessOperation = Obj<{
  type: "process";
  opcode: string;
  input: NameTable;
  output: NameTable;
  next: string;
}>;

export const isProcessOperation = (
  op: unknown,
): op is ProcessOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "process";
