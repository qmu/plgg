# plgg-token-metering — Estimate token usage and cost

Read the variant returned by `countTokens(input)(counter)` to distinguish a BPE count from a calibrated estimate. Supply the vocabulary when using a BPE counter. Estimated counts carry accuracy information. Use `tokenBounds` for the interval and `projectCost` to project cost.

## Working with the API

`countTokens(input)(counter) → Result<TokenEstimate, MeteringError>`

Comparing a point estimate with a budget hides uncertainty. `tokenBounds` derives the lower bound from the maximum percentage error and the upper from the minimum, rounding outward. Match the vocabulary to the target model before projecting cost.

```ts
import { proc } from "plgg";
import {
  cardFor,
  countTokens,
  estimatorCounter,
  modelId,
  tokenBounds,
} from "plgg-token-metering";

console.log(
  await proc(
    cardFor(modelId("claude-sonnet-5")),
    (card) => estimatorCounter({ card }),
    countTokens({
      text: "Atlas",
      textClass: "english",
    }),
    tokenBounds,
  ),
);
```

## Report the evidence alongside the count

cardFor(modelId(...)) itself returns a Result. Stop on an unknown model rather than borrowing another model’s prices or tokenization rules. Use `estimateTokens`(estimate) for the count and `estimateAccuracy`(estimate) for the evidence behind its uncertainty.
