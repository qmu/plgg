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
export const openai = ({
  model,
  apiKey,
}: {
  model: string;
  apiKey?: string;
}): OpenAI =>
  pipe(
    {
      model,
      apiKey: apiKey ? some(apiKey) : none(),
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
export const anthropic = ({
  model,
  apiKey,
}: {
  model: string;
  apiKey?: string;
}): Anthropic =>
  pipe(
    {
      model,
      apiKey: apiKey ? some(apiKey) : none(),
    },
    box("Anthropic"),
  );

// -------------

export type Google = Box<"Google", Config>;
export const google$ = pattern("Google");
export const asGoogle = (v: unknown) =>
  cast(v, asBox, forContent("Google", asConfig));
export const google = ({
  model,
  apiKey,
}: {
  model: string;
  apiKey?: string;
}): Google =>
  pipe(
    {
      model,
      apiKey: apiKey ? some(apiKey) : none(),
    },
    box("Google"),
  );
