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
  asNum,
  asTime,
  asStr,
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

