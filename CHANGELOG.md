# Changelog

All notable changes to the project root (tooling, scripts, CI) will be documented in this file.

## [0.0.25] - Unreleased

### Added
- `changelog-updater` agent for automatically updating CHANGELOG.md based on staged git changes (orange)
- `readme-updater` agent for keeping README.md in sync with code changes (green)
- Update commit command to use changelog-updater and readme-updater subagents before committing
