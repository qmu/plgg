# Packed plgg-test consumer on Node 24

Run `sh scripts/build.sh`, then `sh scripts/gate-plgg-test-node24.sh`
with Node 24 on PATH. The gate installs local `plgg` and `plgg-test`
tarballs outside the workspace alongside consumer TypeScript 7.
It asserts that the runner resolves its own TypeScript 6, then runs
this single consumer fixture through the installed public CLI.

The enum requires transpilation, exercising the published loader hook
rather than only Node's native type stripping. A failing assertion,
loader error, missing packed artifact, or wrong compiler major fails
the gate. Temporary installs are removed on exit; no publishing occurs.
