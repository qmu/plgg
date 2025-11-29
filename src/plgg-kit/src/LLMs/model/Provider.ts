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
  modelName: string;
  apiKey: Option<string>;
}>;
const asConfig = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("modelName", asSoftStr),
    forOptionProp("apiKey", asSoftStr),
  );

// -------------

export type OpenAI = Box<"OpenAI", Config>;
export const openAI$ = pattern("OpenAI");
export const asOpenAI = (v: unknown) =>
  cast(v, asBox, forContent("OpenAI", asConfig));
export const openai = (config: {
  modelName: string;
  apiKey?: string;
}): OpenAI =>
  pipe(
    {
      modelName: config.modelName,
      apiKey: config.apiKey
        ? some(config.apiKey)
        : none(),
    },
    box("OpenAI"),
  );

// -------------

export type Anthropic = Box<"Anthropic", Config>;
export const anthropic$ = pattern("Anthropic");
export const asAnthropic = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent("Anthropic", asConfig),
  );
export const anthropic = (config: {
  modelName: string;
  apiKey?: string;
}): Anthropic =>
  pipe(
    {
      modelName: config.modelName,
      apiKey: config.apiKey
        ? some(config.apiKey)
        : none(),
    },
    box("Anthropic"),
  );

// -------------

export type Google = Box<"Google", Config>;
export const google$ = pattern("Google");
export const asGoogle = (v: unknown) =>
  cast(v, asBox, forContent("Google", asConfig));
export const google = (config: {
  modelName: string;
  apiKey?: string;
}): Google =>
  pipe(
    {
      modelName: config.modelName,
      apiKey: config.apiKey
        ? some(config.apiKey)
        : none(),
    },
    box("Google"),
  );
