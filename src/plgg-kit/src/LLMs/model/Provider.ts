import {
  Box,
  pattern,
  cast,
  asBox,
  asObj,
  forProp,
  asSoftStr,
  forContent,
  box,
} from 'plgg';

export type Provider =
  | OpenAI
  | Anthropic
  | Google;

// -------------

type Config = Readonly<{
  modelName: string;
  apiKey: string;
}>;
const asConfig = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp('modelName', asSoftStr),
    forProp('apiKey', asSoftStr)
  );

// -------------

export type OpenAI = Box<'OpenAI', Config>;
export const patternOpenAI = pattern('OpenAI');
export const asOpenAI = (v: unknown) =>
  cast(v, asBox, forContent('OpenAI', asConfig));
export const openai = (config: Config): OpenAI =>
  box('OpenAI')(config);

// -------------

export type Anthropic = Box<'Anthropic', Config>;
export const patternAnthropic =
  pattern('Anthropic');
export const asAnthropic = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent('Anthropic', asConfig)
  );
export const anthropic = (
  config: Config
): Anthropic => box('Anthropic')(config);

// -------------

export type Google = Box<'Google', Config>;
export const patternGoogle = pattern('Google');
export const asGoogle = (v: unknown) =>
  cast(v, asBox, forContent('Google', asConfig));
export const google = (config: Config): Google =>
  box('Google')(config);
