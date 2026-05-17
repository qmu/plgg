import {
  Dict,
  Box,
  box,
  isBoxWithTag,
} from "plgg";
import {
  VirtualType,
  VirtualTypeSpec,
  VariableName,
  formatEntries,
  toVirtualTypeDict,
} from "plgg-foundry/index";

/**
 * Output specification defining egress fields and their types.
 * Maps output variable names to their type specifications.
 */
export type Packer = Box<
  "Packer",
  Dict<VariableName, VirtualType>
>;

/**
 * Type guard to check if apparatus is a Packer.
 * Packers are plain Dict objects without 'process' or 'check' functions.
 */
export const isPacker = (
  v: unknown,
): v is Packer => isBoxWithTag("Packer")(v);

/**
 * Creates a new Packer with type-safe content.
 */
export const makePacker = (
  spec: Dict<VariableName, VirtualTypeSpec>,
): Packer =>
  box("Packer")(toVirtualTypeDict(spec));

/**
 * Generates human-readable markdown description of packer.
 */
export const explainPacker = (packer: Packer) =>
  `Outputs: ${formatEntries(
    Object.entries(packer.content),
  )}`;
