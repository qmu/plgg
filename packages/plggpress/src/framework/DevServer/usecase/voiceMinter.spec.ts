import { type SoftStr } from "plgg";
import {
  test,
  check,
  toBe,
  someThen,
  shouldBeNone,
} from "plgg-test";
import {
  voiceApiKeyOf,
  voiceMinterFrom,
} from "plggpress/framework/DevServer/usecase/voiceMinter";

test("no OPENAI_API_KEY at all: the assistant stays dark", () =>
  check(voiceMinterFrom({}), shouldBeNone()));

test("a blank OPENAI_API_KEY is the same as absent", () =>
  check(
    voiceMinterFrom({ OPENAI_API_KEY: "   " }),
    shouldBeNone(),
  ));

test("an undefined value reads as absent", () =>
  check(
    voiceApiKeyOf({ OPENAI_API_KEY: undefined }),
    shouldBeNone(),
  ));

test("a configured key is the gate's answer", () =>
  check(
    voiceApiKeyOf({
      OPENAI_API_KEY: "sk-not-a-real-key",
    }),
    someThen((key: SoftStr) =>
      toBe("sk-not-a-real-key")(key),
    ),
  ));

test("a configured key yields a usable minter", () =>
  check(
    voiceMinterFrom({
      OPENAI_API_KEY: "sk-not-a-real-key",
    }),
    someThen((minter) =>
      toBe("function")(typeof minter.mint),
    ),
  ));
