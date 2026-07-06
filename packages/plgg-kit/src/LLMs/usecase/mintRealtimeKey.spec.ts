import {
  test,
  check,
  toBe,
} from "plgg-test";
import { isNone, isSome, some, none } from "plgg";
import { minterFromConfig } from "plgg-kit/LLMs/usecase/mintRealtimeKey";

test("no API key → None (the voice UI stays dark)", () =>
  check(
    isNone(
      minterFromConfig({
        apiKey: none(),
        model: "gpt-realtime",
        endpoint: "https://api.example/realtime/sessions",
      }),
    ),
    toBe(true),
  ));

test("an API key → Some(minter)", () =>
  check(
    isSome(
      minterFromConfig({
        apiKey: some("sk-test"),
        model: "gpt-realtime",
        endpoint: "https://api.example/realtime/sessions",
      }),
    ),
    toBe(true),
  ));
