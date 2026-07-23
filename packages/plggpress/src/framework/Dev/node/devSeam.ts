import { register } from "node:module";
import { type SoftStr } from "plgg";
import {
  type DevPlan,
  type DevHandle,
} from "plggpress/framework/Dev/model/DevPlan";

// The toolchain seam: the ONE module in plggpress that
// knows the dev loop is owned by `plgg-bundle`
// (`anti-corruption-structure`). Everything above it speaks
// only plggpress's own `DevPlan` / `DevHandle`; everything
// below is the bundler's business. Effectful (it registers
// a loader hook, imports a foreign module, and starts a
// server), so it is a thin `node/` edge with no logic to
// unit-test — the pure plan it forwards is what the specs
// pin, and the loop itself is proven by running it.

/** The bundler's loader hook — resolves its `plgg-bundle/*` source. */
const HOOK_SPECIFIER: SoftStr =
  "plgg-bundle/bin/hook.mjs";

/** The bundler's dev-server module, behind that hook. */
const DEV_SERVER_SPECIFIER: SoftStr =
  "plgg-bundle/Dev/node/devServer";

/** The export the seam calls, and what it must look like. */
const RUN_DEV_SERVER: SoftStr = "runDevServer";

/** Whether a value is a non-null object (records the narrowing). */
const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Narrow the bundler's answer to plggpress's own
 * {@link DevHandle}. The foreign value arrives `unknown`
 * (the import is dynamic and deliberately un-typed — see
 * {@link runDev}), so it is checked at runtime here rather
 * than asserted: no `as`, and no bundler type leaks upward.
 */
const asDevHandle = (
  value: unknown,
): DevHandle => {
  if (
    isRecord(value) &&
    typeof value["url"] === "string" &&
    typeof value["close"] === "function"
  ) {
    const close = value["close"];
    return {
      url: value["url"],
      close: (): void => {
        close();
      },
    };
  }
  throw new Error(
    `${DEV_SERVER_SPECIFIER}: ${RUN_DEV_SERVER} did not return a dev server handle`,
  );
};

/**
 * Start the dev loop for a {@link DevPlan} and return the
 * running server.
 *
 * The bundler is a run-from-source tool: it publishes no
 * built entry, and its own modules speak `plgg-bundle/*`
 * self-alias specifiers that only resolve once its loader
 * hook is registered. So the seam does exactly that —
 * registers the hook, then imports the dev server through
 * it. The import is dynamic and its result stays `unknown`
 * on purpose: plggpress gains no compile-time dependency on
 * the bundler's internal types, and the two values that DO
 * cross back (the factory, the handle) are narrowed at this
 * boundary.
 */
export const runDev = async (
  plan: DevPlan,
): Promise<DevHandle> => {
  register(import.meta.resolve(HOOK_SPECIFIER));
  const mod: unknown = await import(
    DEV_SERVER_SPECIFIER
  );
  if (!isRecord(mod)) {
    throw new Error(
      `${DEV_SERVER_SPECIFIER}: not a module`,
    );
  }
  const runDevServer = mod[RUN_DEV_SERVER];
  if (typeof runDevServer !== "function") {
    throw new Error(
      `${DEV_SERVER_SPECIFIER}: no ${RUN_DEV_SERVER} export`,
    );
  }
  const started: unknown =
    await runDevServer(plan);
  return asDevHandle(started);
};
