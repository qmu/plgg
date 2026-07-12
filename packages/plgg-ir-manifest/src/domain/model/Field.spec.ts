import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { match, none } from "plgg";
import {
  boolExp,
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  booleanType,
  stringType,
  litExpr,
} from "plgg-ir-language";
import {
  ValidationRule,
  field,
  requiredRule,
  maxLengthRule,
  lengthBetweenRule,
  requiredWhenRule,
  isRequiredRule,
  requiredRule$,
  maxLengthRule$,
  lengthBetweenRule$,
  requiredWhenRule$,
} from "plgg-ir-manifest/domain/model/Field";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * Renders a rule through the exhaustive matcher set.
 */
const describeRule = (
  rule: ValidationRule,
): string =>
  match(rule)(
    [requiredRule$(), (): string => "required"],
    [
      maxLengthRule$(),
      ({ content }): string =>
        `max-length ${content.max}`,
    ],
    [
      lengthBetweenRule$(),
      ({ content }): string =>
        `length-between ${content.min} ${content.max}`,
    ],
    [
      requiredWhenRule$(),
      (): string => "required-when",
    ],
  );

test("validation rules construct and match exhaustively", () =>
  all([
    check(
      describeRule(requiredRule(at)),
      toBe("required"),
    ),
    check(
      describeRule(maxLengthRule(254, at)),
      toBe("max-length 254"),
    ),
    check(
      describeRule(lengthBetweenRule(1, 200, at)),
      toBe("length-between 1 200"),
    ),
    check(
      describeRule(
        requiredWhenRule(
          litExpr(booleanType, boolExp(true, at)),
          at,
        ),
      ),
      toBe("required-when"),
    ),
    check(
      isRequiredRule(requiredRule(at)),
      toBe(true),
    ),
    check(
      isRequiredRule(maxLengthRule(1, at)),
      toBe(false),
    ),
  ]));

test("field builds the IR record", () =>
  check(
    field(
      "name",
      stringType,
      none(),
      [requiredRule(at)],
      at,
    ).name,
    toBe("name"),
  ));
