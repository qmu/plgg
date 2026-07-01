import {
  test,
  check,
  all,
  toBe,
  shouldBeOk,
  shouldBeErr,
  someThen,
  shouldBeNone,
} from "plgg-test";
import { box } from "plgg";
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
  return all([
    check(p.__tag, toBe("OpenAI")),
    check(p.content.model, toBe("gpt-5.1")),
    check(p.content.apiKey, shouldBeNone()),
  ]);
});

test("openai({ model, apiKey }) carries the apiKey as Some", () => {
  const p = openai({
    model: "gpt-5.1",
    apiKey: "sk-test",
  });
  return all([
    check(p.content.model, toBe("gpt-5.1")),
    check(
      p.content.apiKey,
      someThen((k) => toBe("sk-test")(k)),
    ),
  ]);
});

test("openai({ model }) without apiKey is None", () =>
  check(
    openai({ model: "gpt-5.1" }).content.apiKey,
    shouldBeNone(),
  ));

test("anthropic and google build their respective tags", () =>
  all([
    check(
      anthropic("claude-sonnet-4-5").__tag,
      toBe("Anthropic"),
    ),
    check(
      google("gemini-2.5-flash").__tag,
      toBe("Google"),
    ),
    check(
      anthropic({
        model: "claude",
        apiKey: "k",
      }).content.apiKey,
      someThen((k) => toBe("k")(k)),
    ),
  ]));

// --- casters: decode RAW input (a box whose content is { model, apiKey? } with
//     a plain-string apiKey or none) — not a built provider, whose apiKey is
//     already an Option box. ---

test("asOpenAI decodes a raw box (apiKey optional, plain string)", () =>
  all([
    check(
      asOpenAI(box("OpenAI")({ model: "m" })),
      shouldBeOk(),
    ),
    check(
      asOpenAI(
        box("OpenAI")({
          model: "m",
          apiKey: "k",
        }),
      ),
      shouldBeOk(),
    ),
  ]));

test("asAnthropic and asGoogle decode their raw boxes", () =>
  all([
    check(
      asAnthropic(
        box("Anthropic")({ model: "claude" }),
      ),
      shouldBeOk(),
    ),
    check(
      asGoogle(
        box("Google")({ model: "gemini" }),
      ),
      shouldBeOk(),
    ),
  ]));

test("asOpenAI rejects a non-object content", () =>
  check(
    asOpenAI("not-a-provider"),
    shouldBeErr(),
  ));

test("asOpenAI rejects a box whose Config is missing model", () =>
  check(
    asOpenAI(box("OpenAI")({})),
    shouldBeErr(),
  ));
