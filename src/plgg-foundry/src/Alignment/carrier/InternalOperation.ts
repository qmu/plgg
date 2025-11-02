import {
  ProcessOperation,
  SwitchOperation,
  Operation,
  isProcessOperation,
  isSwitchOperation,
} from "plgg-foundry/index";

export type InternalOperation =
  | ProcessOperation
  | SwitchOperation;

export const isInternalOperation = (
  op: Operation,
): op is InternalOperation =>
  isProcessOperation(op) || isSwitchOperation(op);
