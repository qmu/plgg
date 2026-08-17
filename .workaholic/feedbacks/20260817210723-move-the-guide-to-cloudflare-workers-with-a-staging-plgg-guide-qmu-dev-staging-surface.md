---
type: Feedback
title: Move the guide to Cloudflare Workers with a staging-plgg-guide.qmu.dev staging surface
kind: instruction
source: discussion
subject: person:a@qmu.jp
created_at: 2026-08-17T21:07:23+09:00
author: a@qmu.jp
supersedes: 
---

# Move the guide to Cloudflare Workers with a staging-plgg-guide.qmu.dev staging surface

# Move the guide to Cloudflare Workers with a staging-plgg-guide.qmu.dev staging surface

ガイド(packages/guide、本番 https://plgg.qmu.co.jp/)の配信について 2 点の指示。(1) ステージングは `staging-plgg-guide.qmu.dev` で提供する — ホスト名は 1 階層(Universal SSL の `*.qmu.dev` でカバーされる範囲)とし、`staging-` を接頭辞にするのはブラウザの検索候補で staging 系ホストがまとまって選びやすいため。(2) 本番は GitHub Pages(現行の `.github/workflows/deploy-guide.yml` → actions/deploy-pages)をやめ、main へのマージ時に自動で Cloudflare Worker にデプロイされる構成へ移行する。qmu-co-jp の packages/site が既に wrangler deploy で Worker 配信している形が参考になる。
