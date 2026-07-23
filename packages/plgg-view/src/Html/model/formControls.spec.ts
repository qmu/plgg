import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { renderToString } from "plgg-view/Html/usecase/renderToString";
import {
  textarea,
  select,
  option,
  label,
  text,
} from "plgg-view/Html/model/element";
import {
  attr,
  placeholder_,
  id_,
  for_,
  checked_,
  disabled_,
  value_,
  type_,
} from "plgg-view/Html/model/Attribute";
import { input } from "plgg-view/Html/model/element";

test("textarea renders its text value", () =>
  check(
    renderToString(
      textarea(
        [placeholder_("Notes…")],
        [text("draft body")],
      ),
    ),
    toBe(
      '<textarea placeholder="Notes…">draft body</textarea>',
    ),
  ));

test("select wraps its options", () =>
  all([
    check(
      renderToString(
        select(
          [id_("role")],
          [
            option([value_("a")], [text("Admin")]),
            option([value_("g")], [text("Guest")]),
          ],
        ),
      ).startsWith('<select id="role">'),
      toBe(true),
    ),
    check(
      renderToString(
        select(
          [],
          [option([value_("a")], [text("Admin")])],
        ),
      ).includes(
        '<option value="a">Admin</option>',
      ),
      toBe(true),
    ),
  ]));

test("label associates with a control via for_/id_", () =>
  check(
    renderToString(
      label([for_("email")], [text("Email")]),
    ),
    toBe('<label for="email">Email</label>'),
  ));

test("checked_ is present when on, absent when off", () =>
  all([
    check(
      renderToString(
        input(
          [type_("checkbox"), ...checked_(true)],
          [],
        ),
      ).includes("checked"),
      toBe(true),
    ),
    check(
      renderToString(
        input(
          [type_("checkbox"), ...checked_(false)],
          [],
        ),
      ).includes("checked"),
      toBe(false),
    ),
  ]));

test("disabled_ is present when true, absent when false", () =>
  all([
    check(
      renderToString(
        input([...disabled_(true)], []),
      ).includes("disabled"),
      toBe(true),
    ),
    check(
      renderToString(
        input([...disabled_(false)], []),
      ).includes("disabled"),
      toBe(false),
    ),
  ]));

test("placeholder_ and id_ are thin sugar over attr", () =>
  all([
    check(
      renderToString(
        input([placeholder_("x")], []),
      ),
      toBe(
        renderToString(
          input([attr("placeholder", "x")], []),
        ),
      ),
    ),
    check(
      renderToString(input([id_("y")], [])),
      toBe(
        renderToString(
          input([attr("id", "y")], []),
        ),
      ),
    ),
  ]));
