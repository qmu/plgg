# Node 24 CI permission blocker

Run `node scripts/node24CiBlocker.ts` from any directory. It writes
`.artifacts/node24-ci-blocker.json` at the repository root and exits **1**
(blocked). A write failure also exits nonzero. The ignored local artifact
replaces old evidence atomically with mode 0600; retain it with local gate
results, not in git. It is independent of the consumer gate indexes.

This records the unresolved rejection documented in
[qmu/plgg#171](https://github.com/qmu/plgg/issues/171), not a live permission
probe. It never reads a token, invokes GitHub, saves raw errors or certifies
CI success. Running on Node 24 does not unblock CI. Once a maintainer resolves
#171, retire this fixed blocker rather than continuing to report stale state.

The JSON lists alternative credential types, not cumulative requirements:
GitHub App installation tokens and fine-grained PATs need repository Contents
write and Workflows write to push the workflow change, plus Pull requests write
to open its PR. A classic PAT needs `workflow` and `repo` for a private repo
(or `public_repo` for a public repo). Limit repository selection to qmu/plgg
where supported. An App permission change may require owner approval and a
new installation token. An authorized human may submit the change instead.
These are permission names only; never place credential values in evidence.

Workflow **runtime** permissions are separate: `contents: read` remains
sufficient for the existing test job. Changing that YAML permission cannot
grant the submitting credential permission to update workflows.

The intended follow-up is a `fail-fast: false` Node `22.x` / `24.x` matrix in
`.github/workflows/run-tests.yml`, with checkout/setup-node v5, leaving the
publish-oriented deploy-guide workflow single-pinned. Both matrix jobs must
pass on GitHub before claiming #171 complete. This change neither modifies a
workflow nor closes #171. Existing qmu/plgg#199 covers integration planning;
qmu/plgg#201 covers consumer outcomes, which cannot establish this permission.

Regression tests: `node --test scripts/node24CiBlocker.spec.ts`. They also run
through the existing `node --test scripts/*.spec.ts` phase of check-all.

Permission references: [repository contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
and [OAuth / classic PAT scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).
