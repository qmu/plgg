import { Operation } from "plgg-foundry/index";

export type ProcessOperation = Readonly<{
  type: "process";
  opcode: string;
  loadAddr: string;
  saveAddr: string;
  next?: string;
  exit?: true;
}>;

export const isProcessOperation = (
  op: Operation,
): op is ProcessOperation =>
  op.type === "process";
