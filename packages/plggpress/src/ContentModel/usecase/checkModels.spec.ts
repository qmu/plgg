import { test, check, toBe } from "plgg-test";
import { isOk, isErr, matchResult } from "plgg";
import { type ModelViolations } from "plggpress/ContentModel/model/ModelViolation";
import {
  contentModel,
  textField,
  numberField,
  bindModel,
} from "plggpress/ContentModel/model/ContentModel";
import {
  type Page,
  checkModels,
} from "plggpress/ContentModel/usecase/checkModels";

const model = contentModel("post", [
  textField("title"),
  numberField("order", false),
]);
const bindings = [bindModel("/blog/", model)];

const page = (
  path: string,
  source: string,
): Page => ({ path, source });

test("a clean corpus passes", () =>
  check(
    isOk(
      checkModels(
        [
          page(
            "/blog/a",
            "---\ntitle: A\norder: 1\n---\nbody",
          ),
          // outside the bound prefix — not checked
          page("/guide/x", "no frontmatter"),
        ],
        bindings,
      ),
    ),
    toBe(true),
  ));

test("a page failing its model is a violation", () =>
  check(
    isErr(
      checkModels(
        [
          page(
            "/blog/bad",
            "---\norder: notanumber\n---\nbody",
          ),
        ],
        bindings,
      ),
    ),
    toBe(true),
  ));

test("all violations are collected, not first-failure", () =>
  check(
    matchResult<null, ModelViolations, number>(
      (e: ModelViolations) => e.content.length,
      () => 0,
    )(
      checkModels(
        [
          page("/blog/one", "no frontmatter"),
          page(
            "/blog/two",
            "---\ntitle: 5\n---\nx",
          ),
        ],
        bindings,
      ),
    ),
    toBe(2),
  ));

test("a page under no binding is never checked", () =>
  check(
    isOk(
      checkModels(
        [page("/other/z", "anything at all")],
        bindings,
      ),
    ),
    toBe(true),
  ));
