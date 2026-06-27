import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { asBundleConfig } from "plgg-bundle/domain/usecase/asBundleConfig";
import { build } from "plgg-bundle/domain/usecase/build";

/**
 * CLI entry: resolve the target package's bundle config
 * (`bundle.config.ts` in cwd, or an explicit path arg),
 * dynamically import it (Node strips its types),
 * validate it, run the build, and exit non-zero on
 * failure. The shell stays thin and is the single
 * place a thrown build error is turned into an exit
 * code — the plain-TS counterpart to a `Result` edge.
 */
const main = async (): Promise<void> => {
  const configPath = resolve(
    process.cwd(),
    process.argv[2] ?? "bundle.config.ts",
  );
  if (!existsSync(configPath)) {
    return fail(
      `config not found: ${configPath}`,
    );
  }
  const mod: unknown = await import(
    pathToFileURL(configPath).href
  );
  const config = asBundleConfig(pickDefault(mod));
  const files = build(config);
  process.stdout.write(
    `plgg-bundle: wrote ${files.length} file(s) to ${config.outDir}\n`,
  );
};

/**
 * Extract a module's `default` export as `unknown`,
 * tolerating a module that is itself the config.
 */
const pickDefault = (mod: unknown): unknown =>
  typeof mod === "object" &&
  mod !== null &&
  "default" in mod
    ? mod.default
    : mod;

/**
 * Print an error and set a non-zero exit code.
 */
const fail = (message: string): void => {
  process.stderr.write(
    `plgg-bundle: ${message}\n`,
  );
  process.exitCode = 1;
};

try {
  await main();
} catch (e) {
  fail(
    e instanceof Error ? e.message : String(e),
  );
}
