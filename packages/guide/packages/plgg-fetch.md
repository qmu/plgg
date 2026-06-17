# plgg-fetch

::: info Page stub
This page's content is authored in **T5 — the HTTP
stack**. T1 reserves its place in the information
architecture.
:::

`plgg-fetch` is a typed HTTP client built from scratch
on plgg — the symmetric peer of
[plgg-server](/packages/plgg-server). Both share
[plgg-http](/packages/plgg-http)'s model: `fetch` is a
seam, and errors are values
(`PromisedResult<HttpResponse, ClientError>`).
