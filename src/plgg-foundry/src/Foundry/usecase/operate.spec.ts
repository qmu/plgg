import { test, assert, expect } from "vitest";
import {
  pipe,
  proc,
  isErr,
  isOk,
  atProp,
} from "plgg";
import {
  FoundrySpec,
  asAlignment,
  asFoundry,
} from "plgg-foundry/index";
import { operate } from "plgg-foundry/Foundry/usecase";

test("OperationContext: assemble -> operate with example blueprint", async () => {
  // Define the FoundrySpec with processors and switchers
  const specArg: FoundrySpec = {
    apiKey: "not needed for this test",
    description:
      "Test foundry for character design workflow",
    processors: [
      {
        name: "plan",
        description: "plan",
        process: (medium) => {
          if (typeof medium.value !== "string") {
            throw new Error(
              "Invalid medium value for planning step",
            );
          }
          return "Well-planned character design description";
        },
      },
      {
        name: "gen-main",
        description:
          "Generates the main character image",
        process: (medium) => {
          if (typeof medium.value !== "string") {
            throw new Error(
              "Invalid medium value for main generation step",
            );
          }
          const image = new Uint8Array([0]);
          return image;
        },
      },
      {
        name: "gen-spread",
        description:
          "Generates spread images for the character",
        process: (medium) => {
          if (
            !(medium.value instanceof Uint8Array)
          ) {
            throw new Error(
              "Invalid medium value for spread generation step",
            );
          }
          const image1 = new Uint8Array([1]);
          const image2 = new Uint8Array([2]);
          const image3 = new Uint8Array([3]);
          return [image1, image2, image3];
        },
      },
    ],
    switchers: [
      {
        name: "check-validity",
        description:
          "Checks for inappropriate content in images",
        check: (medium) => {
          if (
            !(medium.value instanceof Uint8Array)
          ) {
            throw new Error(
              "Invalid medium value for validity check",
            );
          }
          return [true, medium.value];
        },
      },
    ],
    packers: [
      {
        name: "mainImage",
        processedBy: "gen-main",
      },
      {
        name: "spreadImages",
        processedBy: "gen-spread",
      },
      {
        name: "plannedDescription",
        processedBy: "plan",
      },
    ],
  };

  // Define the example Alignment (blueprint)
  const maybeAlignment = asAlignment({
    userRequestAnalysis:
      "User wants a fantasy character image with sword and shield",
    compositionRationale:
      "Use plan->generate->validate loop to create character",
    userRequest:
      "A fantasy character with a sword and shield",
    operations: [
      {
        type: "ingress",
        next: "plan",
        promptAddr: "r0",
      },
      {
        type: "process",
        opcode: "plan",
        next: "gen-main",
        loadAddr: "r0",
        saveAddr: "r1",
      },
      {
        type: "process",
        opcode: "gen-main",
        next: "check-validity",
        loadAddr: "r1",
        saveAddr: "r2",
      },
      {
        type: "switch",
        opcode: "check-validity",
        nextWhenTrue: "gen-spread",
        nextWhenFalse: "plan",
        loadAddr: "r2",
        saveAddrTrue: "r3",
        saveAddrFalse: "r0",
      },
      {
        type: "process",
        opcode: "gen-spread",
        next: "egress",
        loadAddr: "r2",
        saveAddr: "r3",
      },
      {
        type: "egress",
        result: {
          mainImage: "r2",
          spreadImages: "r3",
        },
      },
    ],
  });

  assert(isOk(maybeAlignment));

  // Test the flow: assemble -> operate
  const result = await proc(
    specArg,
    asFoundry,
    (foundrySpec) =>
      proc(
        maybeAlignment.content,
        operate(foundrySpec),
      ),
  );

  // Assert the result is successful
  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
  const mainImage = pipe(
    result.content.value,
    atProp("mainImage"),
  );
  assert(isOk(mainImage));
  expect(mainImage.content).toBeInstanceOf(
    Uint8Array,
  );
  const spreadImages = pipe(
    result.content.value,
    atProp("spreadImages"),
  );
  assert(isOk(spreadImages));
  expect(spreadImages.content).toBeInstanceOf(
    Array,
  );
});
