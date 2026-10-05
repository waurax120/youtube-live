# LIVE STATS

登録したYouTubeチャンネルだけを対象にLIVE情報を確認するGitHub Pages用サイトです。

## このZIPの内容
- index.html
- style.css
- script.js
- README.md

## 現在の機能
- YouTubeチャンネルURL / @ハンドル / チャンネルIDの登録
- YouTube APIからチャンネル名・登録者数などを取得
- 現在LIVE中かどうかの確認
- LIVEタイトル、サムネイル、同時視聴者数、コメント数、高評価数の表示
- チャンネル削除
- ランキングUI

## GitHubへの入れ方
4ファイルをGitHubリポジトリ `youtube-live` のルートにアップロードして置き換えてください。

## Apps Script
`script.js` には現在使用しているApps Script WebアプリURLを設定済みです。

Apps ScriptのScript Properties:
YOUTUBE_API_KEY = YouTube Data API v3のAPIキー

Webアプリ:
実行ユーザー = 自分
アクセスできるユーザー = 全員

## 次に追加する機能
- LIVEチャット
- Super Chat
- 過去LIVE保存
- 3か月出席ランキング
- 皆勤賞
- 常連度ランキング
- コメ稼ぎランキング

過去データを正確に集計するには、LIVE中にデータを取得して保存するバックエンド・データベースが必要です。
