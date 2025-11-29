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
  some,
  none,
  pipe,
} from "plgg";

export type Provider =
  | OpenAI
  | Anthropic
  | Google;

//export const asProvider = (v: unknown) =>
//  cast(
//    v,
//    asOpenAI,
//    orCast(asAnthropic),
//    orCast(asGoogle)
//  );

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
  const { model, apiKey } =
    typeof arg === "string" ? { model: arg, apiKey: undefined } : arg;
  return pipe(
    {
      model,
      apiKey: apiKey ? some(apiKey) : none(),
    },
    box("OpenAI"),
  );
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
  const { model, apiKey } =
    typeof arg === "string" ? { model: arg, apiKey: undefined } : arg;
  return pipe(
    {
      model,
      apiKey: apiKey ? some(apiKey) : none(),
    },
    box("Anthropic"),
  );
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
  const { model, apiKey } =
    typeof arg === "string" ? { model: arg, apiKey: undefined } : arg;
  return pipe(
    {
      model,
      apiKey: apiKey ? some(apiKey) : none(),
    },
    box("Google"),
  );
}
