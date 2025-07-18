import { test, assert, expect } from "vitest";
import {
  Result,
  cast,
  ValidationError,
  Str,
  asObj,
  hasProp,
  Time,
  Num,
  Bool,
  asNum,
  asTime,
  asStr,
  asBool,
  isOk,
  isErr,
  refine,
} from "plgg/index";

test("cast validates object structure with multiple properties", () => {
  // Example: Validating API response data
  type UserProfile = {
    id: Num;
    email: Str;
    createdAt: Time;
  };

  const asUserProfile = (data: unknown): Result<UserProfile, ValidationError> =>
    cast(
      data,
      asObj,
      hasProp("id", asNum),
      hasProp("email", asStr),
      hasProp("createdAt", asTime),
    );

  const validData = {
    id: 123,
    email: "user@example.com",
    createdAt: "2023-10-01T12:00:00Z",
  };

  const result = asUserProfile(validData);
  assert(isOk(result));
  expect(result.ok.id).toBe(123);
  expect(result.ok.email).toBe("user@example.com");
  expect(result.ok.createdAt).toBeInstanceOf(Date);
});

test("cast accumulates validation errors for multiple invalid properties", () => {
  type Product = {
    id: Num;
    name: Str;
    price: Num;
  };

  const asProduct = (data: unknown): Result<Product, ValidationError> =>
    cast(
      data,
      asObj,
      hasProp("id", asNum),
      hasProp("name", asStr),
      hasProp("price", asNum),
    );

  const invalidData = {
    id: "not-a-number",
    name: 123, // should be string
    price: "not-a-number",
  };

  const result = asProduct(invalidData);
  assert(isErr(result));
  expect(result.err.sibling.length).toBe(3); // All three properties failed
});

test("cast processes validation chain sequentially", () => {
  // Example: Form data processing with multiple validation steps
  const processFormData = (
    input: unknown,
  ): Result<{ username: string }, ValidationError> =>
    cast(
      input,
      asObj,
      hasProp("username", (v) =>
        cast(
          v,
          asStr,
          refine((a) => a.trim().length >= 3, "Username too short"),
        ),
      ),
    );

  const validForm = { username: "  johndoe  " };
  const result = processFormData(validForm);
  assert(isOk(result));
  expect(result.ok.username).toBe("  johndoe  ");

  const invalidForm = { username: "  ab  " };
  const result2 = processFormData(invalidForm);
  assert(isErr(result2));
  expect(result2.err.message).toBe("Username too short");
});

test("cast handles nested object validation", () => {
  // Example: Complex nested data structure validation
  type Address = {
    street: Str;
    city: Str;
  };

  type User = {
    name: Str;
    age: Num;
    address: Address;
  };

  const asAddress = (data: unknown): Result<Address, ValidationError> =>
    cast(data, asObj, hasProp("street", asStr), hasProp("city", asStr));

  const asUser = (data: unknown): Result<User, ValidationError> =>
    cast(
      data,
      asObj,
      hasProp("name", asStr),
      hasProp("age", asNum),
      hasProp("address", asAddress),
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
  assert(isOk(result));
  expect(result.ok.name).toBe("John Doe");
  expect(result.ok.address.street).toBe("123 Main St");
});

test("cast stops on first validation failure when not accumulating errors", () => {
  // This test demonstrates the difference between cast and early-exit validation
  const validateSequentially = (
    input: unknown,
  ): Result<number, ValidationError> =>
    cast(
      input,
      asNum,
      (n: number) =>
        n > 0
          ? { _tag: "Ok" as const, ok: n }
          : {
              _tag: "Err" as const,
              err: new ValidationError({ message: "Must be positive" }),
            },
      (n: number) =>
        n < 100
          ? { _tag: "Ok" as const, ok: n }
          : {
              _tag: "Err" as const,
              err: new ValidationError({ message: "Must be less than 100" }),
            },
    );

  const result = validateSequentially(-5);
  assert(isErr(result));
  expect(result.err.message).toBe("Must be positive");
});

test("cast with higher arity functions (5+ parameters)", () => {
  // Test validation chains with 5+ parameters to exercise more overloads
  type ComplexObject = {
    field1: Str;
    field2: Num;
    field3: Bool;
    field4: Str;
    field5: Num;
    field6: Bool;
    field7: Str;
  };

  const asComplexObject = (data: unknown): Result<ComplexObject, ValidationError> =>
    cast(
      data,
      asObj,
      hasProp("field1", asStr),
      hasProp("field2", asNum),
      hasProp("field3", asBool),
      hasProp("field4", asStr),
      hasProp("field5", asNum),
      hasProp("field6", asBool),
      hasProp("field7", asStr),
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
  assert(isOk(result));
  expect(result.ok.field1).toBe("test1");
  expect(result.ok.field7).toBe("test3");
});

test("cast handles functions that throw exceptions", () => {
  // Test exception handling in validation functions
  const throwingValidator = (_: unknown): Result<unknown, ValidationError> => {
    throw new Error("Validation exception");
  };

  const result = cast("test", throwingValidator);
  assert(isErr(result));
  expect(result.err.message).toBe("Validation failed");
});

test("cast handles non-Error exceptions", () => {
  // Test conversion of non-Error exceptions
  const throwingValidator = (_: unknown): Result<unknown, ValidationError> => {
    throw "String exception";
  };

  const result = cast("test", throwingValidator);
  assert(isErr(result));
  expect(result.err.message).toBe("Validation failed");
});

test("cast with maximum parameters (20 functions)", () => {
  // Test with many validation functions to exercise highest-arity overloads
  const identity = (x: unknown) => ({ _tag: "Ok" as const, ok: x });
  
  const result = cast(
    "test",
    identity, identity, identity, identity, identity,
    identity, identity, identity, identity, identity,
    identity, identity, identity, identity, identity,
    identity, identity, identity, identity, identity
  );
  
  assert(isOk(result));
  expect(result.ok).toBe("test");
});

test("cast aggregates multiple validation errors", () => {
  // Test error accumulation when multiple validations fail
  const alwaysFail1 = (_: unknown): Result<unknown, ValidationError> => 
    ({ _tag: "Err" as const, err: new ValidationError({ message: "Error 1" }) });
  const alwaysFail2 = (_: unknown): Result<unknown, ValidationError> => 
    ({ _tag: "Err" as const, err: new ValidationError({ message: "Error 2" }) });
  const alwaysFail3 = (_: unknown): Result<unknown, ValidationError> => 
    ({ _tag: "Err" as const, err: new ValidationError({ message: "Error 3" }) });

  const result = cast("test", alwaysFail1, alwaysFail2, alwaysFail3);
  assert(isErr(result));
  expect(result.err.sibling?.length).toBe(3);
  expect(result.err.sibling?.[0]?.message).toBe("Error 1");
  expect(result.err.sibling?.[1]?.message).toBe("Error 2");
  expect(result.err.sibling?.[2]?.message).toBe("Error 3");
});

