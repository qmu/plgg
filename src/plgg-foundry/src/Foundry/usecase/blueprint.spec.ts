import { test, assert } from "vitest";
import { isOk, proc } from "plgg";
import {
  asFoundry,
  asOrder,
} from "plgg-foundry/index";
import { blueprint } from "plgg-foundry/Foundry/usecase";
import { newTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("Blueprint generation with test foundry", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping blueprint test (OPENAI_API_KEY not set)",
    );
    return;
  }

  const orderSpec = {
    prompt: "Create a fantasy warrior character",
  };

  const result = await proc(
    apiKey,
    newTestFoundrySpec,
    asFoundry,
    (foundry) =>
      proc(
        orderSpec,
        asOrder,
        blueprint(foundry),
      ),
  );
  assert(
    isOk(result),
    "Blueprint should generate valid alignment",
  );

  console.log(result.content);
}, 30000);
