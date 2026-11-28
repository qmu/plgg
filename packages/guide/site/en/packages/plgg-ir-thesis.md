# plgg-ir-thesis — Check an argumentation model

Pass assertions and their relationships to `compileThesis`. A successful compilation returns `nodes`, normalized `canonical` text, and the `surviving` set computed from the attack graph. Violations of frame rules, such as cycles in a temporal frame, produce diagnostics with source ranges. Compare outcomes in the [worked proof example](/packages/plgg-ir-thesis-proof/).

## Working with the API

`compileThesis(source) → Result<CompiledThesis, ReadonlyArray<SemDiagnostic>>`

surviving is the grounded extension of the attack graph. It describes relations in the model and does not establish the factual truth of a claim. Compare a second model with one attack removed to investigate its effect.

```ts
import { compileThesis } from "plgg-ir-thesis";

console.log(
  compileThesis("(unknown-form)").__tag,
);
```

## Check structure before evaluating survival

verifyThesis(nodes) checks analyzed assertions and frames, including cycles in temporal relations. `compileThesis` calls `groundedExtension`(nodes) only after those checks return no diagnostics. This keeps malformed models out of the survival calculation.

## Compare two models under one condition

Start with the severing model from the [worked proof](/packages/plgg-ir-thesis-proof/). Compare it with the version missing one attack. Both use the same language but only the complete example meets the requested severing condition.

```ts
import { compileThesis } from "plgg-ir-thesis";
import {
  COMPLETE_SEVERING,
  DOCTORED_SEVERING,
} from "plgg-ir-thesis-proof";
import assert from "node:assert/strict";

assert.equal(
  compileThesis(COMPLETE_SEVERING).__tag,
  "Ok",
);
assert.equal(
  compileThesis(DOCTORED_SEVERING).__tag,
  "Err",
);
```
