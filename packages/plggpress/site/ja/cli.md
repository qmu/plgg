# CLI リファレンス

`plggpress build` は静的ファイルを書き出し、`plggpress dev` は執筆用サーバーを起動します。次の例は原稿が `docs` にある場合です。

```sh
npx plggpress dev --contentDir docs --port 5173
npx plggpress build --contentDir docs --outDir dist
```

| 項目 | 用途 |
| --- | --- |
| `--config <path>` | 共通。既定は作業ディレクトリの `site.config.ts`。 |
| `--contentDir <path>` | 共通。build の既定は作業ディレクトリ。dev は `docs/` があればそこを、なければ作業ディレクトリを使います。 |
| `--parts <path>` | 共通。部品登録ファイルを指定します。省略時は設定ファイルの隣の `site.parts.ts` があれば読み込みます。 |
| `--outDir <path>` | build の出力先。既定は作業ディレクトリの `dist/`。 |
| `--port <number>` | dev の TCP ポート。既定は `5173`。`0` は空きポートを割り当てます。 |
| `--host <host>` | dev の追加ホスト名を設定値に加えます。待ち受けアドレスの指定には使えません。 |
| `--watch-theme` | dev の監視対象に plggpress のソースを追加します。 |

## 編集内容を確かめる

既存の原稿を保存すると、開いているページに再読み込みが通知されます。設定を変えたり新しいページを追加したりしたときは、サーバーを再起動してください。公開前には `build` で[原稿を検証](/checks/)します。

開発サーバーの環境に `OPENAI_API_KEY` を設定すると、音声パネルから開いている原稿の編集や見出しへの移動を頼めます。ブラウザーが受け取るのは短時間だけ有効な認証情報です。原稿への編集はファイルに保存されます。このパネルは静的な公開ページには含まれません。
