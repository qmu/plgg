import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { InvalidError, ok } from "plgg";
import {
  Dialect,
  Language,
  declaresNothing,
  defineOperator,
  fixedSignature,
} from "plgg-ir-language/domain/model/Language";
import { booleanType } from "plgg-ir-language/domain/model/SemType";
import { compose } from "plgg-ir-language/domain/usecase/compose";

type Node = Readonly<{ tag: string }>;

const dialect = (
  name: string,
  formName: string,
  opName: string,
): Dialect<Node> => ({
  name,
  forms: [
    {
      name: formName,
      declare: declaresNothing,
      analyze: () => ok({ tag: formName }),
    },
  ],
  operators: [
    defineOperator(
      opName,
      fixedSignature([], booleanType),
    ),
  ],
  expanders: [],
  normalizers: [],
});

test("compose concatenates disjoint dialects", () =>
  check(
    compose(
      dialect("core", "def", "and"),
      dialect("web", "view", "or"),
    ),
    okThen((language: Language<Node>) =>
      all([
        check(
          language.forms.map((f) => f.name),
          toEqual(["def", "view"]),
        ),
        check(
          language.operators.map((o) => o.name),
          toEqual(["and", "or"]),
        ),
      ]),
    ),
  ));

test("composing zero dialects is an empty language", () =>
  check(
    compose<Node>(),
    okThen((language: Language<Node>) =>
      check(language.forms, toEqual([])),
    ),
  ));

test("a name collision is a composition error", () =>
  all([
    check(
      compose(
        dialect("a", "def", "and"),
        dialect("b", "def", "or"),
      ),
      errThen((e: InvalidError) =>
        check(
          e.content.message,
          toBe(
            "dialect composition collides on: form def",
          ),
        ),
      ),
    ),
    check(
      compose(
        dialect("a", "def", "and"),
        dialect("b", "view", "and"),
      ),
      errThen((e: InvalidError) =>
        check(
          e.content.message,
          toBe(
            "dialect composition collides on: operator and",
          ),
        ),
      ),
    ),
  ]));

test("expander and normalizer collisions are also errors", () => {
  const extra = (
    name: string,
  ): Dialect<Node> => ({
    name,
    forms: [],
    operators: [],
    expanders: [
      {
        name: "flag",
        apply: (form) => ok(form),
      },
    ],
    normalizers: [
      { name: "sort", apply: (exp) => exp },
    ],
  });
  return check(
    compose(extra("a"), extra("b")),
    errThen((e: InvalidError) =>
      check(
        e.content.message,
        toBe(
          "dialect composition collides on: expander flag, normalizer sort",
        ),
      ),
    ),
  );
});
