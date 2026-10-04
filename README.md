# YouTube LIVE Stats

YouTube LIVEのチャット、Super Chat、出席ランキング、コメ稼ぎランキングなどを集計するサイトの土台です。

## 現在入っているもの

- LIVE情報の表示エリア
- 過去3ヶ月LIVEエリア
- 常連度ランキング
- Super Chatランキング
- コメ稼ぎランキング
- 皆勤賞表示予定
- 小文字 `w` をコメ稼ぎ対象
- 大文字 `W` をコメ稼ぎ対象外
- スマホ対応

## GitHub Pagesで公開

1. このフォルダの中身をGitHubリポジトリにアップロード
2. Settings → Pages
3. Sourceを `Deploy from a branch`
4. Branchを `main`、Folderを `/ (root)` にする
5. Save

## 次の開発

YouTube Data API / Live Streaming APIとバックエンド・データベースを接続して、実際のLIVEデータを取得・保存します。
