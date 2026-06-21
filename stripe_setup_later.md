# Stripe決済・本番化セットアップ手順（後日作業用）

このドキュメントは、後日Stripeアカウントを作成し、決済機能を本番稼働させるための手順書です。

## 1. Stripeアカウントの準備とAPIキーの取得
1. [Stripe](https://stripe.com/jp) でアカウントを作成し、本人確認（本番環境利用の申請）を完了させます。
2. Stripeダッシュボードの「開発者」 > 「APIキー」を開きます。
3. **シークレットキー**（`sk_live_...`）をコピーしてメモします。

## 2. GAS（Google Apps Script）の設定
LPの裏側で動いているGASに、Stripeキーやその他の環境変数を設定します。

1. GASエディタを開き、左側メニューの「プロジェクトの設定（歯車マーク）」を開きます。
2. 一番下の「スクリプト プロパティ」で「スクリプト プロパティを追加」を押し、以下のキーと値をすべて設定します。

| プロパティ名 | 設定する値 |
| --- | --- |
| `ADMIN_TOKEN` | （設定済）商品登録画面のパスワード |
| `IMAGE_FOLDER_ID` | （設定済）自動生成された画像フォルダのID |
| `STRIPE_SECRET_KEY` | Stripeで取得したシークレットキー（`sk_live_...`） |
| `SUCCESS_URL` | 決済成功後の戻り先URL（例: `https://自分のGitHub名.github.io/.../success.html`） |
| `CANCEL_URL` | 決済キャンセル時の戻り先URL（例: `https://自分のGitHub名.github.io/.../index.html`） |
| `OWNER_EMAIL` | 注文が入ったときに通知を受け取る自分のメールアドレス |
| `GAS_WEBHOOK_TOKEN` | ご自身で決めた推測困難なパスワード（例: `my_secret_token_123`） |

3. 設定後、**必ず再デプロイ**を行います。（「デプロイ」 > 「デプロイを管理」 > 鉛筆マーク > 新バージョンを選択 > デプロイ）

## 3. Cloudflare Workers の設定（Webhookの安全な受け渡し）
StripeからのWebhook（注文完了通知）を安全にGASへ転送するため、Cloudflare Workersを使います。

1. [Cloudflare](https://dash.cloudflare.com/) アカウントを作成します。
2. 左メニューの「Workers & Pages」から「ワーカーの作成」を行います。
3. デフォルトのコードを消し、手元の `cloudflare_worker/stripe_webhook_worker.js` の内容をすべて貼り付けます。
4. 「保存してデプロイ」を押します。
5. 作成したWorkerの「設定」 > 「変数」 > 「環境変数」を開き、以下を追加します。

| 変数名 | 設定する値 | 暗号化 |
| --- | --- | --- |
| `GAS_WEBHOOK_URL` | GASの「ウェブアプリのURL」（`https://script.google.com/macros/s/.../exec`） | しない |
| `GAS_WEBHOOK_TOKEN` | GASで設定した `GAS_WEBHOOK_TOKEN` と同じ値 | しない |
| `STRIPE_WEBHOOK_SECRET` | （次のステップで取得する `whsec_...`） | する（Encrypt） |

## 4. Stripe Webhook の設定
1. Stripeダッシュボードの「開発者」 > 「Webhook」を開き、「エンドポイントを追加」を押します。
2. **エンドポイントURL**に、手順3で作成したCloudflare WorkerのURLを入力します。
3. **リッスンするイベント**として、以下の2つを選択して追加します。
   - `checkout.session.completed`（決済成功）
   - `checkout.session.expired`（決済期限切れ）
4. エンドポイントを追加後、「署名シークレット（`whsec_...`）」が表示されるのでコピーします。
5. Cloudflare Workerの環境変数 `STRIPE_WEBHOOK_SECRET` に貼り付けてデプロイします。

## 5. GASの時間主導型トリガーの設定（予約期限切れの自動解除）
カゴ落ち（決済画面に行ったまま放置）した商品を自動で「available（販売中）」に戻す設定です。

1. GASエディタの左メニューの「トリガー（時計マーク）」を開きます。
2. 「トリガーを追加」を押します。
3. 以下のように設定して保存します。
   - 実行する関数: `releaseExpiredReservations`
   - 実行するデプロイ: `Head`
   - イベントのソース: `時間主導型`
   - 時間ベースのトリガーのタイプ: `分ベースのタイマー`
   - 時間の間隔: `10分おき`

---

## 本番開始前のテストリスト
これですべての連携が完了です。実際の商品を公開する前に、以下のテストを行ってください。

- [ ] LP上で商品が「購入手続きへ」になっているか。
- [ ] ボタンを押すとStripeの決済画面へ移動するか。
- [ ] 決済画面を開いた状態で、LPを別タブで見ると「現在手続き中（reserved）」になっているか。
- [ ] （テストカードを使って）決済を完了すると、SUCCESS_URLに戻ってくるか。
- [ ] 決済後、自分のメールアドレス宛に注文通知メールが届くか。
- [ ] スプレッドシートの `orders` シートに注文情報が正しく記録されているか。
- [ ] `products` シート上で、その商品が `soldout` になっているか。
- [ ] LPでその商品が「SOLD OUT」と表示されているか。
