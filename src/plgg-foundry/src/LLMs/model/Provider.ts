import {
  Box,
  pattern,
  cast,
  asBox,
  asObj,
  forProp,
  asSoftStr,
  forContent,
  newBox,
} from "plgg";

export type Provider =
  | OpenAI
  | Anthropic
  | Google;

// -------------

type Config = {
  modelName: string;
  apiKey: string;
};
const asConfig = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("modelName", asSoftStr),
    forProp("apiKey", asSoftStr),
  );

// -------------

export type OpenAI = Box<"OpenAI", Config>;
export const openai = pattern("OpenAI");
export const asOpenAI = (v: unknown) =>
  cast(v, asBox, forContent("OpenAI", asConfig));
export const newOpenAI = (
  config: Config,
): OpenAI => newBox("OpenAI")(config);

// -------------

export type Anthropic = Box<"Anthropic", Config>;
export const anthropic = pattern("Anthropic");
export const asAnthropic = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent("Anthropic", asConfig),
  );
export const newAnthropic = (
  config: Config,
): Anthropic => newBox("Anthropic")(config);

// -------------

export type Google = Box<"Google", Config>;
export const google = pattern("Google");
export const asGoogle = (v: unknown) =>
  cast(v, asBox, forContent("Google", asConfig));
export const newGoogle = (
  config: Config,
): Google => newBox("Google")(config);
