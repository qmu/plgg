import { Obj, isRawObj, hasProp } from "plgg";
import { Address } from "plgg-foundry/index";

/**
 * Operation that binds a specific value to a register address.
 * Used for assigning constant values without processor execution.
 * 'name' is the unique identifier for this operation.
 * 'next' specifies the next operation to execute.
 */
export type Assign = Obj<{
  type: "assign";
  name: string;
  address: Address;
  value: string;
  next: string;
}>;

/**
 * Type guard checking if operation is assign type.
 */
export const isAssign = (
  op: unknown,
): op is Assign =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "assign";
