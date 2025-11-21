import { Box, pattern } from "plgg";

export type Provider =
  | OpenAI
  | Anthropic
  | Google;

type Config = {
  modelName: string;
  apiKey: string;
};

export type OpenAI = Box<"OpenAI", Config>;
export type Anthropic = Box<"Anthropic", Config>;
export type Google = Box<"Google", Config>;

export const openai = pattern("OpenAI");
export const anthropic = pattern("Anthropic");
export const google = pattern("Google");
