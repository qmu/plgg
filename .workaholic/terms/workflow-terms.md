---
title: Workflow Terms
description: Definitions for development workflow and process terms used in the plgg project
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](workflow-terms.md) | [Japanese](workflow-terms_ja.md)

# Workflow Terms

## drive

A drive is a named git branch representing a unit of development work. Drive branches follow the naming convention `drive-<YYYYMMDD>-<HHMMSS>` (e.g., `drive-20260226-032733`), where the timestamp is the branch creation time. Each drive typically corresponds to one or more tickets archived under `.workaholic/tickets/archive/<branch-name>/`. When a drive is complete, its tickets are archived and the branch is merged to `main`.

## archive

Archive refers to the action of moving a completed ticket from its active location to `.workaholic/tickets/archive/<branch-name>/`. Archiving marks the work as done and preserves the ticket as a historical record linked to the branch that implemented it. The archive directory structure mirrors the drive naming convention, making it straightforward to trace all work done in a given branch by listing `.workaholic/tickets/archive/<branch-name>/`.

## blueprint

blueprint is a function in `plgg-foundry` (`src/plgg-foundry/src/Foundry/usecase/blueprint.ts`) that generates an `Alignment` from a `Foundry` configuration and an `Order`. It calls the LLM provider via `plgg-kit`'s `generateObject`, using the foundry's description and apparatus definitions to construct the system prompt. The resulting alignment is validated and returned as a `PromisedResult`. Blueprint is the AI planning phase in the two-phase `runFoundry` execution model (plan then operate).

## operate

operate is a function in `plgg-foundry` (`src/plgg-foundry/src/Foundry/usecase/operate.ts`) that executes an `Alignment` against a `Foundry` by walking the operation graph from `ingress` through each `Operation` node to `egress`. It maintains an `Env` register file that maps addresses to `Param` values and resolves apparatus names to their implementations at runtime. operate is the execution phase in `runFoundry`, called after `blueprint` produces the plan.

## release

A release is the act of assigning a version number and date to the `## [Unreleased]` entry in a package's CHANGELOG, tagging the commit, and publishing to npm. The plgg project uses an event-driven release cadence (not scheduled). The release readiness constraint requires all three packages (`plgg`, `plgg-foundry`, `plgg-kit`) to have their Unreleased entries finalized before the active release candidate PR (#6) merges to `main`. One git tag exists in the repository history: `2025.07.week1.release1`.

## housekeeping

Housekeeping is a ticket type (`type: housekeeping` in frontmatter) used for non-feature work such as version control hygiene, dependency management, configuration file tracking, and documentation updates. The `drive-20260226-032733` branch is classified as housekeeping (effort 0.1h) because it committed the previously untracked `.claude/settings.json` file without any code changes.
