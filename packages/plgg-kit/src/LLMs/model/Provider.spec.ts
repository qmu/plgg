import { test, expect } from "vitest";
import { isOk, isErr, isSome, isNone, box } from "plgg";
import {
  openai,
  anthropic,
  google,
  asOpenAI,
  asAnthropic,
  asGoogle,
} from "plgg-kit/LLMs/model";

// --- constructors: string arg vs config object, apiKey Option ---

test("openai(string) builds an OpenAI with model and no apiKey", () => {
  const p = openai("gpt-5.1");
  expect(p.__tag).toBe("OpenAI");
  expect(p.content.model).toBe("gpt-5.1");
  expect(isNone(p.content.apiKey)).toBe(true);
});

test("openai({ model, apiKey }) carries the apiKey as Some", () => {
  const p = openai({
    model: "gpt-5.1",
    apiKey: "sk-test",
  });
  expect(p.content.model).toBe("gpt-5.1");
  expect(isSome(p.content.apiKey)).toBe(true);
  if (isSome(p.content.apiKey)) {
    expect(p.content.apiKey.content).toBe("sk-test");
  }
});

test("openai({ model }) without apiKey is None", () => {
  expect(
    isNone(openai({ model: "gpt-5.1" }).content.apiKey),
  ).toBe(true);
});

test("anthropic and google build their respective tags", () => {
  expect(anthropic("claude-sonnet-4-5").__tag).toBe(
    "Anthropic",
  );
  expect(google("gemini-2.5-flash").__tag).toBe(
    "Google",
  );
  expect(
    isSome(
      anthropic({
        model: "claude",
        apiKey: "k",
      }).content.apiKey,
    ),
  ).toBe(true);
});

// --- casters: decode RAW input (a box whose content is { model, apiKey? } with
//     a plain-string apiKey or none) — not a built provider, whose apiKey is
//     already an Option box. ---

test("asOpenAI decodes a raw box (apiKey optional, plain string)", () => {
  expect(
    isOk(asOpenAI(box("OpenAI")({ model: "m" }))),
  ).toBe(true);
  expect(
    isOk(
      asOpenAI(
        box("OpenAI")({ model: "m", apiKey: "k" }),
      ),
    ),
  ).toBe(true);
});

test("asAnthropic and asGoogle decode their raw boxes", () => {
  expect(
    isOk(
      asAnthropic(
        box("Anthropic")({ model: "claude" }),
      ),
    ),
  ).toBe(true);
  expect(
    isOk(asGoogle(box("Google")({ model: "gemini" }))),
  ).toBe(true);
});

test("asOpenAI rejects a non-object content", () => {
  expect(isErr(asOpenAI("not-a-provider"))).toBe(
    true,
  );
});

test("asOpenAI rejects a box whose Config is missing model", () => {
  expect(isErr(asOpenAI(box("OpenAI")({})))).toBe(
    true,
  );
});
