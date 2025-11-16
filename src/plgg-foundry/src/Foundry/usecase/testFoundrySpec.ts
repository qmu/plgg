import { isBin, isVec } from "plgg";
import { FoundrySpec } from "plgg-foundry/index";

export const newTestFoundrySpec = (
  apiKey: string,
): FoundrySpec => ({
  apiKey,
  description:
    "This is a foundry for generating character designs based on text prompts and reference images.",
  processors: [
    {
      name: "plan",
      description:
        "Plans the character design based on the prompt",
      inputType: [{ name: "prompt", type: "string" }],
      outputType: [{ name: "plan", type: "string" }],
      process: async ({ medium }) => {
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
      inputType: [{ name: "images", type: "image[]" }],
      outputType: [{ name: "features", type: "string" }],
      process: async ({ medium }) => {
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
      inputType: [{ name: "description", type: "string" }],
      outputType: [{ name: "image", type: "image[]" }],
      process: async ({ medium }) => {
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
      inputType: [{ name: "mainImage", type: "image[]" }],
      outputType: [{ name: "spreadImages", type: "image[]" }],
      process: async ({ medium }) => {
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
      inputType: [{ name: "images", type: "image[]" }],
      outputTypeWhenTrue: [{ name: "validImages", type: "image[]" }],
      outputTypeWhenFalse: [{ name: "feedback", type: "string" }],
      check: async ({ medium }) => {
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
});
