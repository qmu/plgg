import { Obj, isRawObj, hasProp } from "plgg";
import { NameTableEntry } from "plgg-foundry/index";

/**
 * Operation that evaluates a condition and branches.
 * Loads inputs from registers via input NameTableEntry array, executes switcher, branches based on boolean result.
 * Stores outputs via outputWhenTrue or outputWhenFalse NameTableEntry array depending on result.
 */
export type SwitchOperation = Obj<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  input: ReadonlyArray<NameTableEntry>;
  outputWhenTrue: ReadonlyArray<NameTableEntry>;
  outputWhenFalse: ReadonlyArray<NameTableEntry>;
}>;

/**
 * Type guard checking if operation is switch type.
 */
export const isSwitchOperation = (
  op: unknown,
): op is SwitchOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
