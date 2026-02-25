---
title: Artifacts
description: Definitions for project artifacts including tickets, specs, changelogs, and configuration files
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](artifacts.md) | [Japanese](artifacts_ja.md)

# Artifacts

## ticket

A ticket is a structured markdown document in `.workaholic/tickets/` that describes a unit of work. Each ticket has YAML frontmatter with fields including `created_at`, `author`, `type`, `layer`, `effort`, `commit_hash`, and `category`. Tickets begin as active entries and are archived to `.workaholic/tickets/archive/<branch-name>/` once the work is complete. The filename convention is `<timestamp>-<slug>.md` (e.g., `20260226032724-add-claude-settings-json.md`). Tickets serve as the primary record linking a git branch to the intent behind its changes.

## spec

A spec is a structured reference document in `.workaholic/specs/` that captures an architectural viewpoint of the project. The plgg project maintains viewpoints for application behavior, component structure, feature inventory, use cases, and project context. Spec files follow the frontmatter convention with `title`, `description`, `category`, `modified_at`, and `commit_hash` fields. Each English spec has a corresponding `_ja.md` translation counterpart, and each directory has a `README.md` and `README_ja.md` index linking to its documents.

## changelog

A changelog is the `CHANGELOG.md` file maintained at the root of each publishable package (`src/plgg/`, `src/plgg-foundry/`, `src/plgg-kit/`). It follows Keep a Changelog conventions with `## [Unreleased]` and versioned sections. An Unreleased entry must be replaced with a dated release entry before a package version merges to `main` — this is a project constraint documented in `.workaholic/constraints/project.md`. Currently all three packages have Unreleased entries, blocking the release candidate PR #6.

## settings.json

settings.json refers specifically to `.claude/settings.json`, the project-level Claude Code configuration file committed to the repository root under `.claude/`. It contains shared configuration that applies to all contributors, including permission deny rules (e.g., `Bash(git -C:*)` to prevent out-of-directory git operations), environment variable declarations (`CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`), marketplace registration for the workaholic plugin, and enabled plugin declarations. This file is tracked in version control; personal overrides go in `.claude/settings.local.json`, which is listed in `.gitignore`. The file was committed in the `drive-20260226-032733` branch as housekeeping.

## constraint

A constraint is a structured rule document in `.workaholic/constraints/` that bounds project decisions and behaviors. Each constraint entry has a Name, Bounds, Rationale, Affects, Criterion, and Review trigger. The plgg project currently maintains constraints covering TypeScript type safety (forbidding `as`/`any`/`ts-ignore`), compilation and test gates, release readiness, dependency currency, package scope stability, and documentation language (English primary with `_ja.md` translations). Constraints are owned by the project-manager role and affect named leader or developer roles.
