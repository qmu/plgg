import { test, expect } from "vitest";
import { bind } from "plgg/Functionals/bind";
import { proc, ok, err, isOk, box, Box } from "plgg/index";

test("bind adds value to context under specified key", async () => {
  const result = await proc(
    bind(["value", () => 42]),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual({ value: 42 });
  }
});

test("bind chains multiple values in context", async () => {
  const result = await proc(
    bind(
      ["a", () => 1],
      ["b", ({ a }) => a + 1],
      ["c", ({ a, b }) => a + b],
    ),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  }
});

test("bind unwraps Ok results", async () => {
  const result = await proc(
    bind(["value", () => ok(100)]),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual({
      value: 100,
    });
  }
});

test("bind propagates Err results", async () => {
  const result = await proc(
    bind(["value", () => err(new Error("failed"))]),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(false);
});

test("bind works with async functions", async () => {
  const result = await proc(
    bind([
      "delayed",
      async () => {
        await new Promise((r) =>
          setTimeout(r, 10),
        );
        return "done";
      },
    ]),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual({
      delayed: "done",
    });
  }
});

test("bind preserves context through chain", async () => {
  const result = await proc(
    bind(
      ["initial", () => "start"],
      ["first", ({ initial }) => `${initial}-1`],
      [
        "second",
        ({ initial, first }) =>
          `${initial}-${first}-2`,
      ],
    ),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual({
      initial: "start",
      first: "start-1",
      second: "start-start-1-2",
    });
  }
});

test("bind can be used to extract final value", async () => {
  const result = await proc(
    bind(["x", () => 10], ["y", () => 20]),
    ({ x, y }) => x + y,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toBe(30);
  }
});

test("bind preserves Box types without unwrapping", async () => {
  type Provider = Box<"Provider", { name: string }>;
  const createProvider = (
    config: string,
  ): Provider => box("Provider")({ name: config });

  type Foundry = Box<
    "Foundry",
    { provider: Provider; spec: string }
  >;
  const asFoundry = (args: {
    provider: Provider;
    spec: string;
  }): Foundry => box("Foundry")(args);

  const result = await proc(
    bind(
      ["config", () => "test-config"],
      [
        "provider",
        ({ config }) => createProvider(config),
      ],
      [
        "foundry",
        ({ provider }) =>
          asFoundry({
            provider,
            spec: "test-spec",
          }),
      ],
    ),
    (ctx) => ctx,
  );

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const ctx = result.content;
    expect(ctx.foundry.__tag).toBe("Foundry");
    expect(ctx.foundry.content.spec).toBe(
      "test-spec",
    );
    expect(
      ctx.foundry.content.provider.__tag,
    ).toBe("Provider");
    expect(
      ctx.foundry.content.provider.content.name,
    ).toBe("test-config");
  }
});
