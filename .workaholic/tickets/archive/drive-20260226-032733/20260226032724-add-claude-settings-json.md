---
created_at: 2026-02-26T03:27:24+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort: 0.1h
commit_hash: 30b2c95
category: Added
---

# Add .claude/settings.json to the repository

## Overview

Commit the existing untracked `.claude/settings.json` file to version control. This file configures project-level Claude Code settings that should be shared across all contributors, including permission deny rules, environment variables, marketplace configuration, and enabled plugins.

## Key Files

- `.claude/settings.json` - The untracked project-level Claude Code settings file to be committed
- `.gitignore` - Already configured to ignore `.claude/settings.local.json` (line 30) but not `.claude/settings.json`, confirming project settings are intended to be tracked

## Related History

The `.claude/` directory has extensive commit history with commands and agents already tracked. The earliest commit (`8c5899c`) added Claude commit command configuration, and subsequent commits added commands, agents, and documentation. The `settings.json` file is the only remaining untracked file in `.claude/`.

Past commits that touched the `.claude/` directory:

- `79fe0f5` - Add Claude Code documentation and custom commands
- `575b844` - Update Claude commands configuration
- `8c5899c` - Add Claude commit command configuration
- `64cf530` - Add project gitignore configuration (added `.claude/settings.local.json` to `.gitignore`)

## Implementation Steps

1. Stage `.claude/settings.json` with `git add .claude/settings.json`
2. Commit with a message describing the settings being added

## Considerations

- The `.gitignore` already excludes `.claude/settings.local.json` for personal overrides, so committing `settings.json` as shared project config follows the intended pattern (`.gitignore` line 30)
- The permission deny rule `Bash(git -C:*)` prevents Claude from running git commands with `-C` flag, which could operate on directories outside the project
- Environment variable `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` keeps bash commands rooted in the project directory
- Environment variable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enables experimental agent teams feature
- The workaholic plugin marketplace and `core@workaholic` plugin are configured, which is consistent with the project's use of workaholic tooling (`.workaholic/` directory structure)

## Final Report

Staged and committed `.claude/settings.json` which was the only untracked file in the `.claude/` directory. The file contains project-level Claude Code configuration (permission deny rules, environment variables, marketplace and plugin settings). No code changes were needed — this was purely a version control housekeeping task. All 338 tests pass, TypeScript compiles cleanly.
