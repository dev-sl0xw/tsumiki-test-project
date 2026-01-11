# serverless-ec-site データフロー図

**作成日**: 2026-01-11
**関連アーキテクチャ**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/serverless-ec-site/requirements.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: タスクノート・ユーザヒアリングを参考にした確実なフロー
- 🟡 **黄信号**: タスクノート・ユーザヒアリングから妥当な推測によるフロー
- 🔴 **赤信号**: タスクノート・ユーザヒアリングにない推測によるフロー

---

## システム全体のデータフロー 🔵

**信頼性**: 🔵 *アーキテクチャ設計より*

```mermaid
flowchart TD
    A[ユーザー] --> B[CloudFront]
    B --> C{パス判定}
    C -->|静的リソース| D[S3 - React SPA]
    C -->|/api/*| E[API Gateway]
    E --> F[Cognito Authorizer]
    F --> G[Lambda]
    G --> H[(DynamoDB)]
    G --> I[S3 - 商品画像]
    G --> J[SES - メール]
    G --> K[Stripe - 決済]

    D --> A
    G --> E
    E --> B
    B --> A
```

## 主要機能のデータフロー

### 機能1: ユーザー認証（会員登録） 🔵

**信頼性**: 🔵 *ユーザヒアリング（メール/パスワード認証）より*

**関連要件**: 認証機能

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant COG as Cognito
    participant L as Lambda
    participant DB as DynamoDB
    participant SES as Amazon SES

    U->>F: 会員登録フォーム入力
    F->>CF: POST /api/auth/signup
    CF->>API: リクエスト転送
    API->>COG: SignUp API
    COG->>COG: ユーザー作成
    COG->>SES: 確認メール送信
    SES-->>U: 確認メール受信
    COG-->>API: SignUp結果
    API-->>CF: レスポンス
    CF-->>F: 結果返却
    F-->>U: 確認メール送信画面表示

    U->>F: 確認コード入力
    F->>CF: POST /api/auth/confirm
    CF->>API: リクエスト転送
    API->>COG: ConfirmSignUp API
    COG->>COG: ユーザー確認
    COG-->>API: 確認結果
    API->>L: ユーザープロファイル作成
    L->>DB: PutItem (Users)
    DB-->>L: 結果
    L-->>API: 結果
    API-->>CF: レスポンス
    CF-->>F: 結果返却
    F-->>U: 登録完了画面表示
```

**詳細ステップ**:
1. ユーザーがメールアドレス・パスワードを入力
2. Cognitoでユーザー作成、確認メール送信
3. ユーザーが確認コード入力で認証完了
4. DynamoDBにユーザープロファイル作成

### 機能2: ユーザー認証（ログイン） 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

**関連要件**: 認証機能

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant COG as Cognito

    U->>F: ログインフォーム入力
    F->>CF: POST /api/auth/login
    CF->>API: リクエスト転送
    API->>COG: InitiateAuth API
    COG->>COG: 認証処理
    COG-->>API: JWT トークン
    API-->>CF: トークン返却
    CF-->>F: トークン返却
    F->>F: トークン保存 (localStorage)
    F-->>U: ホーム画面表示
```

### 機能3: ソーシャルログイン（Google） 🔵

**信頼性**: 🔵 *ユーザヒアリング（ソーシャルログイン）より*

**関連要件**: 認証機能

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant COG as Cognito Hosted UI
    participant G as Google
    participant L as Lambda
    participant DB as DynamoDB

    U->>F: Googleログインボタン
    F->>COG: OAuth開始
    COG->>G: 認証リクエスト
    G->>U: Google認証画面
    U->>G: Google認証
    G-->>COG: 認証コード
    COG->>COG: トークン発行
    COG->>L: PostConfirmation Trigger
    L->>DB: ユーザープロファイル作成/更新
    DB-->>L: 結果
    COG-->>F: JWT トークン
    F->>F: トークン保存
    F-->>U: ホーム画面表示
```

### 機能4: 商品一覧取得 🔵

**信頼性**: 🔵 *ユーザヒアリング（商品カタログ）より*

**関連要件**: 商品カタログ

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant L as Lambda
    participant DB as DynamoDB
    participant S3 as S3 (画像)

    U->>F: 商品一覧ページアクセス
    F->>CF: GET /api/products?category=xxx&page=1
    CF->>API: リクエスト転送
    API->>L: ハンドラー実行
    L->>DB: Query (GSI: category-index)
    DB-->>L: 商品データ
    L->>L: 画像URL生成 (S3 署名付きURL)
    L-->>API: 商品一覧レスポンス
    API-->>CF: レスポンス
    CF-->>F: 商品データ
    F->>CF: 商品画像取得
    CF->>S3: 画像リクエスト
    S3-->>CF: 画像データ
    CF-->>F: 画像データ
    F-->>U: 商品一覧表示
```

