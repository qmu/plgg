import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
} from "plgg-test";
import { toDeliveryShape } from "plgg-domain/Derivation/usecase/toDeliveryShape";
import { blogDomain } from "plgg-domain/testkit/blogDomain";

test("toDeliveryShape projects every entity to a resource", () => {
  const shape = toDeliveryShape(blogDomain);
  const users = shape.resources.find(
    (r) => r.name === "users",
  );
  return all([
    check(shape.resources, toHaveLength(2)),
    check(
      users?.fields ?? [],
      toHaveLength(3),
    ),
    check(
      (users?.fields ?? []).some(
        (f) =>
          f.name === "bio" &&
          f.nullable === true,
      ),
      toBe(true),
    ),
  ]);
});

test("toDeliveryShape is deterministic", () =>
  check(
    JSON.stringify(toDeliveryShape(blogDomain)),
    toBe(
      JSON.stringify(
        toDeliveryShape(blogDomain),
      ),
    ),
  ));
