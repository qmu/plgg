import { Operation } from "autoplgg/index";

export type SwitcherOperation = Readonly<{
  type: "switch";
  opcode: string;
  whenTrue: string;
  whenFalse: string;
  src: string;
  distWhenTrue: string;
  distWhenFalse: string;
}>;

export const isSwitcherOperation = (
  op: Operation,
): op is SwitcherOperation =>
  op.type === "switch";
