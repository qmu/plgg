import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toHaveLength,
  someThen,
  shouldBeNone,
  okThen,
  errThen,
} from "plgg-test";
import {
  Option,
  some,
  none,
  isSome,
  isNone,
  isOption,
  mapOption,
  applyOption,
  ofOption,
  chainOption,
  fromNullable,
  getOr,
  toOption,
  matchOption,
  okOr,
  ok,
  err,
  pipe,
} from "plgg/index";

test("some creates Some option", () => {
  const result = some(42);
  return all([
    check(result.__tag, toBe("Some")),
    check(result, someThen(toBe(42))),
  ]);
});

test("some creates Some option with string", () => {
  const result = some("hello");
  return all([
    check(result.__tag, toBe("Some")),
    check(result, someThen(toBe("hello"))),
  ]);
});

test("some creates Some option with object", () => {
  const obj = { name: "test", age: 25 };
  const result = some(obj);
  return all([
    check(result.__tag, toBe("Some")),
    check(
      result,
      someThen((c) =>
        all([
          check(c, toBe(obj)),
          check(c.name, toBe("test")),
          check(c.age, toBe(25)),
        ]),
      ),
    ),
  ]);
});

test("some creates Some option with null", () => {
  const result = some(null);
  return all([
    check(result.__tag, toBe("Some")),
    check(result, someThen(toBe(null))),
  ]);
});

test("some creates Some option with undefined", () => {
  const result = some(undefined);
  return all([
    check(result.__tag, toBe("Some")),
    check(result, someThen(toBe(undefined))),
  ]);
});

test("none creates None option", () => {
  const result = none();
  return all([
    check(result.__tag, toBe("None")),
    check(isNone(result), toBe(true)),
  ]);
});

test("none creates None option with type parameter", () => {
  const result = none();
  return all([
    check(result.__tag, toBe("None")),
    check(isNone(result), toBe(true)),
  ]);
});

test("isSome identifies Some options", () => {
  const someResult = some("content");
  const noneResult = none();
  return all([
    check(isSome(someResult), toBe(true)),
    check(isSome(noneResult), toBe(false)),
  ]);
});

test("isNone identifies None options", () => {
  const someResult = some("content");
  const noneResult = none();
  return all([
    check(isNone(someResult), toBe(false)),
    check(isNone(noneResult), toBe(true)),
  ]);
});

test("isSome() function returns true for Some instances", () => {
  const someOption = some("value");
  return all([
    check(isSome(someOption), toBe(true)),
    check(isNone(someOption), toBe(false)),
    check(someOption, someThen(toBe("value"))),
  ]);
});

test("isNone() function returns true for None instances", () => {
  const noneOption = none();
  return all([
    check(isSome(noneOption), toBe(false)),
    check(isNone(noneOption), toBe(true)),
    check(noneOption.__tag, toBe("None")),
  ]);
});

test("isSome and isNone functions work with Option union type", () => {
  const someOption: Option<number> = some(42);
  const noneOption: Option<number> = none();
  return all([
    check(isSome(someOption), toBe(true)),
    check(isNone(someOption), toBe(false)),
    check(someOption, someThen(toBe(42))),
    check(isSome(noneOption), toBe(false)),
    check(isNone(noneOption), toBe(true)),
    check(noneOption, shouldBeNone()),
  ]);
});

test("Option can handle different types", () => {
  const stringOption: Option<string> =
    some("hello");
  const numberOption: Option<number> = some(42);
  const noneStringOption: Option<string> = none();
  const noneNumberOption: Option<number> = none();
  return all([
    check(isSome(stringOption), toBe(true)),
    check(isSome(numberOption), toBe(true)),
    check(isNone(noneStringOption), toBe(true)),
    check(isNone(noneNumberOption), toBe(true)),
    check(stringOption, someThen(toBe("hello"))),
    check(numberOption, someThen(toBe(42))),
  ]);
});

test("Option type structure", () => {
  const someOption = some(123);
  const noneOption = none();
  return all([
    check(someOption.__tag, toBe("Some")),
    check(someOption.content, toBe(123)),
    check(noneOption.__tag, toBe("None")),
  ]);
});

