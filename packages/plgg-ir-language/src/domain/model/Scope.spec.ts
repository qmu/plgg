import {
  test,
  check,
  all,
  toEqual,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test";
import { some, none, pipe } from "plgg";
import {
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import { integerType } from "plgg-ir-language/domain/model/SemType";
import {
  binding,
  rootScope,
  childScope,
  lookup,
  lookupValue,
  mergeBindings,
} from "plgg-ir-language/domain/model/Scope";

const at = (offset: number) =>
  sourceRange(
    sourcePos(offset, 1, offset + 1),
    sourcePos(offset + 1, 1, offset + 2),
  );

const age = binding(
  "field",
  "age",
  some(integerType),
  at(0),
);

const client = binding(
  "entity",
  "client",
  none(),
  at(5),
);

test("lookup resolves by kind and name", () =>
  all([
    check(
      pipe(
        rootScope([age, client]),
        lookup("field", "age"),
      ),
      shouldBeSome(),
    ),
    // kinds are not interchangeable (design §36.4)
    check(
      pipe(
        rootScope([age, client]),
        lookup("entity", "age"),
      ),
      shouldBeNone(),
    ),
    check(
      pipe(
        rootScope([age]),
        lookup("field", "missing"),
      ),
      shouldBeNone(),
    ),
  ]));

test("lookup walks to the parent frame, innermost first", () =>
  all([
    check(
      pipe(
        childScope(rootScope([age]))([client]),
        lookup("field", "age"),
      ),
      shouldBeSome(),
    ),
    check(
      pipe(
        childScope(rootScope([age]))([
          binding("field", "age", none(), at(9)),
        ]),
        lookup("field", "age"),
      ),
      toEqual(
        some(
          binding("field", "age", none(), at(9)),
        ),
      ),
    ),
    check(
      pipe(
        childScope(rootScope([]))([]),
        lookup("field", "age"),
      ),
      shouldBeNone(),
    ),
  ]));

test("lookupValue resolves by name regardless of kind", () =>
  all([
    check(
      pipe(rootScope([age]), lookupValue("age")),
      shouldBeSome(),
    ),
    check(
      pipe(
        childScope(rootScope([client]))([]),
        lookupValue("client"),
      ),
      shouldBeSome(),
    ),
    check(
      pipe(
        rootScope([age]),
        lookupValue("missing"),
      ),
      shouldBeNone(),
    ),
  ]));

test("mergeBindings keeps uniques and diagnoses duplicates", () =>
  all([
    check(
      mergeBindings([age, client]).bindings,
      toEqual([age, client]),
    ),
    check(
      mergeBindings([age, client]).diagnostics,
      toEqual([]),
    ),
    check(
      mergeBindings([
        age,
        binding("field", "age", none(), at(9)),
      ]).diagnostics.map((d) => [
        d.code,
        d.range.start.offset,
        d.related.map(
          (r) => r.range.start.offset,
        ),
      ]),
      toEqual([
        ["language.duplicate-name", 9, [0]],
      ]),
    ),
    // same name under different kinds is no duplicate
    check(
      mergeBindings([
        age,
        binding("entity", "age", none(), at(9)),
      ]).diagnostics,
      toEqual([]),
    ),
  ]));
