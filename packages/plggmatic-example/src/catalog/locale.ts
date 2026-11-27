export type Locale = "ja" | "en";

export const localeOf = (
  value: string | undefined,
): Locale => (value === "en" ? "en" : "ja");

export type Label = (
  ja: string,
  en: string,
) => string;

export const labels =
  (locale: Locale): Label =>
  (ja, en) =>
    locale === "en" ? en : ja;

export const baseOf = (locale: Locale) =>
  locale === "en" ? "/en/" : "/";
