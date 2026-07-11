import {
  test,
  check,
  all,
  toEqual,
  okThen,
  shouldBeErr,
} from "plgg-test";
import { err } from "plgg";
import {
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  SemType,
  booleanType,
  integerType,
  decimalType,
  stringType,
  dateType,
  nominalType,
  paramType,
  OperatorDef,
  semError,
} from "plgg-ir-language";
import { manifestOperators } from "plgg-ir-manifest/domain/usecase/operators";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * The registered operator named `name` (a dummy
 * always-failing operator when absent — surfaces as a
 * test failure).
 */
const op = (name: string): OperatorDef =>
  manifestOperators
    .filter((o) => o.name === name)
    .reduce<OperatorDef>((_, o) => o, {
      name: "missing",
      check: (_args, range) =>
        err([
          semError(
            "test.missing-operator",
            `operator ${name} is not registered`,
            range,
          ),
        ]),
    });

const jpy = paramType("money", ["JPY"]);
const usd = paramType("money", ["USD"]);
const pct = nominalType("percentage");

test("logic and comparison operators type to boolean", () =>
  all([
    check(
      op("and").check(
        [booleanType, booleanType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op("or").check(
        [booleanType, booleanType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op("not").check([booleanType], at),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op(">=").check(
        [integerType, integerType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op("<=").check(
        [decimalType, integerType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op(">").check(
        [integerType, integerType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op("<").check(
        [integerType, integerType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    check(
      op("before").check(
        [dateType, dateType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    // string used as boolean is rejected (§8)
    check(
      op("and").check(
        [stringType, booleanType],
        at,
      ),
      shouldBeErr(),
    ),
    check(
      op(">=").check(
        [stringType, integerType],
        at,
      ),
      shouldBeErr(),
    ),
  ]));

test("= requires one shared semantic type (§8)", () =>
  all([
    check(
      op("=").check(
        [
          nominalType("customer-id"),
          nominalType("customer-id"),
        ],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(booleanType)),
      ),
    ),
    // customer-id ≠ organization-id even if both
    // are stored as strings
    check(
      op("=").check(
        [
          nominalType("customer-id"),
          nominalType("organization-id"),
        ],
        at,
      ),
      shouldBeErr(),
    ),
    check(
      op("=").check([booleanType], at),
      shouldBeErr(),
    ),
  ]));

test("+ preserves money currency and rejects mixes (§8)", () =>
  all([
    check(
      op("+").check([jpy, jpy], at),
      okThen((t: SemType) =>
        check(t, toEqual(jpy)),
      ),
    ),
    // Money<JPY> + Money<USD> is rejected
    check(
      op("+").check([jpy, usd], at),
      shouldBeErr(),
    ),
    check(
      op("+").check(
        [integerType, integerType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(integerType)),
      ),
    ),
    check(
      op("+").check(
        [integerType, decimalType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(decimalType)),
      ),
    ),
    // Date + Money is rejected
    check(
      op("+").check([dateType, jpy], at),
      shouldBeErr(),
    ),
  ]));

test("* implements Money<C> × Percentage → Money<C> (§8)", () =>
  all([
    check(
      op("*").check([jpy, pct], at),
      okThen((t: SemType) =>
        check(t, toEqual(jpy)),
      ),
    ),
    check(
      op("*").check([usd, pct], at),
      okThen((t: SemType) =>
        check(t, toEqual(usd)),
      ),
    ),
    check(
      op("*").check([jpy, usd], at),
      shouldBeErr(),
    ),
    check(
      op("*").check(
        [decimalType, integerType],
        at,
      ),
      okThen((t: SemType) =>
        check(t, toEqual(decimalType)),
      ),
    ),
    check(
      op("*").check([pct, jpy], at),
      shouldBeErr(),
    ),
  ]));
