import { test, assert, expect } from "vitest";
import { isOk, proc, env, bind } from "plgg";
import { openai } from "plgg-kit";
import {
  asFoundry,
  asOrder,
  extractOpcodes,
  isProcessor,
  isSwitcher,
} from "plgg-foundry/index";
import { blueprint } from "plgg-foundry/Foundry/usecase";
import { makeTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

const makeTestProvider = () =>
  openai({
    modelName: "gpt-4",
    apiKey: "test-api-key",
  });

test.skip("Blueprint generation with test foundry", async () => {
  const result = await proc(
    bind(
      ["apiKey", () => env("OPENAI_API_KEY")],
      [
        "provider",
        ({ apiKey }) =>
          openai({
            apiKey,
            modelName: "gpt-5.1",
          }),
      ],
      [
        "foundry",
        ({ provider }) =>
          asFoundry({
            provider,
            spec: makeTestFoundrySpec(),
          }),
      ],
      [
        "order",
        () =>
          asOrder({
            prompt:
              "Create a fantasy warrior character",
          }),
      ],
    ),
    ({ foundry, order }) =>
      blueprint(foundry)(order),
  );

  assert(
    isOk(result),
    "Blueprint should generate valid alignment",
  );

  console.log(result.content);
}, 30000);

test("extractOpcodes extracts processor opcodes from testFoundrySpec", () => {
  const spec = makeTestFoundrySpec();
  const foundryResult = asFoundry({
    provider: makeTestProvider(),
    spec,
  });

  assert(
    isOk(foundryResult),
    "Foundry should be created",
  );

  const processorOpcodes = extractOpcodes(
    foundryResult.content.apparatuses,
    isProcessor,
  );

  expect(processorOpcodes).toEqual([
    "plan",
    "analyze",
    "gen-main",
    "gen-spread",
  ]);
});

test("extractOpcodes extracts switcher opcodes from testFoundrySpec", () => {
  const spec = makeTestFoundrySpec();
  const foundryResult = asFoundry({
    provider: makeTestProvider(),
    spec,
  });

  assert(
    isOk(foundryResult),
    "Foundry should be created",
  );

  const switcherOpcodes = extractOpcodes(
    foundryResult.content.apparatuses,
    isSwitcher,
  );

  expect(switcherOpcodes).toEqual([
    "check-validity",
  ]);
});
