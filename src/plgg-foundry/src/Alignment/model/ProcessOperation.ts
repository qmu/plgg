import { Obj, isRawObj, hasProp } from "plgg";
import { NameTableEntry } from "plgg-foundry/index";

/**
 * Operation that executes a processor function.
 * Loads inputs from registers via input NameTableEntry array, executes processor, stores outputs via output NameTableEntry array.
 */
export type ProcessOperation = Obj<{
  type: "process";
  opcode: string;
  input: ReadonlyArray<NameTableEntry>;
  output: ReadonlyArray<NameTableEntry>;
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
