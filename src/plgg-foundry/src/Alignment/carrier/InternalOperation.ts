import {
  ProcessOperation,
  SwitchOperation,
  isProcessOperation,
  isSwitchOperation,
} from "plgg-foundry/index";

export type InternalOperation =
  | ProcessOperation
  | SwitchOperation;

export const isInternalOperation = (
  op: unknown,
): op is InternalOperation =>
  isProcessOperation(op) || isSwitchOperation(op);
