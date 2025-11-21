import { Obj, isRawObj, hasProp } from "plgg";
import { NameTable } from "plgg-foundry/index";

/**
 * Operation that executes a processor function.
 * Loads inputs from registers via input NameTable, executes processor, stores outputs via output NameTable.
 */
export type ProcessOperation = Obj<{
  type: "process";
  opcode: string;
  input: NameTable;
  output: NameTable;
  next: string;
}>;

/**
 * Type guard checking if operation is process type.
 */
export const isProcessOperation = (
  op: unknown,
): op is ProcessOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "process";
