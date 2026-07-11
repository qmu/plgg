import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import { sourceRange } from "plgg-ir-syntax/domain/model/SourceRange";
import {
  Sexp,
  symbolExp,
  strExp,
  numExp,
  boolExp,
  listExp,
  isSymbolExp,
  isStrExp,
  isNumExp,
  isBoolExp,
  isListExp,
  sexpRange,
  sexpEquals,
  sexpsEqual,
} from "plgg-ir-syntax/domain/model/Sexp";

const rangeA = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

const rangeB = sourceRange(
  sourcePos(9, 2, 3),
  sourcePos(12, 2, 6),
);

test("constructors tag their variants", () =>
  all([
    check(
      isSymbolExp(symbolExp("entity", rangeA)),
      toBe(true),
    ),
    check(
      isStrExp(strExp("hello", rangeA)),
      toBe(true),
    ),
    check(
      isNumExp(numExp(42, rangeA)),
      toBe(true),
    ),
    check(
      isBoolExp(boolExp(true, rangeA)),
      toBe(true),
    ),
    check(
      isListExp(listExp([], rangeA)),
      toBe(true),
    ),
    check(
      isSymbolExp(numExp(42, rangeA)),
      toBe(false),
    ),
    check(
      isListExp(symbolExp("x", rangeA)),
      toBe(false),
    ),
  ]));

test("sexpRange reads any variant's range", () =>
  all([
    check(
      sexpRange(symbolExp("a", rangeA)),
      toEqual(rangeA),
    ),
    check(
      sexpRange(strExp("s", rangeB)),
      toEqual(rangeB),
    ),
    check(
      sexpRange(numExp(1, rangeA)),
      toEqual(rangeA),
    ),
    check(
      sexpRange(boolExp(false, rangeB)),
      toEqual(rangeB),
    ),
    check(
      sexpRange(listExp([], rangeA)),
      toEqual(rangeA),
    ),
  ]));

test("sexpEquals ignores ranges and compares structure", () =>
  all([
    check(
      sexpEquals(symbolExp("a", rangeA))(
        symbolExp("a", rangeB),
      ),
      toBe(true),
    ),
    check(
      sexpEquals(strExp("s", rangeA))(
        strExp("s", rangeB),
      ),
      toBe(true),
    ),
    check(
      sexpEquals(numExp(1.5, rangeA))(
        numExp(1.5, rangeB),
      ),
      toBe(true),
    ),
    check(
      sexpEquals(boolExp(true, rangeA))(
        boolExp(true, rangeB),
      ),
      toBe(true),
    ),
    check(
      sexpEquals(
        listExp(
          [
            symbolExp("a", rangeA),
            numExp(2, rangeA),
          ],
          rangeA,
        ),
      )(
        listExp(
          [
            symbolExp("a", rangeB),
            numExp(2, rangeB),
          ],
          rangeB,
        ),
      ),
      toBe(true),
    ),
  ]));

test("sexpEquals distinguishes values and kinds", () =>
  all([
    check(
      sexpEquals(symbolExp("a", rangeA))(
        symbolExp("b", rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(symbolExp("a", rangeA))(
        strExp("a", rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(strExp("s", rangeA))(
        symbolExp("s", rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(numExp(1, rangeA))(
        numExp(2, rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(numExp(1, rangeA))(
        boolExp(true, rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(boolExp(true, rangeA))(
        boolExp(false, rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(boolExp(true, rangeA))(
        listExp([], rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(listExp([], rangeA))(
        symbolExp("x", rangeA),
      ),
      toBe(false),
    ),
    check(
      sexpEquals(
        listExp([symbolExp("a", rangeA)], rangeA),
      )(
        listExp([symbolExp("b", rangeA)], rangeA),
      ),
      toBe(false),
    ),
  ]));

test("sexpsEqual compares sequences pairwise, ignoring ranges", () =>
  all([
    check(
      sexpsEqual([symbolExp("a", rangeA)])([
        symbolExp("a", rangeB),
      ]),
      toBe(true),
    ),
    check(sexpsEqual([])([]), toBe(true)),
    check(
      sexpsEqual([symbolExp("a", rangeA)])([]),
      toBe(false),
    ),
    check(
      sexpsEqual([symbolExp("a", rangeA)])([
        symbolExp("b", rangeB),
      ]),
      toBe(false),
    ),
  ]));

test("nested trees compare deeply", () => {
  const tree = (name: string, n: number): Sexp =>
    listExp(
      [
        symbolExp("field", rangeA),
        symbolExp(name, rangeA),
        listExp(
          [
            symbolExp("length-between", rangeA),
            numExp(n, rangeA),
            numExp(200, rangeA),
          ],
          rangeA,
        ),
      ],
      rangeA,
    );
  return all([
    check(
      sexpEquals(tree("name", 1))(
        tree("name", 1),
      ),
      toBe(true),
    ),
    check(
      sexpEquals(tree("name", 1))(
        tree("name", 2),
      ),
      toBe(false),
    ),
  ]);
});
