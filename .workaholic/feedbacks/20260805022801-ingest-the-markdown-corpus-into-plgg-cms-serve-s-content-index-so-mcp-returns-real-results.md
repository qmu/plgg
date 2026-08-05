---
type: Feedback
title: Ingest the Markdown corpus into plgg-cms serve's content index so /mcp returns real results
kind: instruction
source: slack
created_at: 2026-08-05T02:28:01+00:00
author: noreply@anthropic.com
supersedes: 
---

# Ingest the Markdown corpus into plgg-cms serve's content index so /mcp returns real results

Reported in Slack `#dev-plgg` and filed on `qmu/plgg` as issue #107: `plgg-cms serve` mounts an MCP endpoint at `/mcp` that answers the protocol correctly, but every tool it exposes returns an empty result, because `openIndex` creates the content-index schema and no code anywhere writes a row into it. The ask is to ingest the Markdown corpus the same instance renders into that served index, so `search_content`, `get_article` and `list_collections` answer over the documentation instead of over nothing. Archived ticket 16 named this exact step as its one remaining integration and deferred it on a synchronous serve seam; the report notes that seam is now asynchronous, which is why it is newly buildable. The ask reached this loop from the merge notification for PR #106, which added the ticket describing the gap.
