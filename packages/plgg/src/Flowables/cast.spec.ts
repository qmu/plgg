import {
  test,
  check,
  all,
  toBe,
  toBeInstanceOf,
  toBeGreaterThan,
  okThen,
  errThen,
} from "plgg-test";
import {
  Result,
  InvalidError,
  invalidError,
  SoftStr,
  Time,
  Num,
  Bool,
  cast,
  asObj,
  forProp,
  asNum,
  asTime,
  asSoftStr,
  asBool,
  ok,
  err,
  refine,
} from "plgg/index";

test("cast validates object structure with multiple properties", () => {
  // Example: Validating API response data
  type UserProfile = {
    id: Num;
    email: SoftStr;
    createdAt: Time;
  };

  const asUserProfile = (
    data: unknown,
  ): Result<UserProfile, InvalidError> =>
    cast(
      data,
      asObj,
      forProp("id", asNum),
      forProp("email", asSoftStr),
      forProp("createdAt", asTime),
    );

  const validData = {
    id: 123,
    email: "user@example.com",
    createdAt: "2023-10-01T12:00:00Z",
  };

  const result = asUserProfile(validData);
  return check(
    result,
    okThen((v) =>
      all([
        check(v.id, toBe(123)),
        check(v.email, toBe("user@example.com")),
        check(v.createdAt, toBeInstanceOf(Date)),
      ]),
    ),
  );
});

test("cast accumulates validation errors for multiple invalid properties", () => {
  type Product = {
    id: Num;
    name: SoftStr;
    price: Num;
  };

  const asProduct = (
    data: unknown,
  ): Result<Product, InvalidError> =>
    cast(
      data,
      asObj,
      forProp("id", asNum),
      forProp("name", asSoftStr),
      forProp("price", asNum),
    );

  const invalidData = {
    id: "not-a-number",
    name: 123, // should be string
    price: "not-a-number",
  };

  const result = asProduct(invalidData);
  return check(
    result,
    errThen((e) =>
      // All three properties failed
      check(e.content.sibling.length, toBe(3)),
    ),
  );
});