test("Option with complex types", () => {
  interface User {
    id: number;
    name: string;
    email?: string;
  }

  const user: User = {
    id: 1,
    name: "John",
    email: "john@example.com",
  };
  const userOption = some(user);
  const noUserOption = none();
  return all([
    check(isSome(userOption), toBe(true)),
    check(isNone(noUserOption), toBe(true)),
    check(
      userOption,
      someThen((c) =>
        all([
          check(c.id, toBe(1)),
          check(c.name, toBe("John")),
          check(
            c.email,
            toBe("john@example.com"),
          ),
        ]),
      ),
    ),
  ]);
});

test("Option with array contents", () => {
  const numbers = [1, 2, 3, 4, 5];
  const arrayOption = some(numbers);
  const emptyArrayOption = some([]);
  const noneArrayOption = none();
  return all([
    check(isSome(arrayOption), toBe(true)),
    check(isSome(emptyArrayOption), toBe(true)),
    check(isNone(noneArrayOption), toBe(true)),
    check(
      arrayOption,
      someThen((c) =>
        all([
          check(c, toEqual([1, 2, 3, 4, 5])),
          check(c, toHaveLength(5)),
        ]),
      ),
    ),
    check(
      emptyArrayOption,
      someThen((c) =>
        all([
          check(c, toEqual([])),
          check(c, toHaveLength(0)),
        ]),
      ),
    ),
  ]);
});

test("Option with boolean contents", () => {
  const trueOption = some(true);
  const falseOption = some(false);
  const noneBoolOption = none();
  return all([
    check(isSome(trueOption), toBe(true)),
    check(isSome(falseOption), toBe(true)),
    check(isNone(noneBoolOption), toBe(true)),
    check(trueOption, someThen(toBe(true))),
    check(falseOption, someThen(toBe(false))),
  ]);
});

test("Option with zero contents", () => {
  const zeroOption = some(0);
  const emptyStringOption = some("");
  return all([
    check(isSome(zeroOption), toBe(true)),
    check(isSome(emptyStringOption), toBe(true)),
    check(zeroOption, someThen(toBe(0))),
    check(emptyStringOption, someThen(toBe(""))),
  ]);
});

test("Option Monad - map function", () => {
  const double = (x: number) => x * 2;
  const someNumber = some(5);
  const noneNumber = none();

  const r1 = pipe(someNumber, mapOption(double));
  const r2 = pipe(noneNumber, mapOption(double));
  return all([
    check(r1, someThen(toBe(10))),
    check(isNone(r2), toBe(true)),
  ]);
});

test("Option Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const someAdd3 = some(add(3));
  const someNumber = some(5);
  const noneAdd = none();
  const noneNumber = none();

  const r1 = pipe(
    someNumber,
    applyOption(someAdd3),
  );
  const r2 = pipe(
    someNumber,
    applyOption(noneAdd),
  );
  const r3 = pipe(
    noneNumber,
    applyOption(someAdd3),
  );
  const r4 = pipe(
    noneNumber,
    applyOption(noneAdd),
  );
  return all([
    check(r1, someThen(toBe(8))),
    check(isNone(r2), toBe(true)),
    check(isNone(r3), toBe(true)),
    check(isNone(r4), toBe(true)),
  ]);
});

test("Option Monad - of function", () => {
  const r1 = pipe(42, ofOption);
  const r2 = pipe("hello", ofOption);
  const r3 = pipe(null, ofOption);
  return all([
    check(r1, someThen(toBe(42))),
    check(r2, someThen(toBe("hello"))),
    check(r3, someThen(toBe(null))),
  ]);
});

test("Option Monad - chain function", () => {
  const safeDivide =
    (y: number) =>
    (x: number): Option<number> =>
      y === 0 ? none() : some(x / y);

  const someNumber = some(10);
  const noneNumber = none();

  const r1 = pipe(
    someNumber,
    chainOption(safeDivide(2)),
  );
  const r2 = pipe(
    someNumber,
    chainOption(safeDivide(0)),
  );
  const r3 = pipe(
    noneNumber,
    chainOption(safeDivide(2)),
  );
  return all([
    check(r1, someThen(toBe(5))),
    check(isNone(r2), toBe(true)),
    check(isNone(r3), toBe(true)),
  ]);
});

