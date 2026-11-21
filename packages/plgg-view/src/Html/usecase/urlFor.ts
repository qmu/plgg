import {
  type Option,
  none,
  some,
  tryCatch,
  toOption,
  chainOption,
} from "plgg";

export type UrlUse =
  | "same-origin"
  | "web-link"
  | "https-link";

/** Validate against an explicit HTTP(S) page base, shared by SSR and client.
 * Keep relative spelling for the router. Network-path references, browser
 * whitespace normalization and embedded credentials are outside this API.
 */
export const urlFor =
  (use: UrlUse, base: string) =>
  (value: string): Option<string> => {
    if (
      !value ||
      /[\\\s\u0000-\u001f\u007f]/.test(value) ||
      value.startsWith("//")
    )
      return none();
    const parsed = toOption(
      tryCatch((input: string) => {
        const page = new URL(base);
        return {
          page,
          url: new URL(input, page),
        };
      })(value),
    );
    return chainOption(
      ({
        page,
        url,
      }: {
        page: URL;
        url: URL;
      }): Option<string> =>
        (page.protocol === "http:" ||
          page.protocol === "https:") &&
        (url.protocol === "http:" ||
          url.protocol === "https:") &&
        !url.username &&
        !url.password &&
        (use !== "same-origin" ||
          page.origin === url.origin) &&
        (use !== "https-link" ||
          url.protocol === "https:")
          ? some(value)
          : none(),
    )(parsed);
  };
