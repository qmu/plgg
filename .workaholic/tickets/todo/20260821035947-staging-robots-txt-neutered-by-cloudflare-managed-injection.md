---
created_at: 2026-08-21T03:59:47+09:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy: auto
verification_handoff: ゾーン設定の特定と変更に Cloudflare ダッシュボード(アカウント qmu)へのアクセスが要り、無人実行の環境には無い
---

# staging の robots.txt が Cloudflare の managed robots.txt に無効化されうる

## Overview

`staging-plgg.qmu.co.jp` の `/robots.txt` は `worker/staging.ts` が
`User-agent: *\nDisallow: /\n` を返す設計だが、実際に配信されている本文はそれだけではない。
Cloudflare がゾーン設定由来の managed robots.txt を注入しており、Worker の応答の**手前**に
以下が入る(2026-08-19 実測):

```
# BEGIN Cloudflare Managed content
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot
Disallow: /
...(GPTBot / CCBot / ClaudeBot / Google-Extended 等の個別 Disallow)
# END Cloudflare Managed Content

User-agent: *
Disallow: /          <- ここが Worker の応答
```

RFC 9309 は同一 user-agent のグループをマージすると定めており、`Allow: /` と `Disallow: /` は
パス長が同じで競合する。同長競合時の優先規則により **Allow が勝ちうる**ため、Worker 側の
全面 Disallow が意図どおりに効いていない可能性がある。

**実害は出ていない。** `x-robots-tag: noindex, nofollow, noarchive` は正しく付いており、
主要クローラはこちらを優先して従うので、staging がインデックスされる状態にはなっていない。
つまりこれは「二重の防御のうち片方が沈黙している」問題であって、露出事故ではない。

この注入は **2026-08-19 の proxied 化で新たに効き始めた挙動**である。それ以前は
`plgg.qmu.co.jp` が DNS-only(グレークラウド)で、Cloudflare のどの機能も応答に触れていなかった。
同じ注入は**本番 `plgg.qmu.co.jp` にも入っている**(本番では望ましい内容なので、そちらは
現状で問題ない)。

## Policies

- `workaholic:design` / `policies/security-design.md` — 公開面と非公開面の境界は、意図した強度で
  実際に効いていることまで含めて設計とみなす。「書いたつもりの規則が沈黙している」状態を
  放置しない。
- `workaholic:operation` / `policies/ci-cd.md` — ゾーン設定という**コード外の要因**が配信物の
  応答を書き換えている。所有者を明示せずに片側だけ直すと、次の担当者が同じ調査を繰り返す。
- `workaholic:implementation` / `policies/coding-standards.md` — `worker/staging.ts` の
  `ROBOTS_TXT` に付いている「belt and braces」というコメントは、現状では事実と食い違っている。
  コメントが嘘をつく状態を残さない。

## Key Files

- `packages/guide/worker/staging.ts` — `ROBOTS_TXT` 定数と `robots()` ハンドラ。「crawler が
  robots.txt しか読まなくても規則が効く」という前提のコメントが、注入によって崩れている箇所。
- `packages/guide/wrangler.jsonc` — `env.staging` の定義。`run_worker_first: true` により
  `/robots.txt` は確実に Worker に届いている(届いていないのではなく、届いた後に注入されている)。
- `packages/guide/README.md` — staging 面の運用記述。結論をここに書く。
- corporate リポジトリの `infra/terraform/cloudflare-dns/` — ゾーンの DNS は Terraform 管理
  だが、**managed robots.txt はそこに無い**。ゾーン設定の所有者が未定であることが、この件の
  構造的な原因。

## Related History

- [20260818072009-stand-up-the-staging-surface-at-staging-plgg-qmu-co-jp.md](.workaholic/tickets/archive/work-20260818-073433/20260818072009-stand-up-the-staging-surface-at-staging-plgg-qmu-co-jp.md) — staging 面を立てた元チケット。robots.txt とヘッダの二重防御はここで設計された。
- [work-20260818-073433.md](.workaholic/stories/work-20260818-073433.md) — Workers 移行のストーリー。注入の存在は移行後の実測で初めて判明した。
- ミッション `deliver-the-guide-from-cloudflare-workers-with-a-staging-surface` は受入 3/3 を
  満たしており、本チケットは**そのミッションには紐づけない**。移行後に判明した後続の欠陥であり、
  紐づけると完了済みミッションを再オープンして close を塞ぐため。

## Implementation Steps