test("cast processes validation chain sequentially", () => {
  // Example: Form data processing with multiple validation steps
  const processFormData = (
    input: unknown,
  ): Result<{ username: string }, InvalidError> =>
    cast(
      input,
      asObj,
      forProp("username", (v) =>
        cast(
          v,
          asSoftStr,
          refine(
            (a) => a.trim().length >= 3,
            "Username too short",
          ),
        ),
      ),
    );

  const validForm = { username: "  johndoe  " };
  const result = processFormData(validForm);

  const invalidForm = { username: "  ab  " };
  const result2 = processFormData(invalidForm);
  return all([
    check(
      result,
      okThen((v) =>
        check(v.username, toBe("  johndoe  ")),
      ),
    ),
    check(
      result2,
      errThen((e) =>
        toBe("Username too short")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("cast handles nested object validation", () => {
  // Example: Complex nested data structure validation
  type Address = {
    street: SoftStr;
    city: SoftStr;
  };

  type User = {
    name: SoftStr;
    age: Num;
    address: Address;
  };

  const asAddress = (
    data: unknown,
  ): Result<Address, InvalidError> =>
    cast(
      data,
      asObj,
      forProp("street", asSoftStr),
      forProp("city", asSoftStr),
    );

  const asUser = (
    data: unknown,
  ): Result<User, InvalidError> =>
    cast(
      data,
      asObj,
      forProp("name", asSoftStr),
      forProp("age", asNum),
      forProp("address", asAddress),
    );

  const userData = {
    name: "John Doe",
    age: 30,
    address: {
      street: "123 Main St",
      city: "Springfield",
    },
  };

  const result = asUser(userData);
  return check(
    result,
    okThen((v) =>
      all([
        check(v.name, toBe("John Doe")),
        check(
          v.address.street,
          toBe("123 Main St"),
        ),
      ]),
    ),
  );
});

test("cast stops on first validation failure when not accumulating errors", () => {
  // This test demonstrates the difference between cast and early-exit validation
  const validateSequentially = (
    input: unknown,
  ): Result<number, InvalidError> =>
    cast(
      input,
      asNum,
      (n: number) =>
        n > 0
          ? ok(n)
          : err(
              invalidError({
                message: "Must be positive",
              }),
            ),
      (n: number) =>
        n < 100
          ? ok(n)
          : err(
              invalidError({
                message: "Must be less than 100",
              }),
            ),
    );

  const result = validateSequentially(-5);
  return check(
    result,
    errThen((e) =>
      toBe("Must be positive")(e.content.message),
    ),
  );
});

test("cast with higher arity functions (5+ parameters)", () => {
  // Test validation chains with 5+ parameters to exercise more overloads
  type ComplexObject = {
    field1: SoftStr;
    field2: Num;
    field3: Bool;
    field4: SoftStr;
    field5: Num;
    field6: Bool;
    field7: SoftStr;
  };

  const asComplexObject = (
    data: unknown,
  ): Result<ComplexObject, InvalidError> =>
    cast(
      data,
      asObj,
      forProp("field1", asSoftStr),
      forProp("field2", asNum),
      forProp("field3", asBool),
      forProp("field4", asSoftStr),
      forProp("field5", asNum),
      forProp("field6", asBool),
      forProp("field7", asSoftStr),
    );

  const validData = {
    field1: "test1",
    field2: 42,
    field3: true,
    field4: "test2",
    field5: 99,
    field6: false,
    field7: "test3",
  };

  const result = asComplexObject(validData);
  return check(
    result,
    okThen((v) =>
      all([
        check(v.field1, toBe("test1")),
        check(v.field7, toBe("test3")),
      ]),
    ),
  );
});

test("cast handles functions that throw exceptions", () => {
  // Test exception handling in validation functions
  const throwingValidator = (
    _: unknown,
  ): Result<unknown, InvalidError> => {
    throw new Error("Validation exception");
  };

  const result = cast("test", throwingValidator);
  return check(
    result,
    errThen((e) =>
      toBe(
        "Validation failed: Validation exception",
      )(e.content.message),
    ),
  );
});

test("cast handles non-Error exceptions", () => {
  // Test conversion of non-Error exceptions
  const throwingValidator = (
    _: unknown,
  ): Result<unknown, InvalidError> => {
    throw "String exception";
  };

  const result = cast("test", throwingValidator);
  return check(
    result,
    errThen((e) =>
      toBe("Validation failed: String exception")(
        e.content.message,
      ),
    ),
  );
});

test("cast handles exception thrown in sibling validator after prior Err", () => {
  // First validator fails with a regular Err, second one throws.
  // Covers the catch branch that converts the throw while acc is already Err.
  const firstFail = (
    _: unknown,
  ): Result<unknown, InvalidError> =>
    err(
      invalidError({
        message: "first failed",
      }),
    );
  const secondThrow = (
    _: unknown,
  ): Result<unknown, InvalidError> => {
    throw new Error("second boomed");
  };

  const result = cast(
    "input",
    firstFail,
    secondThrow,
  );
  // Both errors should be collected
  return check(
    result,
    errThen((e) =>
      toBeGreaterThan(0)(
        e.content.sibling.length,
      ),
    ),
  );
});

test("cast sibling validator returning Ok propagates prior Err", () => {
  const firstFail = (
    _: unknown,
  ): Result<unknown, InvalidError> =>
    err(
      invalidError({
        message: "fail first",
      }),
    );
  const secondOk = (value: unknown) =>
    ok(value as string);
  const result = cast(
    "data",
    firstFail,
    secondOk,
  );
  return check(
    result,
    errThen((e) =>
      toBe("fail first")(e.content.message),
    ),
  );
});

test("cast with maximum parameters (20 functions)", () => {
  // Test with many validation functions to exercise highest-arity overloads
  const identity = (x: unknown) => ok(x);

  const result = cast(
    "test",
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
    identity,
  );

  return check(result, okThen(toBe("test")));
});

test("cast aggregates multiple validation errors", () => {
  // Test error accumulation when multiple validations fail
  const alwaysFail1 = (
    _: unknown,
  ): Result<unknown, InvalidError> =>
    err(
      invalidError({
        message: "Error 1",
      }),
    );
  const alwaysFail2 = (
    _: unknown,
  ): Result<unknown, InvalidError> =>
    err(
      invalidError({
        message: "Error 2",
      }),
    );
  const alwaysFail3 = (
    _: unknown,
  ): Result<unknown, InvalidError> =>
    err(
      invalidError({
        message: "Error 3",
      }),
    );

  const result = cast(
    "test",
    alwaysFail1,
    alwaysFail2,
    alwaysFail3,
  );
  return check(
    result,
    errThen((e) =>
      all([
        check(e.content.sibling?.length, toBe(3)),
        check(
          e.content.sibling?.[0]?.content.message,
          toBe("Error 1"),
        ),
        check(
          e.content.sibling?.[1]?.content.message,
          toBe("Error 2"),
        ),
        check(
          e.content.sibling?.[2]?.content.message,
          toBe("Error 3"),
        ),
      ]),
    ),
  );
});
