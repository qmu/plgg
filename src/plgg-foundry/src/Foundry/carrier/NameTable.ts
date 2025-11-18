import { Obj } from "plgg";

/**
 * Variable name used in function arguments or return values.
 */
export type VariableName = string;

/**
 * Register address in the register machine (e.g., "r0", "r1").
 */
export type Address = string;

/**
 * Maps variable names to register addresses for data flow.
 */
export type NameTable = Obj<
  Record<VariableName, Address>
>;