### 機能5: 商品検索 🔵

**信頼性**: 🔵 *ユーザヒアリング（商品カタログ）より*

**関連要件**: 商品カタログ

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant L as Lambda
    participant DB as DynamoDB

    U->>F: 検索キーワード入力
    F->>CF: GET /api/products/search?q=xxx
    CF->>API: リクエスト転送
    API->>L: ハンドラー実行
    L->>DB: Scan with FilterExpression
    DB-->>L: 検索結果
    L-->>API: 検索結果レスポンス
    API-->>CF: レスポンス
    CF-->>F: 検索結果
    F-->>U: 検索結果表示
```

### 機能6: カートに追加 🔵

**信頼性**: 🔵 *ユーザヒアリング（カート・注文）より*

**関連要件**: ショッピングカート

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant COG as Cognito
    participant L as Lambda
    participant DB as DynamoDB

    U->>F: カートに追加ボタン
    F->>CF: POST /api/cart/items
    Note over F,CF: Authorization: Bearer {token}
    CF->>API: リクエスト転送
    API->>COG: トークン検証
    COG-->>API: ユーザー情報
    API->>L: ハンドラー実行
    L->>DB: GetItem (Products)
    DB-->>L: 商品情報
    L->>L: 在庫確認・価格検証
    L->>DB: UpdateItem (Carts)
    DB-->>L: 更新結果
    L-->>API: カート更新レスポンス
    API-->>CF: レスポンス
    CF-->>F: 更新後カート
    F-->>U: カート更新表示
```

### 機能7: ゲストカート 🔵

**信頼性**: 🔵 *ユーザヒアリング（ゲスト購入）より*

**関連要件**: ショッピングカート

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant L as Lambda
    participant DB as DynamoDB

    U->>F: カートに追加（未ログイン）
    F->>F: ゲストID生成 (UUID)
    F->>CF: POST /api/cart/guest/items
    Note over F,CF: X-Guest-ID: {guestId}
    CF->>API: リクエスト転送
    API->>L: ハンドラー実行
    L->>DB: UpdateItem (GuestCarts)
    Note over DB: TTL: 7日
    DB-->>L: 更新結果
    L-->>API: カート更新レスポンス
    API-->>CF: レスポンス
    CF-->>F: 更新後カート
    F-->>U: カート更新表示
```

### 機能8: 注文作成 🔵

**信頼性**: 🔵 *ユーザヒアリング（カート・注文）より*

**関連要件**: 注文処理

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant L as Lambda
    participant DB as DynamoDB
    participant Stripe as Stripe

    U->>F: 注文確定ボタン
    F->>CF: POST /api/orders
    CF->>API: リクエスト転送
    API->>L: ハンドラー実行
    L->>DB: GetItem (Carts)
    DB-->>L: カート情報
    L->>DB: BatchGetItem (Products)
    DB-->>L: 商品情報
    L->>L: 在庫・価格検証
    L->>Stripe: 決済意図作成
    Stripe-->>L: PaymentIntent
    L->>DB: PutItem (Orders) - status: pending
    DB-->>L: 結果
    L-->>API: PaymentIntent client_secret
    API-->>CF: レスポンス
    CF-->>F: 決済情報
    F->>Stripe: カード情報入力・決済確定
    Stripe-->>F: 決済結果
    F->>CF: PUT /api/orders/{id}/confirm
    CF->>API: リクエスト転送
    API->>L: ハンドラー実行
    L->>Stripe: 決済状態確認
    Stripe-->>L: 決済成功
    L->>DB: UpdateItem (Orders) - status: confirmed
    L->>DB: DeleteItem (Carts)
    L->>DB: UpdateItem (Products) - 在庫減算
    DB-->>L: 結果
    L-->>API: 注文完了レスポンス
    API-->>CF: レスポンス
    CF-->>F: 注文完了
    F-->>U: 注文完了画面表示
```

### 機能9: 代引き/銀行振込注文 🔵

**信頼性**: 🔵 *ユーザヒアリング（決済方法）より*

**関連要件**: 決済連携

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as React SPA
    participant CF as CloudFront
    participant API as API Gateway
    participant L as Lambda
    participant DB as DynamoDB
    participant SES as Amazon SES

    U->>F: 代引き/銀行振込選択・注文確定
    F->>CF: POST /api/orders
    Note over F,CF: paymentMethod: "cod" | "bank_transfer"
    CF->>API: リクエスト転送
    API->>L: ハンドラー実行
    L->>DB: カート・商品情報取得
    DB-->>L: データ
    L->>L: 在庫・価格検証
    L->>DB: PutItem (Orders) - status: pending_payment
    DB-->>L: 結果
    L->>SES: 注文確認メール送信
    SES-->>U: 注文確認メール
    L-->>API: 注文完了レスポンス
    API-->>CF: レスポンス
    CF-->>F: 注文完了
    F-->>U: 注文完了画面（振込先情報等）
