import { Box } from "plgg";

export type LLMsProvider =
  | OpenAI
  | Anthropic
  | Google;

type ProviderConfig = {
  modelName: string;
  apiKey: string;
};

export type OpenAI = Box<
  "OpenAI",
  ProviderConfig
>;

export type Anthropic = Box<
  "Anthropic",
  ProviderConfig
>;

export type Google = Box<
  "Google",
  ProviderConfig
>;
