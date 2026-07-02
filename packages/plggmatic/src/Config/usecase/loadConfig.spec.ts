import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  test,
  check,
  toBe,
  okThen,
  shouldBeErr,
  errThen,
} from "plgg-test";
import {
  type SoftStr,
  type Result,
  type InvalidError,
  asObj,
  asSoftStr,
  forProp,
  cast,
} from "plgg";
import { loadConfig } from "plggmatic/Config/usecase/loadConfig";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const fixture = (name: string): string =>
  join(here, "fixtures", name);

// A minimal app-supplied caster: the framework's loadConfig
// is generic over exactly this shape.
type Cfg = Readonly<{ name: SoftStr }>;
const asCfg = (
  value: unknown,
): Result<Cfg, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("name", asSoftStr),
  );

test("loadConfig validates a well-formed TS config through the injected caster", async () =>
  check(
    await loadConfig(
      fixture("valid.config.ts"),
      asCfg,
    ),
    okThen((c: Cfg) =>
      toBe("plggmatic")(c.name),
    ),
  ));

test("loadConfig surfaces a ConfigLoadError for a config the caster rejects", async () =>
  check(
    await loadConfig(
      fixture("invalid.config.ts"),
      asCfg,
    ),
    errThen((e) =>
      toBe("ConfigLoadError")(e.__tag),
    ),
  ));

test("loadConfig returns Err for a missing path", async () =>
  check(
    await loadConfig(
      fixture("does-not-exist.config.ts"),
      asCfg,
    ),
    shouldBeErr(),
  ));

test("loadConfig falls back to the module object when there is no default export (then the caster rejects)", async () =>
  check(
    await loadConfig(
      fixture("named-only.config.ts"),
      asCfg,
    ),
    errThen((e) =>
      toBe("ConfigLoadError")(e.__tag),
    ),
  ));

test("loadConfig returns Err when the config throws a non-Error at eval", async () =>
  check(
    await loadConfig(
      fixture("throws.config.ts"),
      asCfg,
    ),
    shouldBeErr(),
  ));
