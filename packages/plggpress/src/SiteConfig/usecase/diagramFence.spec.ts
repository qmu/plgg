import { test, check, toBe } from "plgg-test";
import { renderToString, text } from "plgg-view";
import {
  islandFence,
  type Part,
} from "plggpress/SiteConfig/usecase/diagramFence";

const part = (lazy: boolean): Part => ({
  name: "plgg-flow",
  render: () => text("drawn"),
  css: "",
  runtime: "./runtime.mjs",
  lazy,
});
const waits = (
  lazy: boolean,
  info: string,
): boolean =>
  renderToString(
    islandFence(part(lazy))("a -> b", info),
  ).includes("data-island-lazy");

test("a lazy part's block with no options waits to be reached for", () =>
  check(waits(true, "plgg-flow"), toBe(true)));

test("a block with options needs its runtime to be what was asked for, so it does not wait", () =>
  check(
    waits(true, "plgg-flow fill dsl"),
    toBe(false),
  ));

test("a block whose options were left out altogether waits too", () =>
  check(waits(true, ""), toBe(true)));

test("a part that is not lazy never waits", () =>
  check(waits(false, "plgg-flow"), toBe(false)));
