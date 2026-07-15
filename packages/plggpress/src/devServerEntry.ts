import { type SoftStr, matchResult } from "plgg";
import { type Fetch } from "plggpress/framework";
import {
  type DevEntryEnv,
  devEntryEnvFrom,
} from "plggpress/framework/Dev/usecase/devEntryEnv";
import { pressDevEntry } from "plggpress/devEntry";

/**
 * The dev entry `plggpress dev` ships SO A CONSUMER DOES
 * NOT HAVE TO. It is the module the toolchain re-imports on
 * every watched edit — the hot-reload mechanism is a fresh
 * `import` of THIS file — which is why it must be a real
 * module on disk rather than a closure the command hands
 * over, and why its options arrive through the environment
 * (`framework/Dev/usecase/devEntryEnv` explains the seam)
 * instead of through arguments.
 *
 * It is a wrapper and nothing else: {@link pressDevEntry}
 * remains the render factory (the same load-config →
 * discover → `pressRouter` path `build` runs), and this
 * file only supplies it the three options the command
 * resolved. Previously every consumer hand-wrote this file;
 * now the one that ships is the only one.
 *
 * A missing variable throws — the boundary the toolchain's
 * dev loop catches, so the message reaches the console
 * rather than the browser.
 */
const options: DevEntryEnv = matchResult(
  (e: SoftStr): DevEntryEnv => {
    throw new Error(e);
  },
  (env: DevEntryEnv): DevEntryEnv => env,
)(devEntryEnvFrom(process.env));

const entry: () => Promise<Fetch> =
  pressDevEntry(options);

export default entry;
