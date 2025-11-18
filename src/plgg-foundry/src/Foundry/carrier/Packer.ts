import {
  Obj,
  Castable,
  Str,
  Option,
  KebabCase,
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

export type PackerSpec = Obj<{
  name: string;
  processedBy: string;
  description?: string;
}>;

/**
 * Validates and casts a PackerSpec to Packer.
 */
export const asPacker = (value: PackerSpec) =>
  cast(
    value,
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
