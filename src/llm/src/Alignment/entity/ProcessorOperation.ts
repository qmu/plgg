import { Operation } from "autoplgg/index";

export type ProcessorOperation = Readonly<{
  type: "process";
  initial?: boolean;
  final?: boolean;
  opcode: string;
  next?: string;
  src?: string;
  dist: string;
}>;

export const isProcessorOperation = (
  op: Operation,
): op is ProcessorOperation =>
  op.type === "process";
