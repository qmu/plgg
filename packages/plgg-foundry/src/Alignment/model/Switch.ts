import { Obj, isRawObj, hasProp } from "plgg";
import { NameTableEntry } from "plgg-foundry/index";

/**
 * Operation that evaluates a condition and branches.
 * Loads inputs from registers via input NameTableEntry array, executes switcher, branches based on boolean result.
 * Stores outputs via outputWhenTrue or outputWhenFalse NameTableEntry array depending on result.
 * 'name' is the unique identifier for this operation (used by next/nextWhenTrue/nextWhenFalse references).
 * 'action' specifies which switcher function to execute.
 */
export type Switch = Obj<{
  type: "switch";
  name: string;
  action: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  input: ReadonlyArray<NameTableEntry>;
  outputWhenTrue: ReadonlyArray<NameTableEntry>;
  outputWhenFalse: ReadonlyArray<NameTableEntry>;
}>;

/**
 * Type guard checking if operation is switch type.
 */
export const isSwitch = (
  op: unknown,
): op is Switch =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
