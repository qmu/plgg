# plgg-token-metering — Estimate token usage and cost

Read the variant returned by `countTokens(input)(counter)` to distinguish a BPE count from a calibrated estimate. Supply the vocabulary when using a BPE counter. Estimated counts carry accuracy information. Use `tokenBounds` for the interval and `projectCost` to project cost.
