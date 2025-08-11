import { test, expect, assert } from "vitest";
import {
  isArr,
  every,
  asArr,
  isOk,
  isErr,
  isStr,
  isNum,
  mapArr,
  applyArr,
  ofArr,
  chainArr,
  pipe,
  traverseArr,
  sequenceArr,
  foldrArr,
  foldlArr,
  arrApplicative,
  optionApplicative,
  some,
  none,
  isSome,
  isNone,
  ok,
  err,
  Result,
} from "plgg/index";

test("Arr.is should return true for arrays", () => {
  expect(isArr([])).toBe(true);
  expect(isArr([1, 2, 3])).toBe(true);
  expect(isArr(["a", "b", "c"])).toBe(true);
  expect(isArr([1, "a", true, null])).toBe(true);
  expect(isArr(new Array(5))).toBe(true);
  expect(isArr(Array.from({ length: 3 }))).toBe(true);
});

test("Arr.is should return false for non-arrays", () => {
  expect(isArr(null)).toBe(false);
  expect(isArr(undefined)).toBe(false);
  expect(isArr({})).toBe(false);
  expect(isArr("array")).toBe(false);
  expect(isArr(123)).toBe(false);
  expect(isArr(true)).toBe(false);
  expect(isArr({ length: 0 })).toBe(false);
  expect(isArr("")).toBe(false);
});

