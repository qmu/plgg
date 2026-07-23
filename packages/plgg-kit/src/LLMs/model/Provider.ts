import {
  Obj,
  Option,
  cast,
  asBox,
  asObj,
  forProp,
  forOptionProp,
  asSoftStr,
  forContent,
  none,
  fromNullable,
  defineVariant,
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

const OpenAIV = defineVariant("OpenAI")<Config>();
export type OpenAI = ReturnType<
  typeof OpenAIV.make
>;
export const openAI$ = OpenAIV.pattern;
export const asOpenAI = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent(OpenAIV.tag, asConfig),
  );
export function openai(model: string): OpenAI;
export function openai(config: { model: string; apiKey?: string }): OpenAI;
export function openai(
  arg: string | { model: string; apiKey?: string },
): OpenAI {
  return OpenAIV.make(toConfig(arg));
}

// -------------

const AnthropicV =
  defineVariant("Anthropic")<Config>();
export type Anthropic = ReturnType<
  typeof AnthropicV.make
>;
export const anthropic$ = AnthropicV.pattern;
export const asAnthropic = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent(AnthropicV.tag, asConfig),
  );
export function anthropic(model: string): Anthropic;
export function anthropic(config: { model: string; apiKey?: string }): Anthropic;
export function anthropic(
  arg: string | { model: string; apiKey?: string },
): Anthropic {
  return AnthropicV.make(toConfig(arg));
}

// -------------

const GoogleV = defineVariant("Google")<Config>();
export type Google = ReturnType<
  typeof GoogleV.make
>;
export const google$ = GoogleV.pattern;
export const asGoogle = (v: unknown) =>
  cast(
    v,
    asBox,
    forContent(GoogleV.tag, asConfig),
  );
export function google(model: string): Google;
export function google(config: { model: string; apiKey?: string }): Google;
export function google(
  arg: string | { model: string; apiKey?: string },
): Google {
  return GoogleV.make(toConfig(arg));
}
