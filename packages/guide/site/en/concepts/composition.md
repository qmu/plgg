# Compose functions with pipe and flow

`pipe` processes its first argument immediately. `flow` builds a function you can reuse on other inputs. Both expressions below return `5`. When the input is a [Result](/concepts/result/), follow it with a function that accepts a Result, such as `mapResult`.

```ts
import { flow, pipe } from "plgg";

const trim = (s: string) => s.trim();
const length = (s: string) => s.length;
console.log(pipe(" Atlas ", trim, length));
console.log(flow(trim, length)(" Atlas "));
```
