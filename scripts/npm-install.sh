#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# ONE root install for the whole monorepo (ticket 20260721180002).
#
# This was 39 sequential `npm install`s, one per package, because the repo had
# no root manifest and the packages cross-linked with `file:../` specifiers.
# That shape had two costs beyond the wall clock: every package resolved and
# wrote its OWN node_modules (1.4G of near-duplicates across the tree), and a
# `file:` link does not install the linked package's dependencies — so a
# package's `node_modules/.bin` could come out empty and a build would fail
# with `plgg-bundle: command not found` on a tree that looked installed.
#
# npm workspaces resolves the whole graph once: the workspace packages become
# symlinks in the root `node_modules`, their shared dependencies hoist beside
# them, every bin lands in the root `node_modules/.bin` where Node's upward
# walk finds it from any package, and there is one lockfile.
#
# Measured on this repo, warm npm cache: 22.4s -> 4.6s, and 1.4G -> 403M.
#
# The `file:../` specifiers in each package.json are UNCHANGED and still
# correct — npm resolves a `file:` dependency naming a workspace member to that
# member. They document the dependency graph, and `scripts/build.sh` still
# orders the builds by it.
echo "=== Installing the workspace (root package.json, packages/*) ==="
npm install
