import {
  Box,
  Obj,
  Option,
  pattern,
  cast,
  asBox,
  asObj,
  forProp,
  forOptionProp,
  asSoftStr,
  forContent,
  box,
  none,
  fromNullable,
  pipe,
} from "plgg";

export type Provider =
  | OpenAI
  | Anthropic
  | Google;

// -------------

type Config = Obj<{
  model: string;
  apiKey: Option<string>;
}>;
const asConfig = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("model", asSoftStr),
    forOptionProp("apiKey", asSoftStr),
  );

/**
 * Normalizes a constructor argument (a bare model string, or a
 * `{ model, apiKey? }` object) into a {@link Config} — the optional `apiKey`
 * becomes an `Option` via `fromNullable`, never an `undefined` literal.
 */
const toConfig = (
  arg: string | { model: string; apiKey?: string },
): Config =>
  typeof arg === "string"
    ? { model: arg, apiKey: none() }
    : {
        model: arg.model,
        apiKey: fromNullable(arg.apiKey),
      };

// -------------

export type OpenAI = Box<"OpenAI", Config>;
export const openAI$ = pattern("OpenAI");
export const asOpenAI = (v: unknown) =>
  cast(v, asBox, forContent("OpenAI", asConfig));
export function openai(model: string): OpenAI;
export function openai(config: { model: string; apiKey?: string }): OpenAI;
export function openai(
  arg: string | { model: string; apiKey?: string },
): OpenAI {
  return pipe(toConfig(arg), box("OpenAI"));
}

// -------------

export type Anthropic = Box<"Anthropic", Config>;
export const anthropic$ = pattern("Anthropic");
export const asAnthropic = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent("Anthropic", asConfig),
  );
export function anthropic(model: string): Anthropic;
export function anthropic(config: { model: string; apiKey?: string }): Anthropic;
export function anthropic(
  arg: string | { model: string; apiKey?: string },
): Anthropic {
  return pipe(toConfig(arg), box("Anthropic"));
}

// -------------

export type Google = Box<"Google", Config>;
export const google$ = pattern("Google");
export const asGoogle = (v: unknown) =>
  cast(v, asBox, forContent("Google", asConfig));
export function google(model: string): Google;
export function google(config: { model: string; apiKey?: string }): Google;
export function google(
  arg: string | { model: string; apiKey?: string },
): Google {
  return pipe(toConfig(arg), box("Google"));
}
