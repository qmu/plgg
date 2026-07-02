import {
  Box,
  box,
  pattern,
  isBoxWithTag,
} from "plgg/index";

/**
 * Collapses the four-fold Box-variant scaffold
 * (type + constructor + `$` matcher + guard)
 * into one call, single-sourcing the tag literal.
 *
 * `defineVariant("Xxx")<Payload>()` returns
 * `{ tag, make, pattern, is }`:
 * - `make(content)` builds the `Box<"Xxx", Payload>`,
 * - `pattern()` is the tag matcher for `match`,
 * - `is` guards a `"Xxx"`-tagged box,
 * - `tag` is the literal `"Xxx"`.
 *
 * `is` narrows to `Box<TAG, unknown>` (a tag
 * check, not a content check) — the honest,
 * escape-hatch-free signature. Derive the full
 * variant type from `make`:
 * `type Xxx = ReturnType<typeof Xxx.make>`.
 *
 * The `const TAG` keeps the tag literal, so the
 * variant brands as `Box<"Xxx", …>`, not
 * `Box<string, …>`.
 */
export const defineVariant =
  <const TAG extends string>(tag: TAG) =>
  <CONTENT>() => ({
    tag,
    make: (
      content: CONTENT,
    ): Box<TAG, CONTENT> => box(tag)(content),
    pattern: () => pattern(tag)(),
    is: isBoxWithTag(tag),
  });
