import { Operation } from "autoplgg/index";

export type SwitcherOperation = Readonly<{
  type: "switcher";
  id: string;
  whenTrue: string;
  whenFalse: string;
}>;

export const isSwitcherOperation = (
  op: Operation,
): op is SwitcherOperation =>
  op.type === "switcher";
