# Public corpd consumer acceptance gate

After integrating qmu/plgg#155, qmu/plgg#156, qmu/plgg#157 and
qmu/plgg#158, run from a workspace installed with `npm ci`:

```sh
node scripts/gate-corpd-consumer.mjs
```

Node **24** is required; the isolated consumer installs **typescript@7.0.2**
under its normal name (no tsgo alias). This entry builds and packs plgg-bundle,
plgg, plgg-test and plgg-view, installs their real tarballs outside the workspace,
checks consumer imports and code with TS7, runs two app builds in the same directory,
and executes the packed DOM runner against frame/lazy and SVG/raw assertions.
No workspace aliases or sibling source imports are configured in the consumer.
The SVG test uses typed `el` builders, keeping SVG a direct child of its container.
Raw markup is checked for DOM identity, without assuming a wrapper-free raw API.

Fixed output layout, replaced on every run (including failures):

- `.corpd-consumer/latest/result.json`: revision, runtime, compiler, tarball
  SHA-256 values, ordered step exit codes and overall pass/fail.
- `.corpd-consumer/latest/gate.log`: all command output and final verdict.
- `.corpd-consumer/latest/tarballs/*.tgz`: the exact four tested packages.
- `.corpd-consumer/latest/consumer-lock.json`: the actual npm dependency tree
  (available once installation succeeds).

Archive that directory together. A missing step or a failed result is not release
acceptance. This gate tests local packed candidates; publishing and then testing
registry versions remains a separate release action. It does not publish, bump
versions, merge existing PRs, or close the four issues.

This is the combined four-issue behavioral scenario, not a replacement for
qmu/plgg#191 (`scripts/tsc-plgg.sh --public-consumer`), which owns family-wide
public import checks and its own evidence artifact. Like that gate, this fixture
uses `skipLibCheck: true`: it checks consumer code, not declaration internals.
qmu/plgg#201 and its follow-ups own the live registry/CI result index; this
local-candidate result does not assert registry or CI completion.

Existing implementation ownership (reviewed before adding this entry):
qmu/plgg#212 consolidates #190/#211 for #155; #165/#179 cover the bundle
TS7 consumer, #189 covers consumer declarations; #166 owns frame/lazy and
#164 owns SVG/raw. #174 and #186 add other packed-consumer gates.
This entry adds one combined acceptance scenario rather than copying those fixes
or invoking every overlapping standalone gate. Until those changes are integrated,
the combined gate is expected to fail and retain its failure artifacts.

Runner regression tests: `node --test scripts/gate-corpd-consumer.spec.mjs`.
The public gate is intentionally opt-in while its prerequisite PRs are open.
