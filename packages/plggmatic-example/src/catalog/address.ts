import {
  type SoftStr,
  fromNullable,
  matchOption,
} from "plgg";
import { type Url } from "plgg-view/client";

/**
 * The catalog's address: `?p=<page>&c=<page>,<page>` — the
 * first open page, then the pages opened to its right. The
 * same shape the framework's document strip uses (a head
 * and the columns beside it), spelled in page ids because
 * this is one program, not a set of files.
 */
export const HOME = "overview";

const param = (
  url: Url,
  name: SoftStr,
): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => "",
    (value: SoftStr) => value,
  )(
    fromNullable(
      new URLSearchParams(url.search).get(name),
    ),
  );

/** The pages an address opens, as written (not yet checked). */
export const openOf = (
  url: Url,
): Readonly<{
  head: SoftStr;
  rest: ReadonlyArray<SoftStr>;
}> => ({
  head: param(url, "p"),
  rest: param(url, "c")
    .split(",")
    .filter((id: SoftStr) => id !== ""),
});

/** The address of a strip: the home page alone is the bare path. */
export const hrefOf = (
  path: SoftStr,
  head: SoftStr,
  rest: ReadonlyArray<SoftStr>,
): SoftStr =>
  head === HOME && rest.length === 0
    ? path
    : path +
      "?p=" +
      encodeURIComponent(head) +
      (rest.length === 0
        ? ""
        : "&c=" +
          rest.map(encodeURIComponent).join(","));
