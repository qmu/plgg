import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  isRawObj,
  asRawObj,
  mapRawObj,
  applyRawObj,
  ofRawObj,
  chainRawObj,
  foldrRawObj,
  foldlRawObj,
  traverseRawObj,
  sequenceRawObj,
  mutRecApplicative,
  pipe,
} from "plgg/index";

/**
 * Validates isMutRec type guard for various value types.
 */
test("isMutRec type guard", () =>
  all([
    check(isRawObj({}), toBe(true)),
    check(isRawObj({ a: 1 }), toBe(true)),
    check(
      isRawObj({ a: "test", b: 123, c: true }),
      toBe(true),
    ),
    check(isRawObj([]), toBe(true)), // Arrays are records in JavaScript runtime
    check(isRawObj(null), toBe(false)),
    check(isRawObj(undefined), toBe(false)),
    check(isRawObj("string"), toBe(false)),
    check(isRawObj(123), toBe(false)),
    check(isRawObj(true), toBe(false)),
  ]));

/**
 * Tests asRawObj validation for records and non-record types.
 */
test("asRawObj validation", async () =>
  all([
    check(asRawObj({}), okThen(toEqual({}))),
    check(
      asRawObj({ a: 1, b: "test" }),
      okThen(toEqual({ a: 1, b: "test" })),
    ),
    check(
      asRawObj([1, 2, 3]),
      okThen(toEqual([1, 2, 3])),
    ),
    check(
      asRawObj(null),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
    check(
      asRawObj(undefined),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
    check(
      asRawObj("test"),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
    check(
      asRawObj(123),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
  ]));

/**
 * Tests mutable record mapping functionality through Functor instance.
 */
test("mapRawObj - Functor instance", () => {
  const rec = { x: 1, y: 2 };
  const double = (n: number) => n * 2;

  const result = pipe(
    rec,
    mapRawObj((o: typeof rec) => ({
      x: double(o.x),
      y: double(o.y),
    })),
  );

  const toString = (n: number) => n.toString();
  const stringResult = pipe(
    rec,
    mapRawObj((o: typeof rec) => ({
      x: toString(o.x),
      y: toString(o.y),
    })),
  );

  return all([
    check(result, toEqual({ x: 2, y: 4 })),
    check(
      stringResult,
      toEqual({ x: "1", y: "2" }),
    ),
  ]);
});

/**
 * Validates mutable record wrapping through Pointed instance.
 */
test("ofRawObj - Pointed instance", () => {
  const rec = { name: "test", value: 42 };
  const result = pipe(rec, ofRawObj);

  const primitiveRec = { count: 0 };
  const primitiveResult = pipe(
    primitiveRec,
    ofRawObj,
  );

  return all([
    check(result, toEqual(rec)),
    check(result, toBe(rec)),
    check(
      primitiveResult,
      toEqual(primitiveRec),
    ),
  ]);
});

/**
 * Tests function application over mutable records through Apply instance.
 */
test("applyRawObj - Apply instance", () => {
  const addValues = (rec: {
    a: number;
    b: number;
  }) => rec.a + rec.b;
  const rec = { a: 5, b: 3 };

  const result = pipe(
    rec,
    applyRawObj(addValues),
  );

  const transformRec = (rec: {
    name: string;
    age: number;
  }) => ({
    fullName: rec.name.toUpperCase(),
    isAdult: rec.age >= 18,
  });
  const personRec = { name: "alice", age: 25 };

  const transformResult = pipe(
    personRec,
    applyRawObj(transformRec),
  );

  return all([
    check(result, toBe(8)),
    check(
      transformResult,
      toEqual({
        fullName: "ALICE",
        isAdult: true,
      }),
    ),
  ]);
});

/**
 * Validates mutable record chaining operations through Chain instance.
 */
test("chainRawObj - Chain instance", () => {
  const rec = { value: 10 };

  const multiplyAndWrap = (o: typeof rec) => ({
    result: o.value * 2,
  });
  const result = pipe(
    rec,
    chainRawObj(multiplyAndWrap),
  );

  const addFieldsAndWrap = (o: {
    x: number;
  }) => ({
    original: o.x,
    doubled: o.x * 2,
    squared: o.x * o.x,
  });
  const numberRec = { x: 3 };
  const chainResult = pipe(
    numberRec,
    chainRawObj(addFieldsAndWrap),
  );

  return all([
    check(result, toEqual({ result: 20 })),
    check(
      chainResult,
      toEqual({
        original: 3,
        doubled: 6,
        squared: 9,
      }),
    ),
  ]);
});

/**
 * Tests right-to-left folding operations on mutable records.
 */
test("foldrRawObj - right fold", () => {
  const rec = { name: "Alice", age: 30 };

  const concatenateValues = (
    o: typeof rec,
    acc: string,
  ) => acc + JSON.stringify(o);
  const result = pipe(
    rec,
    foldrRawObj(concatenateValues)("start:"),
  );

  const sumNumericFields = (
    o: { a: number; b: number },
    acc: number,
  ) => acc + o.a + o.b;
  const numRec = { a: 5, b: 10 };
  const sumResult = pipe(
    numRec,
    foldrRawObj(sumNumericFields)(0),
  );

  return all([
    check(
      result,
      toBe('start:{"name":"Alice","age":30}'),
    ),
    check(sumResult, toBe(15)),
  ]);
});

/**
 * Tests left-to-right folding operations on mutable records.
 */
test("foldlRawObj - left fold", () => {
  const rec = { x: 2, y: 3 };

  const multiplyValues = (
    acc: number,
    o: typeof rec,
  ) => acc * o.x * o.y;
  const result = pipe(
    rec,
    foldlRawObj(multiplyValues)(1),
  );

  const appendrecord = (
    acc: string,
    o: { name: string },
  ) => acc + o.name;
  const nameRec = { name: "World" };
  const appendResult = pipe(
    nameRec,
    foldlRawObj(appendrecord)("Hello "),
  );

  return all([
    check(result, toBe(6)),
    check(appendResult, toBe("Hello World")),
  ]);
});

/**
 * Verifies traverseRawObj invokes Applicative.map over the input.
 */
test("traverseRawObj runs the function through the Applicative", () => {
  const input = { count: 10 };
  const doubled = traverseRawObj(
    mutRecApplicative,
  )((o: typeof input) => ({
    count: o.count * 2,
  }))(input);
  return check(doubled, toEqual({ count: 20 }));
});

/**
 * Verifies sequenceRawObj lifts the input through the Applicative.
 */
test("sequenceRawObj lifts the input record", () => {
  const input = { x: 1, y: 2 };
  const result = sequenceRawObj(
    mutRecApplicative,
  )(input);
  return check(result, toEqual(input));
});