1. **実態を測る(設計より先)。** 現在の挙動を再現・確定させる。
   - `curl -sS https://staging-plgg.qmu.co.jp/robots.txt` と `https://plgg.qmu.co.jp/robots.txt`
     を保存し、注入ブロックの範囲と Worker 応答の位置関係を記録する。
   - RFC 9309 の同長競合規則を条文で確認し、「Allow が勝つ」が本当にこのファイル構成に
     当てはまるか、主要クローラの実装が実際にどう解釈するかで裏を取る。**推測のまま直さない。**
   - Cloudflare 側でこの注入がどの機能に由来するか(AI Crawl Control / Managed robots.txt など)を
     特定し、設定名と現在値を記録する。
2. **ホスト単位で外せるかを調べる。** その機能が Configuration Rule 等で
   `staging-plgg.qmu.co.jp` にだけ無効化できるかを確認する。本番の AI クローラ遮断は維持したい
   ので、ゾーン全体を切るのは最後の手段。
3. **調査結果で分岐する。**
   - **外せる場合**: staging だけ注入を止め、Worker の robots.txt が単独で配信される状態にする。
     設定の所在(ダッシュボードか API か、Terraform 化できるか)を README に記録する。
   - **外せない場合**: `x-robots-tag` を正と決め、`worker/staging.ts` の `ROBOTS_TXT` 周辺の
     コメントを事実に合わせて書き換える(「belt and braces」が成立していない旨と、なぜ
     robots.txt に頼らないのかを明記)。`ROBOTS_TXT` 自体を残すか消すかもここで決める。
4. **本番側の注入を意図的なものとして記録する。** `plgg.qmu.co.jp` にも同じ注入が入っており、
   内容(AI クローラの Disallow)は望ましい。proxied 化の副作用として**偶然そうなっている**のか、
   **意図して維持するのか**を README に一文で明示する。
5. 結論を `packages/guide/README.md` に反映する。

## Considerations

- **これは plgg リポジトリだけでは閉じない可能性がある。** ゾーン設定が corporate 側の管轄
  だと判明した場合、設定変更そのものは corporate のチケットになる。その場合は本チケットを
  「調査＋コード/ドキュメント側の対応」に閉じ、corporate 側は `/fb <ask> to qmu/corporate` で
  起票すること。
- **`x-robots-tag` があるので急がない。** severity は低い。ただし「コメントが事実と食い違って
  いる」状態は、次に `worker/staging.ts` を読む人(人間でも AI でも)を確実に誤解させるので、
  調査の結論がどちらに転んでもドキュメント修正は必ず行う。
- staging に Cloudflare Access を被せればクローラ問題は根絶できるが、アクセスモデル自体が
  変わるため本チケットの範囲外とする。必要なら別チケット。

## Quality Gate

### Acceptance Criteria

- `staging-plgg.qmu.co.jp/robots.txt` の**現在の完全な本文**が、注入ブロックの範囲を明示した
  形で README に記録されている。
- 「Allow が勝つ」という懸念が、推測ではなく一次情報(RFC 9309 の条文、または実際のクローラの
  解釈)で**肯定または否定**されている。否定された場合はその根拠をもって本件を no-op として
  閉じてよい。
- 注入の由来(Cloudflare の機能名と設定値)と、それがホスト単位で無効化できるか否かが判明している。
- `worker/staging.ts` の `ROBOTS_TXT` 周辺のコメントが、実際に配信される内容と食い違っていない。
- `staging-plgg.qmu.co.jp` が `x-robots-tag: noindex, nofollow, noarchive` を返し続けている
  (この修正で二重防御の**残っている方**を壊していない)。
- 本番 `plgg.qmu.co.jp` に `x-robots-tag` が付いていないこと、および本番の robots.txt の
  扱いが意図的なものとして記録されていること。

### Verification Method

`curl -sSI` と `curl -sS` による両ホストの実測(ヘッダと robots.txt 全文)。コード変更を伴う
場合は `scripts/check-all.sh` がグリーンであること。

Decided: 検証はライブ2ホストへの curl とする — この欠陥は配信経路(Cloudflare のゾーン設定)に
由来し、`dist/` にもリポジトリ内のどのファイルにも現れないため、ユニットテストでは原理的に
捕まえられない(developer may override at /drive)。

### Gate

`scripts/check-all.sh` グリーン(コード変更がある場合)＋上記 curl の実測結果が README に記録
されていること。
