---
type: Feedback
title: Move the guide to Cloudflare Workers with a staging-plgg.qmu.co.jp staging surface
kind: instruction
source: discussion
subject: person:a@qmu.jp
created_at: 2026-08-18T07:18:35+00:00
author: a@qmu.jp
supersedes: 20260817210723-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-guide-qmu-dev-staging-surface.md
---

# Move the guide to Cloudflare Workers with a staging-plgg.qmu.co.jp staging surface

# Move the guide to Cloudflare Workers with a staging-plgg.qmu.co.jp staging surface

Source: https://github.com/qmu/plgg/issues/119

ガイド(`packages/guide`、本番 https://plgg.qmu.co.jp/)の配信について 2 点の指示。(1) ステージングは `staging-plgg.qmu.co.jp` で提供する — 本番と同じ `qmu.co.jp` 配下に揃え、1 階層なので Universal SSL の `*.qmu.co.jp` でカバーされる。`qmu.co.jp` ゾーンの DNS はコーポレートリポジトリの `infra/terraform/cloudflare-dns/` で Terraform 管理。(2) 本番は GitHub Pages(現行の `.github/workflows/deploy-guide.yml` → `actions/deploy-pages`)をやめ、main へのマージ時に自動で Cloudflare Worker にデプロイされる構成へ移行する。qmu-co-jp の `packages/site` が既に `wrangler deploy` で Worker 配信している形が参考になる。

この記録は初版 `20260817210723-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-guide-qmu-dev-staging-surface.md` を supersede する。ステージングのホスト名が発注者指示で `staging-plgg-guide.qmu.dev` から `staging-plgg.qmu.co.jp` に変更され、DNS の管理場所(コーポレートリポジトリの Terraform)が新たに示されたため。
