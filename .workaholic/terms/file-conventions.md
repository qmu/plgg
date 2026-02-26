---
title: File Conventions
description: Definitions for file naming patterns, directory conventions, and formatting rules used in the plgg project
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](file-conventions.md) | [Japanese](file-conventions_ja.md)

# File Conventions

## frontmatter

Frontmatter is the YAML block delimited by `---` at the top of a markdown document. In `.workaholic/` documents, frontmatter carries metadata such as `title`, `description`, `category`, `last_updated` (or `modified_at`), and `commit_hash`. For tickets, frontmatter includes `created_at`, `author`, `type`, `layer`, `effort`, and `category`. Frontmatter keys are kept in English even in translated documents; only the values are translated. The `commit_hash` field is updated to the short git hash at the time the document is last modified.

## translation counterpart

A translation counterpart is the `_ja.md` version of a primary English document in `.workaholic/`. For every `.md` file created or updated in `.workaholic/`, a corresponding `_ja.md` file must exist. This is enforced by the project documentation language constraint in `.workaholic/constraints/project.md`. Index files (`README.md`) also require a `README_ja.md` counterpart, and each language's index must link to documents in the same language (e.g., `README.md` links to `core-concepts.md`; `README_ja.md` links to `core-concepts_ja.md`).

## kebab-case

kebab-case is the required naming style for all files and directories in `.workaholic/`. File and directory names use lowercase letters with hyphens separating words (e.g., `core-concepts.md`, `project-context.md`, `drive-20260226-032733`). This convention applies to ticket filenames (`<timestamp>-<slug>.md`), spec filenames, constraint filenames, and terms filenames. Source code follows a separate convention: package category directories use PascalCase (`Atomics`, `Disjunctives`), while function names use lowerCamelCase.

## settings.local.json

settings.local.json is the personal Claude Code configuration override file at `.claude/settings.local.json`. Unlike `.claude/settings.json` (which is committed to version control and shared across contributors), `settings.local.json` is excluded from the repository via `.gitignore` (line 30). It is intended for developer-specific overrides such as personal API keys or local tool paths that should not be shared with other contributors.

## workaholic directory

The `.workaholic/` directory is the root of all structured project documentation managed by the workaholic tooling. It contains subdirectories for `constraints/`, `guides/`, `specs/`, `terms/`, and `tickets/`. All documents in this directory are written in English as the primary language with `_ja.md` translation counterparts required for every file. The workaholic plugin (`core@workaholic`) is configured in `.claude/settings.json` and provides skills (write-spec, write-terms, translate, etc.) used to author and maintain these documents.

## monorepo layout

The plgg monorepo places all publishable packages under `src/` with a flat structure: `src/plgg/`, `src/plgg-foundry/`, `src/plgg-kit/`, and `src/example/`. Each package has its own `tsconfig.json`, `vite.config.ts`, `package.json`, and `CHANGELOG.md`. TypeScript path aliases are declared per-package in `tsconfig.json`, mapping the package name to its `./src/*` directory so that cross-package imports resolve correctly during development. The root `sh/` directory contains shared shell scripts (`sh/tsc-plgg.sh`, `sh/test-plgg.sh`) that operate across all packages.
