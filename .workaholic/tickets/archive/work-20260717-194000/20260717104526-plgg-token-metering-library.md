---
created_at: 2026-07-17T10:45:26+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 6h
commit_hash: 404dac1d
category: Added
depends_on: [20260717104525-research-token-counting-article-publication.md]
mission: llm-token-metering
---

# plgg トークンカウント+コスト推定ライブラリの作成

## Overview

先行リサーチチケットの成果（自前カウント方式・較正パラメータ・誤差表・実装方針章）をもとに、**plgg リポにトークンカウント + コスト推定のライブラリ**を実装する。スコープは「カウント + コスト推定」まで: `countTokens(model, text)` 系の自前カウント（BPE / SentencePiece 自前実装 + Claude 較正付き推定器）と、モデル別単価によるコスト推定 API。利用者（プリンシパル）別の集計・保存層は**利用側の責務**とし、本ライブラリの範囲外（設計方針は記事の実装方針章を参照）。

完成ゲートは **PR merge まで**（npm publish は別途判断）。HQ 単一起点規約に従い、実装は plgg デスク `.worktrees/plgg/`（plgg 自身の worktree、リテラル `work-YYYYMMDD-HHMMSS` ブランチ）でのみ行い、一次チェックアウト（`~/projects/plgg`）には触れない。PR 作成まで — merge は開発者の明示承認。

## Policies

The standard engineering policies — synced from the corporate site (qmu.co.jp) into the `workaholic` policy skills — that govern this ticket. The implementing session **MUST** read each linked policy hard copy before writing code and keep every change defensible against that policy's Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — plgg リポの規約配置に従うため（全コード作業に適用）
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript / スタイル規約（全コード作業に適用）
- `workaholic:design` / `policies/vendor-neutrality.md` — 既存トークナイザライブラリ非依存が本ライブラリの存在理由。語彙・マージ規則等の外部データ取り込みには4点依存判断ログを書き、プロバイダ固有部は ACL 越しに分離する
- `workaholic:implementation` / `policies/type-driven-design.md` — トークン数・金額・モデル ID を bare number/string でなく branded type / 値オブジェクトにする
- `workaholic:planning` / `policies/cost-estimation.md` — コスト推定 API は内訳を保ち、較正推定（Claude 等）の不確実性は幅で表現できる形にする
- `workaholic:implementation` / `policies/objective-documentation.md` — README・API ドキュメントは検証可能な記述で書き、精度の主張には誤差表の出典を付ける

## Key Files

- `.worktrees/llm-token-metering/.workaholic/tickets/todo/a-qmu-jp/20260717104525-research-token-counting-article-publication.md` - 先行チケット。方式選定・較正パラメータ・サンプルセット・誤差表の供給元
- `.workaholic/hq-desk-rules.md` - plgg デスク（`.worktrees/plgg/`）の設置手順と境界上書き規律
- `.worktrees/research/docs/research-reports/foundation-models.md` - モデル別単価。コスト推定の単価テーブルの出典（記事の data.json 経由で取り込む）
- `docs/plan.md` - プリンシパルモデル。「集計は利用側の責務」と切り分ける境界の定義元
- `docs/timeline.md` - 道のり表。ミッションルートの現在地更新先

（plgg リポ内の具体的な配置・既存モジュール構成は、デスク設置後に plgg の CLAUDE.md / ディレクトリ規約を読んで確定する）

## Implementation Steps

