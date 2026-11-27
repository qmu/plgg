# plgg-test — Run tests

From a package directory, run `npx plgg-test src` to discover `*.spec.ts` files under `src`. Add `--watch` to rerun tests as you edit, or `--coverage` to see which lines ran.

Save this test in `src/copies.spec.ts` and run it. Change the expected count to see how a failed comparison is reported.

```ts
import { check, test, toBe } from "plgg-test";

test("counts the copies", () => check(2 + 2, toBe(4)));
```
