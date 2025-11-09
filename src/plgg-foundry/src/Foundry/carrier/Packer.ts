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
  isSome,
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
) => `${
  isSome(packer.description)
    ? packer.description.content.content
    : "N/A"
}

- Processed By: ${packer.processedBy.content}
`;
