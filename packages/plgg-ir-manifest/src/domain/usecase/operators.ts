import { ok, err, pipe } from "plgg";
import {
  SemType,
  SemDiagnostic,
  OperatorDef,
  defineOperator,
  fixedSignature,
  booleanType,
  integerType,
  decimalType,
  dateType,
  nominalType,
  isPrimType,
  isParamType,
  semTypeEquals,
  formatSemType,
  semMismatch,
  codeTypeMismatch,
} from "plgg-ir-language";
import { SourceRange } from "plgg-ir-syntax";

/**
 * One mismatch diagnostic for a manifest operator.
 */
const operatorMismatch = (
  name: string,
  expected: string,
  args: ReadonlyArray<SemType>,
  range: SourceRange,
): ReadonlyArray<SemDiagnostic> => [
  semMismatch(
    codeTypeMismatch,
    `${name} expected ${expected} but found ${args.map(formatSemType).join(" × ")}`,
    range,
    expected,
    args.map(formatSemType).join(" × "),
  ),
];

/**
 * Is this a numeric primitive (`integer`/`decimal`)?
 */
const isNumeric = (t: SemType): boolean =>
  isPrimType(t) &&
  (t.content.name === "integer" ||
    t.content.name === "decimal");

/**
 * The wider of two numerics: `integer` only when both
 * are integers.
 */
const widerNumeric = (
  a: SemType,
  b: SemType,
): SemType =>
  isPrimType(a) &&
  a.content.name === "integer" &&
  isPrimType(b) &&
  b.content.name === "integer"
    ? integerType
    : decimalType;

/**
 * Is this a `(money ...)` parameterized type?
 */
const isMoney = (t: SemType): boolean =>
  isParamType(t) && t.content.name === "money";

/**
 * `=` — two operands of the SAME semantic type
 * (nominal domain types stay distinct even when their
 * storage matches, design.md §8).
 */
const equalsOperator: OperatorDef =
  defineOperator("=", (args, range) =>
    args.length === 2 &&
    args
      .slice(0, 1)
      .every((a) =>
        args
          .slice(1)
          .every((b) => semTypeEquals(a)(b)),
      )
      ? ok(booleanType)
      : err(
          operatorMismatch(
            "=",
            "two operands of one type",
            args,
            range,
          ),
        ),
  );

/**
 * `+` — `Money<C> + Money<C> → Money<C>` (differing
 * currencies rejected, design.md §8) or numeric
 * addition.
 */
const plusOperator: OperatorDef = defineOperator(
  "+",
  (args, range) =>
    args.length === 2 &&
    args.every(isMoney) &&
    args
      .slice(0, 1)
      .every((a) =>
        args
          .slice(1)
          .every((b) => semTypeEquals(a)(b)),
      )
      ? pipe(
          args
            .slice(0, 1)
            .reduce<SemType>(
              (_, a) => a,
              decimalType,
            ),
          (money: SemType) => ok(money),
        )
      : args.length === 2 && args.every(isNumeric)
        ? pipe(args, (pair) =>
            ok(
              widerNumeric(
                pair
                  .slice(0, 1)
                  .reduce<SemType>(
                    (_, a) => a,
                    decimalType,
                  ),
                pair
                  .slice(1)
                  .reduce<SemType>(
                    (_, a) => a,
                    decimalType,
                  ),
              ),
            ),
          )
        : err(
            operatorMismatch(
              "+",
              "(money C) + (money C), or numeric + numeric",
              args,
              range,
            ),
          ),
);

/**
 * `*` — `Money<C> × Percentage → Money<C>`
 * (design.md §8) or numeric multiplication.
 */
const timesOperator: OperatorDef = defineOperator(
  "*",
  (args, range) =>
    args.length === 2 &&
    args.slice(0, 1).every(isMoney) &&
    args
      .slice(1)
      .every((b) =>
        semTypeEquals(b)(
          nominalType("percentage"),
        ),
      )
      ? pipe(
          args
            .slice(0, 1)
            .reduce<SemType>(
              (_, a) => a,
              decimalType,
            ),
          (money: SemType) => ok(money),
        )
      : args.length === 2 && args.every(isNumeric)
        ? pipe(args, (pair) =>
            ok(
              widerNumeric(
                pair
                  .slice(0, 1)
                  .reduce<SemType>(
                    (_, a) => a,
                    decimalType,
                  ),
                pair
                  .slice(1)
                  .reduce<SemType>(
                    (_, a) => a,
                    decimalType,
                  ),
              ),
            ),
          )
        : err(
            operatorMismatch(
              "*",
              "(money C) × percentage, or numeric × numeric",
              args,
              range,
            ),
          ),
);

/**
 * The Domain Manifest's closed operator vocabulary
 * (design.md §8–9): logic, comparison, date ordering,
 * and the money/percentage arithmetic rules. Unknown
 * operators are compile errors.
 */
export const manifestOperators: ReadonlyArray<OperatorDef> =
  [
    defineOperator(
      "and",
      fixedSignature(
        [booleanType, booleanType],
        booleanType,
      ),
    ),
    defineOperator(
      "or",
      fixedSignature(
        [booleanType, booleanType],
        booleanType,
      ),
    ),
    defineOperator(
      "not",
      fixedSignature([booleanType], booleanType),
    ),
    defineOperator(
      ">=",
      fixedSignature(
        [decimalType, decimalType],
        booleanType,
      ),
    ),
    defineOperator(
      "<=",
      fixedSignature(
        [decimalType, decimalType],
        booleanType,
      ),
    ),
    defineOperator(
      ">",
      fixedSignature(
        [decimalType, decimalType],
        booleanType,
      ),
    ),
    defineOperator(
      "<",
      fixedSignature(
        [decimalType, decimalType],
        booleanType,
      ),
    ),
    defineOperator(
      "before",
      fixedSignature(
        [dateType, dateType],
        booleanType,
      ),
    ),
    equalsOperator,
    plusOperator,
    timesOperator,
  ];
