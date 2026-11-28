# plgg-flow-example — Exercise diagrams from manuscripts

Compare diagram source with rendered results in the [gallery](https://plgg-flow.qmu.co.jp/en/). The two editions live in markdown and markdown-en. `src/examples.spec.ts` finds sample pages via the sidebar, extracts fences and passes them to `parseSpec` to inspect actual nodes and edges. Run `npm test` after adding a sample and `npm run build` to generate the site.
