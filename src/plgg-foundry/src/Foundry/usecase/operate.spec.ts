import { test, assert, expect } from "vitest";
import { proc, isErr, isOk } from "plgg";
import { openai } from "plgg-kit";
import {
  asAlignment,
  asFoundry,
} from "plgg-foundry/index";
import { operate } from "plgg-foundry/Foundry/usecase";
import { makeTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("OperationContext: assemble -> operate with example blueprint", async () => {
  const provider = openai({
    apiKey: "no key",
    modelName: "gpt-5.1",
  });
  const spec = makeTestFoundrySpec();

  const maybeAlignment = asAlignment({
    userRequestAnalysis:
      "User wants a fantasy character image with sword and shield",
    compositionRationale:
      "Use plan->generate->validate loop to create character",
    userRequest:
      "A fantasy character with a sword and shield",
    ingress: {
      type: "ingress",
      next: "plan",
      promptAddr: "r0",
    },
    internalOperations: [
      {
        type: "process",
        name: "plan",
        action: "plan",
        input: [
          { variableName: "prompt", address: "r0" },
        ],
        output: [
          { variableName: "plan", address: "r1" },
        ],
        next: "gen-main",
      },
      {
        type: "process",
        name: "gen-main",
        action: "gen-main",
        input: [
          {
            variableName: "description",
            address: "r1",
          },
        ],
        output: [
          { variableName: "image", address: "r2" },
        ],
        next: "check-validity",
      },
      {
        type: "switch",
        name: "check-validity",
        action: "check-validity",
        input: [
          { variableName: "images", address: "r2" },
        ],
        nextWhenTrue: "gen-spread",
        nextWhenFalse: "plan",
        outputWhenTrue: [
          {
            variableName: "validImages",
            address: "r3",
          },
        ],
        outputWhenFalse: [
          {
            variableName: "feedback",
            address: "r0",
          },
        ],
      },
      {
        type: "process",
        name: "gen-spread",
        action: "gen-spread",
        input: [
          { variableName: "image", address: "r2" },
        ],
        output: [
          {
            variableName: "spreadImages",
            address: "r3",
          },
        ],
        next: "egress",
      },
    ],
    egress: {
      type: "egress",
      result: {
        mainImage: "r2",
        spreadImages: "r3",
      },
    },
  });

  assert(isOk(maybeAlignment));

  // Test the flow: assemble -> operate
  const result = await proc(
    { provider, spec },
    asFoundry,
    (foundry) =>
      proc(
        maybeAlignment.content,
        operate(foundry),
      ),
  );

  // Assert the result is successful
  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
  const mainImage =
    result.content.params["mainImage"]?.value;
  assert(mainImage);
  assert(Array.isArray(mainImage));
  expect(mainImage[0]).toBeInstanceOf(Uint8Array);
  const spreadImages =
    result.content.params["spreadImages"]?.value;
  assert(spreadImages);
  expect(spreadImages).toBeInstanceOf(Array);
});
