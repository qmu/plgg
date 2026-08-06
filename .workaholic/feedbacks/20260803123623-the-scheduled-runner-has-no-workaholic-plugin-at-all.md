---
type: Feedback
title: The scheduled runner has no workaholic plugin at all
kind: concern
source: discussion
created_at: 2026-08-03T12:36:23+00:00
author: noreply@anthropic.com
supersedes: 
---

# The scheduled runner has no workaholic plugin at all

The 2026-08-03 scheduled run found the whole workaholic toolchain missing from its Claude Code on the web container. `.claude/settings.json` enables `workaholic@workaholic` from the `qmu/workaholic` marketplace, but `~/.claude/plugins/installed_plugins.json` is `{"version": 2, "plugins": {}}`, no marketplace clone exists anywhere on disk, and invoking `workaholic:propose` answers `Unknown skill`. The cause is in the environment itself: `SKIP_PLUGIN_MARKETPLACE=true` is exported into the container, so the marketplace is never fetched and `${CLAUDE_PLUGIN_ROOT}` is never bound. Every `/fb`, `/propose`, `/drive` and `/ship` firing on this runner therefore has no skills, no commands and no scripts unless the session clones `qmu/workaholic` by hand first — which is exactly the filesystem spelunking those commands forbid, done because the alternative is not running at all. This sits underneath the two concerns recorded on 2026-07-31: the same container also exports `CLAUDE_CODE_USER_EMAIL=a@qmu.jp` while `git config user.email` still reads `noreply@anthropic.com`, so the identity the queue readers need is present in the environment and simply not wired into git.
