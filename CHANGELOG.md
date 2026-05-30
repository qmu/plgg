# Changelog

All notable changes to the project root (tooling, scripts, CI) will be documented in this file.

## drive-20260226-032733

### Added

- Add .claude/settings.json to the repository ([30b2c95](https://github.com/qmu/plgg/commit/30b2c95d27821f70e9dba188e60f18d74d27eff9)) - [ticket](.workaholic/tickets/archive/drive-20260226-032733/20260226032724-add-claude-settings-json.md)

## [0.0.25] - Unreleased

### Added
- `changelog-updater` agent for automatically updating CHANGELOG.md based on staged git changes (orange)
- `readme-updater` agent for keeping README.md in sync with code changes (green)
- Update commit command to use changelog-updater and readme-updater subagents before committing
- New `plgg-kit` package that extracts LLM vendor integrations (OpenAI, Anthropic, Google) and generateObject utility from plgg-foundry
- Shell scripts for plgg-kit package: build, test, and type-check operations
