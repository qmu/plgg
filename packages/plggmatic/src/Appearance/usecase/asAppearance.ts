import {
  type Result,
  type InvalidError,
  asSoftStr,
  asObj,
  forProp,
  cast,
  ok,
  err,
  isErr,
  invalidError,
} from "plgg";
import {
  type Color,
  colors,
} from "plggmatic/Style/model/token";
import {
  type Appearance,
  type Mark,
} from "plggmatic/Appearance/model/appearance";

/**
 * A colour ROLE by name (`text`, `primary-base`, …): one
 * of the palette's roles, never a literal colour — an
 * appearance says which role draws a thing, the palette
 * says what colour that role is.
 */
const asColor = (
  value: unknown,
): Result<Color, InvalidError> => {
  const found = colors.find(
    (c: Color): boolean => c === value,
  );
  return found === undefined
    ? err(
        invalidError({
          message:
            "not a colour role (text, surface, primary-base, …)",
        }),
      )
    : ok(found);
};

const asMark = (
  value: unknown,
): Result<Mark, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("fill", asColor),
    forProp("ink", asColor),
  );

/**
 * Validate an unknown value (a config file's `appearance`)
 * into an {@link Appearance}. Every field is required: an
 * appearance cannot leave a decision out, so a product
 * that wants "the default but rounder" spreads the default
 * and names what it changes
 * (`{ ...monochrome, radius: "6px" }`). A failure names
 * the field.
 */
export const asAppearance = (
  value: unknown,
): Result<Appearance, InvalidError> => {
  // two passes: `cast` composes at most twenty steps
  const drawn = cast(
    value,
    asObj,
    forProp("name", asSoftStr),
    forProp("font", asSoftStr),
    forProp("mono", asSoftStr),
    forProp("size", asSoftStr),
    forProp("leading", asSoftStr),
    forProp("rule", asColor),
    forProp("hairline", asColor),
    forProp("ruleWidth", asSoftStr),
    forProp("radius", asSoftStr),
    forProp("current", asMark),
    forProp("hover", asMark),
    forProp("press", asMark),
  );
  return isErr(drawn)
    ? err(drawn.content)
    : cast(
        drawn.content,
        forProp("head", asSoftStr),
        forProp("gutter", asSoftStr),
        forProp("page", asSoftStr),
        forProp("elevation", asSoftStr),
        forProp("quick", asSoftStr),
        forProp("arrive", asSoftStr),
        forProp("leave", asSoftStr),
        forProp("swap", asSoftStr),
        forProp("ease", asSoftStr),
      );
};
