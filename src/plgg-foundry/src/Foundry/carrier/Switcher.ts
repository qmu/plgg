import {
  KebabCase,
  Str,
  Castable,
  Option,
  PossiblyPromise,
  Vec,
  Datum,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
  isSome,
  asVecOf,
} from "plgg";
import {
  Medium,
  VirtualType,
  VirtualTypeSpec,
  asVirtualType,
} from "plgg-foundry/index";

export type Switcher = Readonly<{
  name: KebabCase;
  description: Str;
  arguments: Option<Vec<VirtualType>>;
  returnsWhenTrue: Option<Vec<VirtualType>>;
  returnsWhenFalse: Option<Vec<VirtualType>>;
  check: (medium: Medium) => PossiblyPromise<
    [
      boolean, // validity
      Datum, // proppagating data
    ]
  >;
}>;

export type SwitcherSpec = Readonly<{
  name: string;
  description: string;
  arguments?: ReadonlyArray<VirtualTypeSpec>;
  returnsWhenTrue?: ReadonlyArray<VirtualTypeSpec>;
  returnsWhenFalse?: ReadonlyArray<VirtualTypeSpec>;
  check: (medium: Medium) => PossiblyPromise<
    [
      boolean, // validity
      unknown, // proppagating data
    ]
  >;
}>;

export const asSwitcher = (value: SwitcherSpec) =>
  cast(
    value,
    forProp("name", asKebabCase),
    forProp("description", asStr),
    forOptionProp(
      "arguments",
      asVecOf(asVirtualType),
    ),
    forOptionProp(
      "returnsWhenTrue",
      asVecOf(asVirtualType),
    ),
    forOptionProp(
      "returnsWhenFalse",
      asVecOf(asVirtualType),
    ),
    forProp("check", asFunc),
  );

/**
 * Castable instance for Switcher safe casting.
 */
export const switcherCastable: Castable<
  Switcher,
  SwitcherSpec
> = {
  as: asSwitcher,
};

const formatVirtualType = (
  vt: VirtualType,
): string => {
  const isOptional = isSome(vt.optional)
    ? vt.optional.content
    : true;
  const optionalMarker = isOptional ? "?" : "";
  return `${vt.name.content}: ${vt.type.content}${optionalMarker}`;
};

export const explainSwitcher = (
  switcher: Switcher,
) =>
  `${switcher.description.content}

- Opcode: \`${switcher.name.content}\`
- Arguments: ${
    isSome(switcher.arguments)
      ? switcher.arguments.content
          .map(formatVirtualType)
          .join(", ")
      : "Any"
  }
- Returns When True: ${
    isSome(switcher.returnsWhenTrue)
      ? switcher.returnsWhenTrue.content
          .map(formatVirtualType)
          .join(", ")
      : "Any"
  }
- Returns When False: ${
    isSome(switcher.returnsWhenFalse)
      ? switcher.returnsWhenFalse.content
          .map(formatVirtualType)
          .join(", ")
      : "Any"
  }`;
