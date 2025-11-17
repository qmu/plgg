import { Obj, isRawObj, hasProp } from "plgg";
import { IO } from "plgg-foundry/index";

export type SwitchOperation = Obj<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  inputAddresses: IO;
  outputAddressesTrue: IO;
  outputAddressesFalse: IO;
}>;

export const isSwitchOperation = (
  op: unknown,
): op is SwitchOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "switch";
