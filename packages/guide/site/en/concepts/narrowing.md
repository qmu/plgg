# Supply evidence for a narrower type

An unknown JSON or form value cannot yield a title until you check it. Use `typeof` for primitives, `instanceof` for DOM element classes, and the matching isX guard for a tagged value and its payload.

## Distinguish validation from inference

Run a caster when the value still needs checking. When it has already been checked and a higher-order function lacks context, annotate the callback parameter. TypeScript checks the `Str` annotation below against the successful output of asStr. No assertion about the caller’s input is needed.

```ts
import {
  asStr,
  mapResult,
  pipe,
  type Str,
} from "plgg";

const length = (raw: unknown) =>
  pipe(
    asStr(raw),
    mapResult((s: Str) => s.content.length),
  );

console.log(length("Atlas"), length(17));
```

## Narrow a browser element

A `querySelector` result alone establishes neither presence nor the element kind. An `instanceof` check makes value available on the matching branch. This belongs at the browser boundary. The spec runs in the DOM environment supplied by plgg-test.

```ts
// @plgg-test-environment dom
import { none, some } from "plgg";
import { check, test, toEqual } from "plgg-test";

const read = (root: HTMLElement) => {
  const field = root.querySelector("input");
  return field instanceof HTMLInputElement
    ? some(field.value)
    : none();
};

test("reads a mounted input", () => {
  const field = document.createElement("input");
  field.value = "Atlas";
  document.body.appendChild(field);
  return check(
    read(document.body),
    toEqual(some("Atlas")),
  );
});
```
