import {
  Castable,
  Dict,
  Box,
  newBox,
  asDictOf,
} from "plgg";
import {
  VirtualType,
  VirtualTypeSpec,
  VariableName,
  asVirtualType,
  formatVirtualType,
} from "plgg-foundry/index";

/**
 * Output specification defining egress fields and their types.
 * Maps output variable names to their type specifications.
 */
export type Packer = Dict<VariableName, VirtualType>;

export type PackerSpec = Box<
  "PackerSpec",
  Dict<VariableName, VirtualTypeSpec>
>;

/**
 * Creates a new PackerSpec with type-safe content.
 */
export const newPackerSpec = (
  spec: PackerSpec["content"],
): PackerSpec =>
  newBox("PackerSpec")<PackerSpec["content"]>(spec);

/**
 * Validates and casts a PackerSpec to Packer.
 */
export const asPacker = (value: PackerSpec) =>
  asDictOf(asVirtualType)(value.content);

/**
 * Castable instance for Packer safe casting.
 */
export const packerCastable: Castable<
  Packer,
  PackerSpec
> = {
  as: asPacker,
};

/**
 * Generates human-readable markdown description of packer.
 */
export const explainPacker = (
  packer: Packer,
) => `Outputs: ${Object.entries(packer)
  .map(([name, vt]) => formatVirtualType(name, vt))
  .join(", ")}`;