test("Arr.cast should succeed for arrays", () => {
  const result1 = asArr([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = asArr([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.content).toEqual([1, 2, 3]);

  const result3 = asArr(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.content).toEqual(["a", "b", "c"]);

  const result4 = asArr([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.content).toEqual([1, "a", true, null]);
});

test("Arr.cast should fail for non-arrays", () => {
  const result1 = asArr(null);
  assert(isErr(result1));
  expect(result1.content.message).toBe("Value is not an array");

  const result2 = asArr(undefined);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Value is not an array");

  const result3 = asArr({});
  assert(isErr(result3));
  expect(result3.content.message).toBe("Value is not an array");

  const result4 = asArr("array");
  assert(isErr(result4));
  expect(result4.content.message).toBe("Value is not an array");

  const result5 = asArr(123);
  assert(isErr(result5));
  expect(result5.content.message).toBe("Value is not an array");
});

test("Arr.every should succeed when all elements match predicate", () => {
  const result1 = every(isStr)([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = every(isStr)(["a", "b", "c"]);
  assert(isOk(result2));
  expect(result2.content).toEqual(["a", "b", "c"]);

  const result3 = every(isNum)([1, 2, 3]);
  assert(isOk(result3));
  expect(result3.content).toEqual([1, 2, 3]);

  const result4 = every((x): x is string => typeof x === "string")([
    "hello",
    "world",
  ]);
  assert(isOk(result4));
  expect(result4.content).toEqual(["hello", "world"]);
});

test("Arr.every should fail when some elements don't match predicate", () => {
  const result1 = every(isStr)([1, 2, 3]);
  assert(isErr(result1));
  expect(result1.content.message).toBe("Array elements do not match predicate");

  const result2 = every(isStr)(["a", 1, "c"]);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Array elements do not match predicate");

  const result3 = every(isNum)(["a", "b", "c"]);
  assert(isErr(result3));
  expect(result3.content.message).toBe("Array elements do not match predicate");

  const result4 = every((x): x is number => typeof x === "number")([1, "2", 3]);
  assert(isErr(result4));
  expect(result4.content.message).toBe("Array elements do not match predicate");
});

test("Arr.every with complex predicates", () => {
  // Test with boolean predicate
  const isBool = (x: unknown): x is boolean => typeof x === "boolean";

  const result1 = every(isBool)([true, false, true]);
  assert(isOk(result1));
  expect(result1.content).toEqual([true, false, true]);

  const result2 = every(isBool)([true, "false", true]);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Array elements do not match predicate");

  // Test with null/undefined
  const isNotNull = (x: unknown): x is unknown => x != null;

  const result3 = every(isNotNull)([1, "a", true]);
  assert(isOk(result3));
  expect(result3.content).toEqual([1, "a", true]);

  const result4 = every(isNotNull)([1, null, true]);
  assert(isErr(result4));
  expect(result4.content.message).toBe("Array elements do not match predicate");
});

test("Arr Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapArr(double));
  const r2 = pipe([1, 2, 3], mapArr(double));
  const r3 = pipe([1, 2, 3], mapArr(toString));

  expect(r1).toEqual([]);
  expect(r2).toEqual([2, 4, 6]);
  expect(r3).toEqual(["1", "2", "3"]);
});

test("Arr Monad - of function", () => {
  const r1 = pipe(1, ofArr);
  const r2 = pipe("hello", ofArr);
  const r3 = pipe(null, ofArr);

  expect(r1).toEqual([1]);
  expect(r2).toEqual(["hello"]);
  expect(r3).toEqual([null]);
});

test("Arr Monad - chain function (flatMap)", () => {
  const duplicate = (x: number) => [x, x];
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);

  const r1 = pipe([], chainArr(duplicate));
  const r2 = pipe([1, 2, 3], chainArr(duplicate));
  const r3 = pipe([2, 3, 1], chainArr(range));

  expect(r1).toEqual([]);
  expect(r2).toEqual([1, 1, 2, 2, 3, 3]);
  expect(r3).toEqual([0, 1, 0, 1, 2, 0]);
});

test("Arr Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const multiply = (x: number) => (y: number) => x * y;
  const curryConcat = (a: string) => (b: string) => a + b;

  const r1 = pipe([1, 2], applyArr([add(1), multiply(2)]));
  const r2 = pipe([], applyArr([add(0)]));
  const r3 = pipe([1, 2], applyArr([]));
  const r4 = pipe(
    ["world", "there"],
    applyArr([curryConcat("hello "), curryConcat("hi ")]),
  );

  expect(r1).toEqual([2, 3, 2, 4]);
  expect(r2).toEqual([]);
  expect(r3).toEqual([]);
  expect(r4).toEqual(["hello world", "hello there", "hi world", "hi there"]);
});

test("Arr Monad Laws - Left Identity", () => {
  const f = (x: number) => [x, x * 2];
  const a = 5;

  const r1 = pipe(a, ofArr, chainArr(f));
  const r2 = f(a);

  expect(r1).toEqual(r2);
});

test("Arr Monad Laws - Right Identity", () => {
  const m = [1, 2, 3];

  const r1 = pipe(m, chainArr(ofArr));
  const r2 = m;

  expect(r1).toEqual(r2);
});

test("Arr Monad Laws - Associativity", () => {
  const f = (x: number) => [x, x + 1];
  const g = (x: number) => [x * 2];
  const m = [1, 2];

  const r1 = pipe(m, chainArr(f), chainArr(g));
  const r2 = pipe(
    m,
    chainArr((x: number) => pipe(x, f, chainArr(g))),
  );

  expect(r1).toEqual(r2);
});

test("Arr Functor Laws - Identity", () => {
  const arr = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(arr, mapArr(identity));

  expect(r1).toEqual(arr);
});

test("Arr Functor Laws - Composition", () => {
  const arr = [1, 2, 3];
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    arr,
    mapArr((x: number) => g(f(x))),
  );
  const r2 = pipe(arr, mapArr(f), mapArr(g));

  expect(r1).toEqual(r2);
});

test("Arr Foldable - foldr function", () => {
  const add = (x: number, acc: number) => x + acc;
  const concat = (x: string, acc: string) => x + acc;

  const r1 = pipe([], foldrArr(add)(0));
  const r2 = pipe([1, 2, 3], foldrArr(add)(0));
  const r3 = pipe(["a", "b", "c"], foldrArr(concat)(""));

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("Arr Foldable - foldl function", () => {
  const add = (acc: number, x: number) => acc + x;
  const concat = (acc: string, x: string) => acc + x;

  const r1 = pipe([], foldlArr(add)(0));
  const r2 = pipe([1, 2, 3], foldlArr(add)(0));
  const r3 = pipe(["a", "b", "c"], foldlArr(concat)(""));

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("Arr Traversable - traverse with Array", () => {
  const choices = (x: number) => [x, x + 10]; // gives each number two choices

  const r1 = pipe([], traverseArr(arrApplicative)(choices));
  expect(r1).toEqual([[]]);

  // For [1, 2] with choices (x => [x, x + 10]):
  // choices(1) = [1, 11], choices(2) = [2, 12]
  // traverse should give all combinations:
  // [1, 2], [1, 12], [11, 2], [11, 12]
  const r2 = pipe([1, 2], traverseArr(arrApplicative)(choices));
  expect(r2).toEqual([[1, 2], [1, 12], [11, 2], [11, 12]]);
});

test("Arr Traversable - sequence with Array", () => {
  const r1 = pipe([[1, 2], [3, 4]], sequenceArr(arrApplicative));
  expect(r1).toEqual([[1, 3], [1, 4], [2, 3], [2, 4]]);

  const r2 = pipe([], sequenceArr(arrApplicative));
  expect(r2).toEqual([[]]);

  const r3 = pipe([[]], sequenceArr(arrApplicative));
  expect(r3).toEqual([]);
});

test("Arr Traversable - collect results with Option (safe division)", () => {
  // Function that safely divides 10 by n, failing for zero or negative numbers
  const safeDivide = (n: number) => n > 0 ? some(10 / n) : none();

  // Success case: all divisions succeed, results collected into Some([...])
  const r1 = pipe([1, 2, 5], traverseArr(optionApplicative)(safeDivide));
  assert(isSome(r1));
  expect(r1.content).toEqual([10, 5, 2]);

  // Failure case: one division fails, entire traversal fails with None
  const r2 = pipe([1, 0, 5], traverseArr(optionApplicative)(safeDivide));
  assert(isNone(r2));

  // Edge case: empty array always succeeds
  const r3 = pipe([], traverseArr(optionApplicative)(safeDivide));
  assert(isSome(r3));
  expect(r3.content).toEqual([]);
});

test("Arr Traversable - collect results with Option (validation)", () => {
  // Function that validates and parses positive numbers from strings
  const parsePositive = (s: string) => {
    const num = Number(s);
    return isNaN(num) || num <= 0 ? none() : some(num);
  };

  // Success case: all strings are valid positive numbers
  const r1 = pipe(["1", "2.5", "42"], traverseArr(optionApplicative)(parsePositive));
  assert(isSome(r1));
  expect(r1.content).toEqual([1, 2.5, 42]);

  // Failure case: invalid number in array causes entire validation to fail
  const r2 = pipe(["1", "invalid", "42"], traverseArr(optionApplicative)(parsePositive));
  assert(isNone(r2));

  // Failure case: negative number causes validation to fail
  const r3 = pipe(["1", "-5", "42"], traverseArr(optionApplicative)(parsePositive));
  assert(isNone(r3));

  // Failure case: zero causes validation to fail (not positive)
  const r4 = pipe(["1", "0", "42"], traverseArr(optionApplicative)(parsePositive));
  assert(isNone(r4));
});

test("Arr Traversable - empty array edge cases", () => {
  // Empty arrays should always succeed regardless of the effectful function
  const alwaysFails = (_: unknown) => none();
  const maybeSucceeds = (x: number) => x > 0 ? some(x * 2) : none();

  // Even functions that always fail should succeed on empty arrays
  const r1 = pipe([], traverseArr(optionApplicative)(alwaysFails));
  assert(isSome(r1));
  expect(r1.content).toEqual([]);

  // Functions that might succeed should also work on empty arrays
  const r2 = pipe([], traverseArr(optionApplicative)(maybeSucceeds));
  assert(isSome(r2));
  expect(r2.content).toEqual([]);

  // This demonstrates that traverse respects the Applicative identity:
  // traverse(f, []) === pure([]) for any function f
});

test("Batch API requests with Result collection", () => {
  // Real scenario: Making multiple API calls and collecting all results or failing fast
  type User = { id: number; name: string };
  
  const fetchUser = (id: number): Result<User, string> => {
    if (id === 999) return err(`User ${id} not found`);
    if (id < 0) return err(`Invalid user ID: ${id}`);
    return ok({ id, name: `User${id}` });
  };

  // Success case: all API calls succeed, results collected into Some([User1, User2, User3])
  const userIds = [1, 2, 3];
  const result1 = pipe(userIds, traverseArr(optionApplicative)((id: number) => {
    const userResult = fetchUser(id);
    return isOk(userResult) ? some(userResult.content) : none();
  }));
  
  assert(isSome(result1));
  expect(result1.content).toHaveLength(3);
  expect(result1.content[0]).toEqual({ id: 1, name: "User1" });
  expect(result1.content[1]).toEqual({ id: 2, name: "User2" });
  expect(result1.content[2]).toEqual({ id: 3, name: "User3" });

  // Failure case: one API call fails, entire batch fails with None
  const failingIds = [1, 999, 3];
  const result2 = pipe(failingIds, traverseArr(optionApplicative)((id: number) => {
    const userResult = fetchUser(id);
    return isOk(userResult) ? some(userResult.content) : none();
  }));
  
  assert(isNone(result2));

  // Empty array case: succeeds with empty result
  const result3 = pipe([], traverseArr(optionApplicative)((id: number) => {
    const userResult = fetchUser(id);
    return isOk(userResult) ? some(userResult.content) : none();
  }));
  assert(isSome(result3));
  expect(result3.content).toEqual([]);
});

test("Config file validation pipeline", () => {
  // Real scenario: Validating configuration files and collecting all valid configs
  type Config = { service: string; port: number; enabled: boolean };
  
  const validateConfig = (raw: string): Result<Config, string> => {
    try {
      const data = JSON.parse(raw);
      if (!data.service || typeof data.port !== 'number') {
        return err("Invalid config format");
      }
      return ok({ 
        service: data.service, 
        port: data.port, 
        enabled: data.enabled || false 
      });
    } catch {
      return err("Invalid JSON");
    }
  };

  const configStrings = [
    '{"service":"auth","port":8080,"enabled":true}',
    '{"service":"db","port":5432}',
    '{"service":"cache","port":6379,"enabled":false}'
  ];

  // Success case: all configs valid
  const result1 = pipe(configStrings, traverseArr(optionApplicative)((config: string) => {
    const configResult = validateConfig(config);
    return isOk(configResult) ? some(configResult.content) : none();
  }));
  
  assert(isSome(result1));
  expect(result1.content).toHaveLength(3);
  const configs = result1.content;
  expect(configs[0]).toEqual({ service: "auth", port: 8080, enabled: true });
  expect(configs[1]).toEqual({ service: "db", port: 5432, enabled: false });
  expect(configs[2]).toEqual({ service: "cache", port: 6379, enabled: false });

  // Failure case: invalid config breaks the pipeline
  const invalidConfigs = [
    '{"service":"auth","port":8080}',
    'invalid json',
    '{"service":"cache","port":6379}'
  ];
  
  const result2 = pipe(invalidConfigs, traverseArr(optionApplicative)((config: string) => {
    const configResult = validateConfig(config);
    return isOk(configResult) ? some(configResult.content) : none();
  }));
  
  assert(isNone(result2));
});