test("Option Monad Laws - Left Identity", () => {
  const f = (x: number): Option<number> =>
    some(x * 2);
  const a = 5;

  const r1 = pipe(a, ofOption, chainOption(f));
  const r2 = f(a);
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    isSome(r1) && isSome(r2)
      ? check(r1.content, toEqual(r2.content))
      : check(true, toBe(true)),
  ]);
});

test("Option Monad Laws - Right Identity", () => {
  const m = some(42);

  const r1 = pipe(m, chainOption(ofOption));
  const r2 = m;
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    isSome(r1) && isSome(r2)
      ? check(r1.content, toEqual(r2.content))
      : check(true, toBe(true)),
  ]);
});

test("Option Monad Laws - Associativity", () => {
  const f = (x: number): Option<number> =>
    some(x + 1);
  const g = (x: number): Option<number> =>
    some(x * 2);
  const m = some(5);

  const r1 = pipe(
    m,
    chainOption(f),
    chainOption(g),
  );
  const r2 = pipe(
    m,
    chainOption((x: number) =>
      pipe(x, f, chainOption(g)),
    ),
  );
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    isSome(r1) && isSome(r2)
      ? check(r1.content, toEqual(r2.content))
      : check(true, toBe(true)),
  ]);
});

test("Option Functor Laws - Identity", () => {
  const opt = some(42);
  const identity = <T>(x: T) => x;

  const r1 = pipe(opt, mapOption(identity));
  return all([
    check(r1.__tag, toBe(opt.__tag)),
    isSome(r1) && isSome(opt)
      ? check(r1.content, toEqual(opt.content))
      : check(true, toBe(true)),
  ]);
});

test("Option Functor Laws - Composition", () => {
  const opt = some(5);
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    opt,
    mapOption((x: number) => g(f(x))),
  );
  const r2 = pipe(
    opt,
    mapOption(f),
    mapOption(g),
  );
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    isSome(r1) && isSome(r2)
      ? check(r1.content, toEqual(r2.content))
      : check(true, toBe(true)),
  ]);
});

test("isOption - type guard for Option types", () => {
  const someValue = some(42);
  const someString = some("hello");
  const noneValue = none();
  return all([
    check(isOption(someValue), toBe(true)),
    check(isOption(someString), toBe(true)),
    check(isOption(noneValue), toBe(true)),
    check(isOption(42), toBe(false)),
    check(isOption("string"), toBe(false)),
    check(isOption(null), toBe(false)),
    check(isOption(undefined), toBe(false)),
    check(isOption({}), toBe(false)),
    check(isOption([]), toBe(false)),
  ]);
});

test("fromNullable wraps non-nullish values in Some", () => {
  const s = fromNullable("x");
  return all([
    check(s, someThen(toBe("x"))),
    check(isSome(fromNullable(0)), toBe(true)),
    check(isSome(fromNullable("")), toBe(true)),
  ]);
});

test("fromNullable maps null and undefined to None", () =>
  all([
    check(isNone(fromNullable(null)), toBe(true)),
    check(
      isNone(fromNullable(undefined)),
      toBe(true),
    ),
  ]));

test("getOr returns the contained value or the fallback", () =>
  all([
    check(pipe(some(7), getOr(0)), toBe(7)),
    check(pipe(none(), getOr(0)), toBe(0)),
  ]));

test("toOption keeps Ok content and drops Err", () => {
  const s = toOption(ok(42));
  return all([
    check(s, someThen(toBe(42))),
    check(
      isNone(toOption(err("boom"))),
      toBe(true),
    ),
  ]);
});

test("matchOption folds both cases into one value", () => {
  const label = matchOption(
    () => "none",
    (n: number) => `some:${n}`,
  );
  return all([
    check(pipe(some(7), label), toBe("some:7")),
    check(pipe(none(), label), toBe("none")),
  ]);
});

test("okOr turns Some into Ok and None into Err", () => {
  const present = pipe(some(7), okOr("missing"));
  const absent = pipe(none(), okOr("missing"));
  return all([
    check(present, okThen(toBe(7))),
    check(absent, errThen(toBe("missing"))),
  ]);
});