```

### 機能10: メール通知 🔵

**信頼性**: 🔵 *ユーザヒアリング（メール通知）より*

**関連要件**: メール通知

```mermaid
sequenceDiagram
    participant L as Lambda
    participant SES as Amazon SES
    participant U as ユーザー

    Note over L: イベント: 注文確定
    L->>L: メールテンプレート選択 (言語別)
    L->>SES: SendTemplatedEmail
    Note over SES: テンプレート: order_confirmation_{lang}
    SES->>SES: メール生成
    SES-->>U: 注文確認メール

    Note over L: イベント: 発送完了
    L->>SES: SendTemplatedEmail
    Note over SES: テンプレート: shipping_notification_{lang}
    SES-->>U: 発送通知メール
```

## データ処理パターン

### 同期処理 🔵

**信頼性**: 🔵 *アーキテクチャ設計より*

| 機能 | 理由 |
|------|------|
| 商品一覧・詳細取得 | 即時レスポンス必要 |
| カート操作 | リアルタイム反映必要 |
| 注文作成 | 決済連携必要 |
| ログイン・認証 | 即時レスポンス必要 |

### 非同期処理 🟡

**信頼性**: 🟡 *一般的なECサイトパターンから妥当な推測*

| 機能 | 理由 |
|------|------|
| メール送信 | 即時性不要、信頼性重視 |
| 在庫更新通知 | バックグラウンド処理 |
| 画像リサイズ | 重い処理 |

### バッチ処理 🟡

**信頼性**: 🟡 *一般的なECサイトパターンから妥当な推測*

| 機能 | 理由 |
|------|------|
| 売上レポート | 日次集計 |
| ゲストカート削除 | TTL + EventBridge |

## エラーハンドリングフロー 🟡

**信頼性**: 🟡 *一般的なパターンから妥当な推測*

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別}
    B -->|バリデーションエラー| C[400 Bad Request]
    B -->|認証エラー| D[401 Unauthorized]
    B -->|権限エラー| E[403 Forbidden]
    B -->|リソース未存在| F[404 Not Found]
    B -->|在庫不足| G[409 Conflict]
    B -->|決済エラー| H[402 Payment Required]
    B -->|サーバーエラー| I[500 Internal Server Error]

    C --> J[エラーメッセージ返却]
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> K[CloudWatch Logs記録]
    K --> J
    J --> L[フロントエンドでエラー表示]
```

## 状態管理フロー

### フロントエンド状態管理 🟡

**信頼性**: 🟡 *Zustand選択から妥当な推測*

```mermaid
stateDiagram-v2
    [*] --> 未認証
    未認証 --> ローディング: ログイン試行
    ローディング --> 認証済み: 成功
    ローディング --> 未認証: 失敗
    認証済み --> 未認証: ログアウト

    state カート {
        [*] --> 空
        空 --> 商品あり: 商品追加
        商品あり --> 空: 全削除
        商品あり --> 商品あり: 数量変更
    }

    state 注文 {
        [*] --> カート確認
        カート確認 --> 配送情報入力
        配送情報入力 --> 決済
        決済 --> 完了: 成功
        決済 --> エラー: 失敗
        エラー --> 決済: リトライ
    }
```

### 注文状態管理 🔵

**信頼性**: 🔵 *ユーザヒアリング（決済方法・注文）より*

```mermaid
stateDiagram-v2
    [*] --> pending: 注文作成
    pending --> pending_payment: 銀行振込/代引き選択
    pending --> confirmed: 決済成功
    pending_payment --> confirmed: 入金確認
    pending --> cancelled: 決済失敗/キャンセル
    pending_payment --> cancelled: 期限切れ
    confirmed --> processing: 発送準備開始
    processing --> shipped: 発送完了
    shipped --> delivered: 配達完了
    delivered --> [*]
    cancelled --> [*]
```

## データ整合性の保証 🟡

**信頼性**: 🟡 *DynamoDBの特性から妥当な推測*

| 項目 | 実現方法 |
|------|----------|
| トランザクション | DynamoDB TransactWriteItems |
| 在庫管理 | 条件付き更新（ConditionExpression） |
| 楽観的ロック | バージョン属性による制御 |
| 冪等性 | リクエストIDによる重複排除 |

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **型定義**: [interfaces.ts](interfaces.ts)
- **DBスキーマ**: [database-schema.md](database-schema.md)
- **API仕様**: [api-endpoints.md](api-endpoints.md)

## 信頼性レベルサマリー

- 🔵 青信号: 14件 (74%)
- 🟡 黄信号: 5件 (26%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: 高品質
