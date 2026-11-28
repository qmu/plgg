# plgg-ir-thesis-proof — Read a counterexample

After building the workspace, run `npm run prove` in `packages/plgg-ir-thesis-proof`. The report shows a complete rebuttal and another with one attack removed. Compare the `accept` result with the counterexample to see which missing relation breaks the severing or coverage condition.

## Working with the API

`proofReport() → ReadonlyArray<SoftStr>`

The report is a list of lines, usable outside the CLI. Severing asks whether a path remains from premise to root. Coverage checks whether the required relations were attacked. Trace the surviving relation and diagnostic range back to the model.

```ts
import { proofReport } from "plgg-ir-thesis-proof";

console.log(proofReport().join("\n"));
```

## Vary one relation at a time

Compare COMPLETE_SEVERING with DOCTORED_SEVERING for severing, and COMPLETE_COVERAGE with DOCTORED_COVERAGE for coverage. Compare each complete example with its own modified version first. Comparing across both condition and example would confound the effects.
