import {
  ProcessOperation,
  SwitchOperation,
  Operation,
  isProcessOperation,
  isSwitchOperation,
} from "autoplgg/index";

export type InternalOperation =
  | ProcessOperation
  | SwitchOperation;

export const isInternalOperation = (
  op: Operation,
): op is InternalOperation =>
  isProcessOperation(op) || isSwitchOperation(op);
