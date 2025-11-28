import {
  Process,
  Switch,
  isProcess,
  isSwitch,
} from "plgg-foundry/index";

/**
 * Union of operations that can be referenced by opcode (process and switch).
 * These operations form the middle of the alignment between ingress and egress.
 */
export type InternalOperation = Process | Switch;

/**
 * Type guard checking if operation is internal type (process or switch).
 */
export const isInternalOperation = (
  op: unknown,
): op is InternalOperation =>
  isProcess(op) || isSwitch(op);
