import {
  test,
  check,
  errThen,
  toBe,
} from "plgg-test";
import { none } from "plgg";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { type PressOptions } from "plgg-press/Press/model/PressOptions";
import { build } from "plgg-press/build";

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
  dev: false,
  allowedHosts: [],
};

test("build is a typed NotImplemented stub for now", async () =>
  check(
    await build(opts),
    errThen((e) =>
      toBe("NotImplementedError")(e.__tag),
    ),
  ));
