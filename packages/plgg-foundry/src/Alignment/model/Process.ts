import { Obj, isRawObj, hasProp } from "plgg";
import { NameTableEntry } from "plgg-foundry/index";

/**
 * Operation that executes a processor function.
 * Loads inputs from registers via input NameTableEntry array, executes processor, stores outputs via output NameTableEntry array.
 * 'name' is the unique identifier for this operation (used by next/nextWhenTrue/nextWhenFalse references).
 * 'action' specifies which processor function to execute.
 */
export type Process = Obj<{
  type: "process";
  name: string;
  action: string;
  input: ReadonlyArray<NameTableEntry>;
  output: ReadonlyArray<NameTableEntry>;
  next: string;
}>;

/**
 * Type guard checking if operation is process type.
 */
export const isProcess = (
  op: unknown,
): op is Process =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "process";
