import {
  test,
  check,
  errThen,
  toBe,
} from "plgg-test";
import { none } from "plgg";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { type PressOptions } from "plgg-press/Press/model/PressOptions";
import { dev } from "plgg-press/dev";

const config: SiteConfig = {
  title: "plgg",
  description: "d",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  home: none(),
  dev: { allowedHosts: [] },
};

const opts: PressOptions = {
  contentDir: "docs",
  outDir: "dist",
  assetsDir: "docs/public",
  config,
  base: "/",
  dev: true,
  allowedHosts: [],
};

test("dev is a typed NotImplemented stub for now", async () =>
  check(
    await dev(opts),
    errThen((e) =>
      toBe("NotImplementedError")(e.__tag),
    ),
  ));
