import { test, assert } from "vitest";
import { isErr, isOk, isBin, isVec } from "plgg";
import { FoundrySpec } from "plgg-foundry/index";
import { run } from "plgg-foundry/Foundry/usecase";

test.skip("Run Character Image Generation", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: OPENAI_API_KEY not set",
    );
    return;
  }

  const specArg: FoundrySpec = {
    apiKey,
    description:
      "This is a foundry for generating character designs based on text prompts and reference images.",
    processors: [
      {
        name: "plan",
        description:
          "Plans the character design based on the prompt",
        inputType: "string",
        outputType: "string",
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
        name: "analyze",
        description:
          "Analyzes reference images for character features",
        inputType: "image[]",
        outputType: "string",
        process: (medium) => {
          if (
            !isVec(medium.value) ||
            !medium.value.every(isBin)
          ) {
            throw new Error(
              "Invalid medium value for analyzing step",
            );
          }
          return "Extracted character features from reference images";
        },
      },
      {
        name: "gen-main",
        description:
          "Generates the main character image",
        inputType: "string",
        outputType: "image[]",
        process: (medium) => {
          if (typeof medium.value !== "string") {
            throw new Error(
              "Invalid medium value for main generation step",
            );
          }
          return [new Uint8Array([0])];
        },
      },
      {
        name: "gen-spread",
        description:
          "Generates spread images for the character",
        inputType: "image[]",
        outputType: "image[]",
        process: (medium) => {
          if (
            !isVec(medium.value) ||
            !medium.value.every(isBin)
          ) {
            throw new Error(
              "Invalid medium value for spread generation step",
            );
          }
          return [
            new Uint8Array([1]),
            new Uint8Array([2]),
            new Uint8Array([3]),
          ];
        },
      },
    ],
    switchers: [
      {
        name: "check-validity",
        description:
          "Checks for inappropriate content in images, if invalid go back to former step",
        inputType: "image[]",
        outputTypeWhenTrue: "image[]",
        outputTypeWhenFalse: "string",
        check: (medium) => {
          if (
            !isVec(medium.value) ||
            !medium.value.every(isBin)
          ) {
            throw new Error(
              "Invalid medium value for censoring step",
            );
          }
          const isValid = Math.random() < 0.5;
          return [
            isValid,
            isValid
              ? medium.value
              : "Plan once again to avoid inappropriate content",
          ];
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

  const result = await run({
    foundrySpec: specArg,
    orderSpec: {
      prompt:
        "A fantasy character with a sword and shield",
    },
  });
  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
