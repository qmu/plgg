import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import { sourceRange } from "plgg-ir-syntax/domain/model/SourceRange";
import {
  Sexp,
  symbolExp,
  strExp,
  numExp,
  boolExp,
  listExp,
  sexpsEqual,
} from "plgg-ir-syntax/domain/model/Sexp";
import { parseSexps } from "plgg-ir-syntax/domain/usecase/parseSexps";
import {
  printSexp,
  printSexps,
} from "plgg-ir-syntax/domain/usecase/printSexp";

/**
 * A placeholder range — printing never reads ranges.
 */
const R = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(0, 1, 1),
);

test("atoms print canonically", () =>
  all([
    check(
      printSexp(symbolExp("entity", R)),
      toBe("entity"),
    ),
    check(printSexp(numExp(1.5, R)), toBe("1.5")),
    check(printSexp(numExp(-0, R)), toBe("0")),
    check(
      printSexp(boolExp(true, R)),
      toBe("true"),
    ),
    check(
      printSexp(boolExp(false, R)),
      toBe("false"),
    ),
    check(
      printSexp(strExp("plain", R)),
      toBe('"plain"'),
    ),
    check(
      printSexp(strExp('a"b\\c\nd\te\rf', R)),
      toBe('"a\\"b\\\\c\\nd\\te\\rf"'),
    ),
  ]));

test("a list of only atoms prints inline", () =>
  all([
    check(printSexp(listExp([], R)), toBe("()")),
    check(
      printSexp(
        listExp(
          [
            symbolExp("length-between", R),
            numExp(1, R),
            numExp(200, R),
          ],
          R,
        ),
      ),
      toBe("(length-between 1 200)"),
    ),
  ]));

test("nested lists print in the design document layout", () =>
  check(
    printSexp(
      listExp(
        [
          symbolExp("field", R),
          symbolExp("name", R),
          listExp(
            [
              symbolExp("type", R),
              symbolExp("string", R),
            ],
            R,
          ),
          listExp(
            [
              symbolExp("validate", R),
              listExp(
                [symbolExp("required", R)],
                R,
              ),
              listExp(
                [
                  symbolExp("length-between", R),
                  numExp(1, R),
                  numExp(200, R),
                ],
                R,
              ),
            ],
            R,
          ),
        ],
        R,
      ),
    ),
    toBe(
      "(field name\n" +
        "  (type string)\n" +
        "  (validate\n" +
        "    (required)\n" +
        "    (length-between 1 200)))",
    ),
  ));

test("a list starting with a list still prints", () =>
  check(
    printSexp(
      listExp(
        [
          listExp([symbolExp("a", R)], R),
          symbolExp("b", R),
        ],
        R,
      ),
    ),
    toBe("(\n  (a)\n  b)"),
  ));

test("printSexps separates top-level forms with a blank line", () =>
  check(
    printSexps([
      listExp([symbolExp("a", R)], R),
      symbolExp("b", R),
    ]),
    toBe("(a)\n\nb"),
  ));

test("print then parse recovers the same tree", () =>
  check(
    parseSexps(
      printSexp(
        listExp(
          [
            symbolExp("entity", R),
            strExp('quo"te\n', R),
            numExp(3.14, R),
            boolExp(false, R),
            listExp([], R),
          ],
          R,
        ),
      ),
    ),
    okThen((exprs) =>
      check(
        sexpsEqual(exprs)([
          listExp(
            [
              symbolExp("entity", R),
              strExp('quo"te\n', R),
              numExp(3.14, R),
              boolExp(false, R),
              listExp([], R),
            ],
            R,
          ),
        ]),
        toBe(true),
      ),
    ),
  ));

/**
 * A tiny deterministic PRNG (LCG) so the property
 * corpus is stable across runs. The pre-modulo keeps
 * the product inside safe-integer range.
 */
const nextSeed = (seed: number): number =>
  ((seed % 4294967296) * 1664525 + 1013904223) %
  4294967296;

/**
 * Picks a bounded integer from a seed.
 */
const pick = (seed: number, n: number): number =>
  seed % n;

/**
 * Picks one element of a non-empty pool by seed —
 * slice-pairing so no index read can be `undefined`.
 */
