import { isBin, isVec } from "plgg";
import {
  newFoundrySpec,
  newProcessorSpec,
  newSwitcherSpec,
  newPackerSpec,
} from "plgg-foundry/index";

export const newTestFoundrySpec = (
  apiKey: string,
) =>
  newFoundrySpec({
    apiKey,
    description:
      "This is a foundry for generating character designs based on text prompts and reference images.",
    apparatuses: [
      newProcessorSpec({
        name: "plan",
        description:
          "Plans the character design based on the prompt",
        arguments: { prompt: { type: "string" } },
        returns: { plan: { type: "string" } },
        process: async (medium) => {
          const value =
            medium.params["prompt"]?.value;
          if (typeof value !== "string") {
            throw new Error(
              "Invalid medium value for planning step",
            );
          }
          return {
            plan: "Well-planned character design description",
          };
        },
      }),
      newProcessorSpec({
        name: "analyze",
        description:
          "Analyzes reference images for character features",
        arguments: {
          images: { type: "image[]" },
        },
        returns: { features: { type: "string" } },
        process: async (medium) => {
          const value =
            medium.params["images"]?.value;
          if (
            !isVec(value) ||
            !value.every(isBin)
          ) {
            throw new Error(
              "Invalid medium value for analyzing step",
            );
          }
          return {
            features:
              "Extracted character features from reference images",
          };
        },
      }),
      newProcessorSpec({
        name: "gen-main",
        description:
          "Generates the main character image",
        arguments: {
          description: { type: "string" },
        },
        returns: { image: { type: "image[]" } },
        process: async (medium) => {
          const value =
            medium.params["description"]?.value;
          if (typeof value !== "string") {
            throw new Error(
              "Invalid medium value for main generation step",
            );
          }
          return {
            image: [new Uint8Array([0])],
          };
        },
      }),
      newProcessorSpec({
        name: "gen-spread",
        description:
          "Generates spread images for the character",
        arguments: {
          mainImage: { type: "image[]" },
        },
        returns: {
          spreadImages: { type: "image[]" },
        },
        process: async (medium) => {
          const value =
            medium.params["mainImage"]?.value;
          if (
            !isVec(value) ||
            !value.every(isBin)
          ) {
            throw new Error(
              "Invalid medium value for spread generation step",
            );
          }
          return {
            spreadImages: [
              new Uint8Array([1]),
              new Uint8Array([2]),
              new Uint8Array([3]),
            ],
          };
        },
      }),
      newSwitcherSpec({
        name: "check-validity",
        description:
          "Checks for inappropriate content in images, if invalid go back to former step",
        arguments: {
          images: { type: "image[]" },
        },
        returnsWhenTrue: {
          validImages: { type: "image[]" },
        },
        returnsWhenFalse: {
          feedback: { type: "string" },
        },
        check: async (medium) => {
          const value =
            medium.params["images"]?.value;
          if (
            !isVec(value) ||
            !value.every(isBin)
          ) {
            throw new Error(
              "Invalid medium value for censoring step",
            );
          }
          const isValid = Math.random() < 0.5;
          return [
            isValid,
            isValid
              ? { validImages: value }
              : {
                  feedback:
                    "Plan once again to avoid inappropriate content",
                },
          ];
        },
      }),
      newPackerSpec({
        mainImage: { type: "image[]" },
        spreadImages: { type: "image[]" },
        plannedDescription: { type: "string" },
      }),
    ],
  });
