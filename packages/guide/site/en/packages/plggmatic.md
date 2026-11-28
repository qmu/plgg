# plggmatic — Choose components for a view

plggmatic supplies components and layouts that produce [plgg-view](/packages/plgg-view/) `Html` values. `plggmatic-example` demonstrates how they fit together. Browse the [plggmatic catalog](https://plggmatic.qmu.co.jp/en/) to see the components in context.

## Working with the API

`button<Msg>(props: ButtonProps<Msg>) → Html<Msg, "button">`

Supply a label, a message to emit on press and the disabled state. The program receiving the message changes the model. A disabled button gets a native disabled attribute and no click handler. Compose components with declarations and layouts for screens that open columns horizontally. Theme functions live under plggmatic/style.

```ts
import { button } from "plggmatic";
import { renderToString } from "plgg-view";

console.log(
  renderToString(
    button({
      label: "Save",
      onPress: "Save",
      disabled: true,
    }),
  ),
);
```

## Test the rendered control

A component can be tested before mounting a screen. When registration must be disabled until a required field is filled, inspect the disabled attribute. Test the model transition after an accepted message separately. For a mounted example see the [reference application](/packages/plggmatic-example/).

```ts
import { button } from "plggmatic";
import { renderToString } from "plgg-view";
import {
  check,
  test,
  toContain,
} from "plgg-test";

test("an incomplete form disables registration", () =>
  check(
    renderToString(
      button({
        label: "Register",
        disabled: true,
        onPress: "Register",
      }),
    ),
    toContain("disabled"),
  ));
```
