import { Obj, isRawObj, hasProp } from "plgg";
import { NameTable } from "plgg-foundry/index";

export type SwitchOperation = Obj<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  input: NameTable;
  outputWhenTrue: NameTable;
  outputWhenFalse: NameTable;
}>;

export const isSwitchOperation = (
  op: unknown,
): op is SwitchOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
