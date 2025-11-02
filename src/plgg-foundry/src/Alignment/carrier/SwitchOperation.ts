import { Operation } from "plgg-foundry/index";

export type SwitchOperation = Readonly<{
  type: "switch";
  opcode: string;
  nextWhenTrue: string;
  nextWhenFalse: string;
  loadAddr: string;
  saveAddrTrue: string;
  saveAddrFalse: string;
}>;

export const isSwitchOperation = (
  op: Operation,
): op is SwitchOperation => op.type === "switch";
