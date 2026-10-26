# Issue 157: live npm evidence

`node scripts/collectIssue157.mjs docs/issue-157-public-terminal.json`

This read-only collector acquires `plgg-view` from the explicit public npm
registry, pins the observed latest version, checks npm pack metadata and the
actual tarball SHA-512, installs that tarball into a disposable consumer, and
imports `plgg-view` and `plgg-view/client`. It rechecks latest after import;
changed tags or failed acquisition leave the prior dated snapshot untouched
and return a nonzero exit. A successful collection returns zero even when
closure is blocked: consult `canClose` and `conditions`, not the process exit.

The JSON is a single atomic replacement containing qmu/plgg#157, the canonical
implementation PR qmu/plgg#166 and its merge SHA, exact public version and npm
acquisition result, and all issue closure conditions. No private corpd request
identifier or authentication is persisted. The snapshot is historical evidence;
rerun before release decisions. Concurrent collectors are last-writer-wins;
serialize executions. This collector does not replace the multi-issue validation
boundaries proposed in qmu/plgg#236 and qmu/plgg#237.

The captured public release is **0.0.2**: `application` imports successfully,
but `lazy` is absent. The implementation merged as
`2ebc9e9b104067cb6b9ef146d565619fd64f1861`; merge alone does not satisfy
publication. Keep qmu/plgg#157 open. A developer must publish the newer release
using the repository release procedure, then verify frame dispatch coalescing,
lazy subtree reuse, and the corpd observation against that same public version.
These behavioral checks remain pending; this collector never infers their
success from imports or version numbers and cannot independently authorize
issue closure. An API collection failure is not a fresh blocked observation.

Run the failure and atomic replacement regressions with:

`node --test scripts/collectIssue157.spec.mjs`