1. 上記 Policies の各ハードコピーと、先行リサーチ記事の実装方針章・依存判断ログを読む。
2. plgg デスク `.worktrees/plgg/` を設置する（plgg 自身の worktree、リテラル `work-YYYYMMDD-HHMMSS` ブランチ）。plgg の CLAUDE.md・ディレクトリ規約・テストランナーを確認する。
3. ライブラリの API 面を設計する: `countTokens(model, text)`（自前カウント / Claude は較正付き推定で誤差幅を返せる形）、`estimateCost(model, usage)`（入力・出力・キャッシュ別単価の内訳つき）、モデル・単価テーブルの更新経路。トークン数・金額・モデル ID は branded type。
4. コアを実装する: BPE（OpenAI 系語彙）・SentencePiece 系・`tokenizer.json`（OSS モデル）の自前実装と、Claude 較正推定器（記事の較正パラメータを取り込み）。既存トークナイザライブラリ（tiktoken 等）へのランタイム依存を持たない。語彙・マージ規則データの同梱/取得方式は依存判断ログに記録する。
5. エッジケースの API 対応: 出力トークンの事前推定（幅つき）、キャッシュ・ツール使用分の課金換算、画像トークン換算式。記事でカバーした4種を API として表現できる範囲で実装し、範囲外は README に明記する。
6. テストを書く: 記事と同一のサンプルセット（日本語・英語・コード）で API 実測値（記事の `data.json`）に対し誤差 ±5% 以内を検査するテストを含める。API を呼ばずに検査できるよう実測値はフィクスチャとして固定する。
7. README / API ドキュメントを objective-documentation 準拠で書き、精度の主張に記事（公開 URL / dated report）を出典として付ける。
8. plgg のテスト・lint を素の exit code で通し、PR を作成する（merge は開発者承認）。
9. strategy 側の記録: `docs/timeline.md` の現在地更新と当日の日報、`npm run build` green。

## Quality Gate

**Acceptance criteria** — 承認時に成立していなければならない検証可能条件:

- plgg に `countTokens` / `estimateCost` 系 API を持つライブラリが実装され、対象4系統（OpenAI / OSS・ローカル / Gemini / Claude=較正推定）をカバーしている
- ランタイム依存に既存トークナイザライブラリ（tiktoken / @anthropic-ai/tokenizer / sentencepiece バインディング等）が**含まれない**（package.json の dependencies で機械的に確認できる）
- 記事と同一サンプルセットのフィクスチャテストで、自前カウントが API 実測値に対し誤差 ±5% 以内（±5% を満たせない条件は記事と同じ誤差幅の明記があり、テストはその幅を検査する）
- トークン数・金額・モデル ID が branded type / 値オブジェクトで表現されている
- コスト推定が内訳（入力・出力・キャッシュ別）を保持して返る
- 語彙データ等の外部取り込みについて4点依存判断ログが記録されている
- PR が作成され、plgg の CI 相当チェックが green

**Verification method** — それを証明するコマンド・手順:

- plgg デスクで plgg 規約のテスト・lint コマンドが exit code 0（`| tail` 等でマスクしない）。±5% 検査は API 非依存のフィクスチャテストとして再実行可能
- `package.json` の dependencies に既存トークナイザライブラリがないことを目視+grep で確認
- strategy 側は `npm run build` が exit code 0

**Gate** — `/drive` 承認前に green であるべきもの:

- 上記 acceptance criteria 全項目のチェック結果の提示
- plgg デスクのテスト / lint green、strategy の `npm run build` green
- PR 作成まで（自己 merge しない）。merge は開発者の明示承認（PR 番号の指名）— これがミッション達成の完成ゲート

## Considerations

- 先行チケット（リサーチ記事）の較正パラメータ・サンプルセット・`data.json` が本チケットの入力。先行が merge される前に着手しない（depends_on で直列化済み） (`.worktrees/llm-token-metering/.workaholic/tickets/todo/a-qmu-jp/20260717104525-research-token-counting-article-publication.md`)
- Claude は較正付き推定のため、API として点推定でなく誤差幅を返せる型設計にする — 呼び出し側が「厳密カウント」と誤解しない形にする (`workaholic:planning` / `policies/cost-estimation.md`)
- 語彙・マージ規則データ（cl100k_base 等）は数 MB 規模になり得る。同梱 vs 遅延取得の判断はライブラリのサイズ制約と plgg の配布形態に依存 — デスク設置後に plgg 規約を確認して決め、依存判断ログに記録する
- 利用者別集計・保存層はスコープ外（利用側の責務）。API はプリンシパル概念を持ち込まず、usage → コストの純粋関数に保つ (`docs/plan.md`)
- モデル・単価テーブルは時間とともに古びる。更新経路（foundation-models.md / 記事 data.json からの再生成手順）を README に明記する
- npm publish はミッションの範囲外（PR merge が完成ゲート）。publish するかは merge 後に別途判断する（対外的操作のため開発者ゲート）

