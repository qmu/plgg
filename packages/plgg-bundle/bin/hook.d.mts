// Hand-written types for the JS loader hook (the hook must
// stay a plain `.mjs` — it runs as Node's ESM resolver
// before any type-stripping is active — so it carries no
// inferable types). Declared here so a `.ts` spec can drive
// `resolve` type-safely under `allowJs: false`.

/** A resolved module, as returned to Node's loader chain. */
export type Resolved = {
  url: string;
  shortCircuit?: boolean;
};

export const resolve: (
  specifier: string,
  context: { parentURL?: string | undefined },
  nextResolve: (
    specifier: string,
    context: { parentURL?: string | undefined },
  ) => Promise<Resolved>,
) => Promise<Resolved>;
