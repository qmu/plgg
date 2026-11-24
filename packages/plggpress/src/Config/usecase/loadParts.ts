import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  resolve,
  dirname,
  isAbsolute,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import {
  type Option,
  type Result,
  ok,
  err,
} from "plgg";
import {
  configLoadError,
  type ConfigLoadError,
} from "plggpress/framework";
import {
  builtins,
  type Part,
} from "plggpress/SiteConfig/usecase/diagramFence";

const isPart = (value: unknown): value is Part =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  /^[a-zA-Z0-9_-]+$/.test(value.name) &&
  "render" in value &&
  typeof value.render === "function" &&
  "runtime" in value &&
  typeof value.runtime === "string" &&
  "css" in value &&
  typeof value.css === "string";

// Node resolves conditional ESM exports relative to the importing module.
// For a package entry, run its resolver in the site's directory.
const resolveRuntime = (
  dir: string,
  specifier: string,
): string => {
  const local = resolve(dir, specifier);
  return isAbsolute(specifier) ||
    specifier.startsWith(".") ||
    existsSync(local)
    ? local
    : fileURLToPath(
        execFileSync(
          process.execPath,
          [
            "--input-type=module",
            "--eval",
            "process.stdout.write(import.meta.resolve(process.argv[1]))",
            "--",
            specifier,
          ],
          { cwd: dir, encoding: "utf8" },
        ),
      );
};

export const loadParts = async (
  config: string,
  override: Option<string>,
): Promise<
  Result<readonly Part[], ConfigLoadError>
> => {
  const dir = dirname(resolve(config));
  const path =
    override.__tag === "Some"
      ? resolve(override.content)
      : resolve(dir, "site.parts.ts");
  if (
    override.__tag === "None" &&
    !existsSync(path)
  )
    return ok(builtins);
  try {
    const value: unknown = (
      await import(pathToFileURL(path).href)
    ).default;
    if (
      typeof value !== "object" ||
      value === null ||
      !("parts" in value) ||
      !Array.isArray(value.parts) ||
      !value.parts.every(isPart)
    )
      return err(
        configLoadError({
          message: "Invalid parts in " + path,
        }),
      );
    const parts = new Map(
      builtins.map((part) => [part.name, part]),
    );
    for (const part of value.parts) {
      const runtime = resolveRuntime(
        dir,
        part.runtime,
      );
      if (!existsSync(runtime))
        return err(
          configLoadError({
            message:
              "Missing part runtime " + runtime,
          }),
        );
      parts.set(part.name, {
        ...part,
        runtime: pathToFileURL(runtime).href,
      });
    }
    return ok([...parts.values()]);
  } catch (error) {
    return err(
      configLoadError({
        message: path + ": " + String(error),
      }),
    );
  }
};
