---
type: Feedback
title: The documented `/mcp` auth posture still does not match what ships
kind: concern
source: development
created_at: 2026-08-05T11:25:21+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: the-documented-mcp-auth-posture-still
owner: 
mission: []
tickets: [20260805035133-ingest-markdown-corpus-into-the-served-content-index.md]
origin_pr: 108
origin_pr_url: https://github.com/qmu/plgg/pull/108
origin_branch: work-20260805-104535
origin_commit: 3fa95f4e
last_seen: 2026-08-05T11:25:21+09:00
---

# The documented `/mcp` auth posture still does not match what ships

## Description

`agent-surfaces.md` describes `/mcp` as an OAuth 2.1 resource server separating `plggpress:read` from `plggpress:write` scopes, but `pressServer.ts` mounts the unguarded `mcpWeb`, and `mcpWebGuarded` has no caller outside its own spec (see [12a230bb](https://github.com/qmu/plgg/commit/12a230bb) in `packages/plgg-cms/src/mcp/mcpWeb.ts`). This branch documented the gap rather than closing it, because the read tools are genuinely public by the progressive-lighting decision and there are no write tools registered to gate. It becomes real the moment a write tool is added.

## How to Fix

Either wire `mcpWebGuarded` with a `resolveWrite` bearer→scope check before the first write tool is registered, or amend the roadmap text so the guarded variant is documented as unbuilt rather than as shipped.
