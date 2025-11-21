import { Obj, isRawObj, hasProp } from "plgg";

/**
 * Entry point operation that assigns user input (prompt and files) to registers.
 * Must be first operation and appear exactly once in alignment.
 */
export type IngressOperation = Obj<{
  type: "ingress";
  next: string;
  promptAddr: string;
  file1Addr?: string;
  file2Addr?: string;
  file3Addr?: string;
  file4Addr?: string;
  file5Addr?: string;
}>;

/**
 * Type guard checking if operation is ingress type.
 */
export const isIngressOperation = (
  op: unknown,
): op is IngressOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "ingress";