---

## Outcome (2026-07-17)

Implemented as **`packages/plgg-token-metering/`** — layout per the repo's
vendor-boundary constraint (`src/domain/{model,usecase}`), **no `vendors/`**
because the package does no I/O. It passes the vendor-boundary gate
**unexempted**; its only runtime dependency is `plgg`.

The original ticket lives on the HQ mission desk
(`.worktrees/llm-token-metering/.workaholic/tickets/todo/a-qmu-jp/`); this copy is
the plgg-side archive record for the branch story. Its removal from the mission
desk's todo is the control master's to make.

### Acceptance criteria

- ✅ `countTokens` / `estimateCost` covering all four families (OpenAI, OSS/Qwen,
  Gemini, Claude=calibrated estimator).
- ✅ No tokenizer library in runtime dependencies — `dependencies` is `{ plgg }`,
  and the vendor-boundary gate enforces it mechanically.
- ✅ Fixture tests over the article's own 30-sample manifest, API-free. The
  estimator families reproduce the article's per-sample predictions **exactly**;
  the exact families' composition reproduces its 0.00%. Bands that cannot meet
  ±5% are asserted at their published width rather than relaxed.
- ✅ Token counts, money, and model ids are branded types; `TokenEstimate` is a
  sum type so an estimate cannot be read as an exact count.
- ✅ `estimateCost` returns the input/output/cache breakdown.
- ✅ Four-point dependency judgment in `packages/plgg-token-metering/DEPENDENCY-LOG.md`
  (two decisions: no tokenizer library; vocabulary as caller-supplied data).
- ⏸️ PR creation is the control master's step (`/report`), per the driving brief.

### The accuracy result, carried through honestly

±5% is **met for two of four families and missed for two** — OpenAI 0.00%, Qwen
0.00%, Claude 8.54%/16.24%, Gemini 6.60%/15.73%. This is stated in the README's
first section, in the registry data module, in `countTokens`'s doc comment, and
in `AccuracyEvidence`, which every count carries so an accuracy claim cannot
travel without its source. `accuracy.spec.ts` fails if a future change claims the
target is met where it is not.

### Deliberate omissions (the article supplies no measurement)

- **Cache rates: none, for every model.** The foundation-models catalog publishes
  input and output rates only. `estimateCost` returns `MissingPriceError` for a
  non-zero cache bucket rather than substituting the input rate; the cache
  machinery is wired and tested against caller-supplied rates.
- **Qwen output rate: none.** That model is absent from the catalog entirely; its
  input rate ($0.66/MTok) comes from the run's own family card.
- **Google + OpenAI image conversions: not implemented.** Google's documented flat
  258/image contradicts the article's own probe of the same PNG (1089 — a 4.2×
  disagreement the article records without resolving), and OpenAI's
  base-plus-tiles constants are not recorded. Anthropic's `w×h/750` IS
  implemented: the probe (124) equals formula (120) + fitted overhead (4).
- **Tool-definition overhead: not a constant.** The 483-token probe is one reading
  of one unspecified tool definition; tool definitions bill as input text.

### Notes for the reviewer

- Only the four measured models get cards. `cardFor(modelId("claude-opus-4-8"))`
  returns `UnknownModelError` on purpose — the article's scope states a sibling's
  calibration must be re-validated before reuse.
- The text class is a required input, not inferred: classification was not part of
  the measured instrument, so guessing it would fold unmeasured error into a
  number that carries a measured band.
- `tokenBounds` inverts the band by DIVISION (`actual = predicted / (1+e/100)`),
  not by multiplying `predicted × (1 ± band)` — the intuitive version skews both
  endpoints the wrong way.
- Verified out of band against the real 3.6 MB `o200k_base`: the shipped code
  reproduces all 30 recorded content counts and all 30 API totals exactly. The
  vocabulary is not committed (see DEPENDENCY-LOG.md), so that check is not in the
  suite.
- The transcription guard was proven to fail: perturbing a fitted overhead from 4
  to 5 fails 5 tests.
