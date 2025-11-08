import {
  Castable,
  Str,
  Option,
  KebabCase,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asKebabCase,
} from "plgg";

export type Packer = Readonly<{
  name: Str;
  processedBy: KebabCase;
  description: Option<Str>;
}>;

export type PackerSpec = Readonly<{
  name: string;
  processedBy: string;
  description?: string;
}>;

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

export const explainPacker = (
  packer: Packer,
) => `Packer:
  Name: ${packer.name}
  Processed By: ${packer.processedBy}
  Description: ${
    packer.description
      ? packer.description.content
      : "N/A"
  }`;
