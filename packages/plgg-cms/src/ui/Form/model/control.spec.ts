import {
  test,
  check,
  toEqual,
} from "plgg-test";
import { controlKinds } from "plgg-cms/ui/Form/model/control";

test("the control kinds are enumerated", () =>
  check(
    controlKinds,
    toEqual([
      "text",
      "textarea",
      "select",
      "checkbox",
    ]),
  ));
