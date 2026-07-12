import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  primType,
  booleanType,
  integerType,
  decimalType,
  stringType,
  dateType,
  nominalType,
  paramType,
  isPrimType,
  isNominalType,
  isParamType,
  semTypeEquals,
  isAssignable,
  formatSemType,
} from "plgg-ir-language/domain/model/SemType";

test("constructors tag their variants", () =>
  all([
    check(
      isPrimType(primType("integer")),
      toBe(true),
    ),
    check(isPrimType(booleanType), toBe(true)),
    check(
      isNominalType(nominalType("client-id")),
      toBe(true),
    ),
    check(
      isParamType(paramType("money", ["JPY"])),
      toBe(true),
    ),
    check(isNominalType(dateType), toBe(false)),
    check(isParamType(stringType), toBe(false)),
  ]));

test("semTypeEquals compares shape, name, and tags", () =>
  all([
    check(
      semTypeEquals(integerType)(
        primType("integer"),
      ),
      toBe(true),
    ),
    check(
      semTypeEquals(integerType)(decimalType),
      toBe(false),
    ),
    check(
      semTypeEquals(nominalType("client-id"))(
        nominalType("client-id"),
      ),
      toBe(true),
    ),
    // domain distinctness over storage (design §8)
    check(
      semTypeEquals(nominalType("customer-id"))(
        nominalType("organization-id"),
      ),
      toBe(false),
    ),
    check(
      semTypeEquals(nominalType("client-id"))(
        stringType,
      ),
      toBe(false),
    ),
    check(
      semTypeEquals(integerType)(
        nominalType("integer"),
      ),
      toBe(false),
    ),
    check(
      semTypeEquals(paramType("money", ["JPY"]))(
        paramType("money", ["JPY"]),
      ),
      toBe(true),
    ),
    // Money<JPY> ≠ Money<USD> (design §8)
    check(
      semTypeEquals(paramType("money", ["JPY"]))(
        paramType("money", ["USD"]),
      ),
      toBe(false),
    ),
    check(
      semTypeEquals(paramType("money", ["JPY"]))(
        paramType("money", []),
      ),
      toBe(false),
    ),
    check(
      semTypeEquals(paramType("money", ["JPY"]))(
        paramType("weight", ["JPY"]),
      ),
      toBe(false),
    ),
    check(
      semTypeEquals(paramType("money", ["JPY"]))(
        integerType,
      ),
      toBe(false),
    ),
  ]));

test("isAssignable is equality plus integer→decimal", () =>
  all([
    check(
      isAssignable(integerType)(integerType),
      toBe(true),
    ),
    check(
      isAssignable(decimalType)(integerType),
      toBe(true),
    ),
    check(
      isAssignable(integerType)(decimalType),
      toBe(false),
    ),
    check(
      isAssignable(stringType)(integerType),
      toBe(false),
    ),
    check(
      isAssignable(nominalType("a"))(
        nominalType("b"),
      ),
      toBe(false),
    ),
  ]));

test("formatSemType renders diagnostics text", () =>
  all([
    check(
      formatSemType(integerType),
      toBe("integer"),
    ),
    check(
      formatSemType(nominalType("client-id")),
      toBe("client-id"),
    ),
    check(
      formatSemType(paramType("money", ["JPY"])),
      toBe("(money JPY)"),
    ),
  ]));
