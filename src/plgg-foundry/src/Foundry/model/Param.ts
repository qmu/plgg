import { VirtualType } from "plgg-foundry/Foundry/model/VirtualType";

/**
 * Typed value stored in a register.
 */
export type Param = unknown;

/**
 * A register entry stored in the execution environment.
 * Contains the value and an optional type descriptor.
 */
export type RegisterEntry = Readonly<{
  value: unknown;
  type?: VirtualType;
}>;
