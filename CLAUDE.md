# CLAUDE.md — SNS大富豪

このリポジトリは、架空のVtuber事務所の箱の中で話題を奪い合う「SNS風の大富豪」。1ファイルの HTML ゲーム。
会話・コメント・UI の文言は**日本語**。コードのコメントも日本語（既存のスタイルに合わせる）。

## まず読むもの

1. `README.md` — 構成と開発コマンド
2. `docs/DESIGN.md` — ゲームの設計と数字（ルール・勢い・登録者・段階・時期・圧）
3. `docs/HANDOFF.md` — いまの状態、決めたこと、既知の問題、やりたいことの候補

## 絶対に守ること

- **架空であること**：実在のSNSのロゴ・名称・著名人の肖像、実在のVtuber事務所名やキャラクターを出さない。配信プラットフォーム固有の用語（スパチャ等）は使わず、汎用の「投げ銭」「同接」「登録者」を使う。ドメインは `tl.local`
- **1ファイル**：成果物は `dist/sns-daifugo.html` 1枚。外部読み込みは Google Fonts だけ。画像はすべてコードで描く（キャンバス・SVG）
- **公開先**：claude.ai のアーティファクト（URL は HANDOFF 参照）に `dist/sns-daifugo.html` をそのまま公開してきた。GitHub Pages で公開するなら `dist/` をそのまま置けばよい
- **保存データの互換**：`localStorage` の `sns-daifugo:dynasty` に月末の状態を保存している。項目を増やすときは `ensureFollowers()`（dynasty.js）で古い保存を補う。古い保存が読めなくならないこと（`test/scenarios/oldsave.cjs` で確認）

## 開発の流れ

```bash
npm run build     # 必ずこれで束ねる（src を直接 dist にコピーしない）
npm test          # Node だけのユニットテスト。変更のたびに回す
npm run serve &   # 画面テストのローカルサーバー（8766）
node test/shot.cjs <scenario> <w> <h>   # title / demo / trend / play / fx / give / seats / season / long / resume
node test/audit.cjs 390x844             # 全画面をひと通り撮る
```

- 画面を変えたら **PC（1280×800）とスマホ縦（390×844）の両方**でスクリーンショットを撮って目で確認する。横長（844×390）と小さめ（360×640、1024×600）も崩れやすい
- `errors: 0` を確認する（ページエラー・console.error を数えている）。テストサーバーが落ちていると `ERR_CONNECTION_REFUSED` になるので立て直す
- `window.__dyn` にテスト用のフック（状態・演出の関数）が生えている。`window.__autoHuman = true` で自分の手番を AI に任せ、`window.__ff = true` で演出を飛ばす
- Google Fonts は `test/_env.cjs` が `node_modules/@fontsource` に差し替える（ネットに出ない）

## コードの約束

- モジュールは `build.py` の順に1つの `<script type="module">` に連結される。前のモジュールの関数・定数はそのまま後ろから使える（import 不要）。新しいモジュールを足したら `build.py` の `parts` に並べる
- `engine.js` と `dynasty.js` は Node からも `require` できるように、末尾で `module.exports` している。画面に依存する処理をここに入れない
- 色はすべて `src/page.html` の `:root` のトークン（明るいモード）と `:root[data-mood="dark"]`（革命中の暗いモード）で持つ。CSS や JS に色を直書きしない（マークの色・ブランド色の定数は例外）
- 文言の「規模」は持ち主の段階（①初配信期〜⑤看板）で変わる。札の文面を足すときは 5 段階ぶん（null で前の段階を引き継ぐ）を `23-posts.js` に書く
- 数字の調整は `dynasty.js` の定数（`FOL`・`FOL_TITLE`・`STAGE_*`・`ERA_DEFS`）と `39-pressure.js` の配列で済むようにしてある
- 効果音は `10-util.js` の `Sound.play(name)` に合成で足す（音声ファイルは使わない）

## 変更したら更新するもの

- `docs/HANDOFF.md` の「バージョン」と「既知の問題」
- 画面内の「遊び方」（`src/page.html` の `#helpScreen`）と凡例（`40-ui.js` の `LEGEND`）。ルールや数字を変えたら必ず合わせる
- ユニットテスト（`test/followers-unit.js` は勢い・登録者・段階・期生・卒業の見込み、`test/rules-unit.js` はルール）
