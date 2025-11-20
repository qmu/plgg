import {
  Obj,
  Castable,
  Str,
  Option,
  KebabCase,
  Box,
  newBox,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asKebabCase,
  isSome,
} from "plgg";

/**
 * Named output definition specifying which processor handles it.
 */
export type Packer = Obj<{
  name: Str;
  processedBy: KebabCase;
  description: Option<Str>;
}>;

export type PackerSpec = Box<
  "PackerSpec",
  Obj<{
    name: string;
    processedBy: string;
    description?: string;
  }>
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
  cast(
    value.content,
    forProp("name", asStr),
    forProp("processedBy", asKebabCase),
    forOptionProp("description", asStr),
  );

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
) => `${
  isSome(packer.description)
    ? packer.description.content.content
    : "N/A"
}

- Processed By: ${packer.processedBy.content}
`;
