import { isRawObj, hasProp } from "plgg";

export type ProcessOperation = Readonly<{
  type: "process";
  opcode: string;
  loadAddr: string;
  saveAddr: string;
  next?: string;
  exit?: true;
}>;

export const isProcessOperation = (
  op: unknown,
): op is ProcessOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "process";
