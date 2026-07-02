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
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { loadConfig } from "plggpress/Config/usecase/loadConfig";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const fixture = (name: string): string =>
  join(here, "fixtures", name);

test("loadConfig validates a well-formed TS config", async () =>
  check(
    await loadConfig(fixture("valid.config.ts")),
    okThen((c: SiteConfig) =>
      toBe("plgg")(c.title),
    ),
  ));

test("loadConfig surfaces a ConfigLoadError for a malformed config", async () =>
  check(
    await loadConfig(
      fixture("invalid.config.ts"),
    ),
    errThen((e) =>
      toBe("ConfigLoadError")(e.__tag),
    ),
  ));

test("loadConfig returns Err for a missing path", async () =>
  check(
    await loadConfig(
      fixture("does-not-exist.config.ts"),
    ),
    shouldBeErr(),
  ));

test("loadConfig rejects a module with no default export", async () =>
  check(
    await loadConfig(
      fixture("named-only.config.ts"),
    ),
    errThen((e) =>
      toBe("ConfigLoadError")(e.__tag),
    ),
  ));