const cycle = <A>(
  pool: ReadonlyArray<A>,
  seed: number,
  fallback: A,
): A =>
  pool
    .slice(
      pick(seed, pool.length),
      pick(seed, pool.length) + 1,
    )
    .reduce((_, v) => v, fallback);

const SYMBOLS: ReadonlyArray<string> = [
  "entity",
  "field",
  "length-between",
  ">=",
  "task.project",
  "money-JPY",
  "a",
  "-",
];

const STRINGS: ReadonlyArray<string> = [
  "",
  "plain",
  'with "quotes"',
  "back\\slash",
  "line\nbreak",
  "tab\the",
  "日本語",
];

const NUMBERS: ReadonlyArray<number> = [
  0, 1, -2, 3.14, 200, -0.5, 100000, 0.005,
];

/**
 * Generates one deterministic {@link Sexp} from a
 * seed; lists shrink toward atoms as depth grows so
 * generation terminates.
 */
const genSexp = (
  seed: number,
  depth: number,
): Sexp =>
  pipe(
    pick(seed, depth > 2 ? 4 : 5),
    (kind: number) =>
      kind === 0
        ? symbolExp(
            cycle(SYMBOLS, nextSeed(seed), "a"),
            R,
          )
        : kind === 1
          ? strExp(
              cycle(STRINGS, nextSeed(seed), ""),
              R,
            )
          : kind === 2
            ? numExp(
                cycle(NUMBERS, nextSeed(seed), 0),
                R,
              )
            : kind === 3
              ? boolExp(
                  pick(nextSeed(seed), 2) === 0,
                  R,
                )
              : listExp(
                  Array.from(
                    {
                      length: pick(
                        nextSeed(seed),
                        4,
                      ),
                    },
                    (_, i) =>
                      genSexp(
                        nextSeed(seed + i * 7919),
                        depth + 1,
                      ),
                  ),
                  R,
                ),
  );

test("property: parse(print(tree)) is the same tree", () =>
  all(
    Array.from({ length: 60 }, (_, i) =>
      pipe(
        genSexp(nextSeed(i * 2654435761), 0),
        (tree: Sexp) =>
          check(
            pipe(
              parseSexps(printSexp(tree)),
              matchResult(
                (): boolean => false,
                (
                  exprs: ReadonlyArray<Sexp>,
                ): boolean =>
                  sexpsEqual(exprs)([tree]),
              ),
            ),
            toBe(true),
          ),
      ),
    ),
  ));

test("property: parse(print(parse(x))) = parse(x) and printing is idempotent", () =>
  all(
    Array.from({ length: 40 }, (_, i) =>
      pipe(
        printSexps([
          genSexp(nextSeed(i * 97 + 13), 0),
          genSexp(nextSeed(i * 193 + 7), 0),
        ]),
        (source: string) =>
          check(
            pipe(
              parseSexps(source),
              matchResult(
                (): boolean => false,
                (
                  first: ReadonlyArray<Sexp>,
                ): boolean =>
                  pipe(
                    parseSexps(printSexps(first)),
                    matchResult(
                      (): boolean => false,
                      (
                        second: ReadonlyArray<Sexp>,
                      ): boolean =>
                        sexpsEqual(first)(
                          second,
                        ) &&
                        printSexps(first) ===
                          printSexps(second),
                    ),
                  ),
              ),
            ),
            toBe(true),
          ),
      ),
    ),
  ));

test("round-trips the thesis dialect reference example", () =>
  check(
    pipe(
      parseSexps(`(主張 撤退論
  :ロジック 因果的
  :ルート (概念 撤退判断)
  (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減))
  (関係 r2 :接続元 (概念 売上減) :接続先 (概念 撤退判断))
  (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 (遮断 前提→ルート)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))`),
      matchResult(
        (): boolean => false,
        (first: ReadonlyArray<Sexp>): boolean =>
          pipe(
            parseSexps(printSexps(first)),
            matchResult(
              (): boolean => false,
              (
                second: ReadonlyArray<Sexp>,
              ): boolean =>
                sexpsEqual(first)(second) &&
                printSexps(first) ===
                  printSexps(second),
            ),
          ),
      ),
    ),
    toBe(true),
  ));
